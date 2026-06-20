// src/services/community.service.ts
import {
  formatAnonymousDisplayName,
  formatAnonymousUsername,
  pickRandomAnonymousIdentity,
} from "@/lib/anonymous-animals";
import {
  CreateCommunityDTO,
  UpdateCommunityDTO,
} from "@/lib/dtos/community.dto";
import { ForbiddenError } from "@/lib/errors/http-errors";
import { prisma } from "@/lib/prisma";
import { getTodayUTC } from "@/lib/utils/mood-ring";

const toI18nPayload = (key: string, params: Record<string, string>) =>
  JSON.stringify({ key, params });

export async function getCommunitiesOverview(userId: string) {
  // 1. Load user tags used for recommendation matching
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { conditions: true, medications: true, role: true },
  });

  // 2. Load active bans for this user and index by community
  const now = new Date();
  const activeBans =
    (await prisma.communityBan.findMany({
      where: {
        userId,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
    })) ?? [];

  // Create a map to easily attach ban details to the communities
  const banMap = new Map(activeBans.map((b) => [b.communityId, b]));

  // 3. Fetch all active communities (both public and private)
  const communities = await prisma.community.findMany({
    where: { isActive: true },
    include: {
      _count: { select: { members: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const communitiesWithBanState = communities.map((c) => {
    const ban = banMap.get(c.id);
    return {
      ...c,
      isBanned: !!ban,
      banDetails: ban
        ? {
            reason: ban.reason,
            expiresAt: ban.expiresAt?.toISOString() || null,
          }
        : null,
    };
  });

  const userTags = [
    ...(user?.conditions || []),
    ...(user?.medications || []),
  ].map((t) => t.toLowerCase());

  const recommended: typeof communitiesWithBanState = [];
  const others: typeof communitiesWithBanState = [];

  // 4. Split communities into recommended vs others
  for (const community of communitiesWithBanState) {
    const nameLower = community.name.toLowerCase();
    const descLower = community.description?.toLowerCase() || "";

    const isMatch = userTags.some(
      (tag) => nameLower.includes(tag) || descLower.includes(tag),
    );

    if (isMatch && userTags.length > 0) {
      recommended.push(community);
    } else {
      others.push(community);
    }
  }

  // 5. Fetch personally hidden communities
  const personallyHidden = await prisma.hiddenCommunity.findMany({
    where: { userId },
    select: { communityId: true },
  });
  const hiddenIds = new Set(personallyHidden.map((h) => h.communityId));

  // Fetch blocked communities
  const personallyBlocked = await prisma.blockedCommunity.findMany({
    where: { userId },
    select: { communityId: true },
  });
  const blockedIds = new Set(personallyBlocked.map((b) => b.communityId));

  // 6. Fetch hidden communities and include ban metadata
  const hiddenCommunities = await prisma.community
    .findMany({
      where: {
        id: { in: [...hiddenIds] },
        isActive: true,
      },
      include: {
        _count: { select: { members: true } },
      },
    })
    .then((res) =>
      res.map((c) => {
        const ban = banMap.get(c.id);
        return {
          ...c,
          isBanned: !!ban,
          banDetails: ban
            ? {
                reason: ban.reason,
                expiresAt: ban.expiresAt?.toISOString() || null,
              }
            : null,
        };
      }),
    );

  // 7. Fetch active joined communities (not hidden/blocked)
  const joinedCommunities = await prisma.community
    .findMany({
      where: {
        isActive: true,
        id: { notIn: [...hiddenIds, ...blockedIds] },
        members: { some: { userId, status: "ACCEPTED" } },
      },
      include: {
        _count: { select: { members: true } },
      },
    })
    .then((res) =>
      res.map((c) => ({ ...c, isBanned: false, banDetails: null })),
    );

  // 9. Fetch Suspended Communities (Visible to members so they know it's suspended)
  const userRole = user?.role;
  const isGlobalAdmin = userRole === "ADMIN";
  const suspendedCommunities = await prisma.community
    .findMany({
      where: {
        isActive: false,
        ...(isGlobalAdmin
          ? {}
          : {
              members: {
                some: {
                  userId,
                  status: "ACCEPTED",
                },
              },
            }),
      },
      include: {
        _count: { select: { members: true } },
        members: { where: { userId, status: "ACCEPTED" } },
      },
    })
    .then((res) =>
      res.map((c) => {
        const memberRole = c.members?.[0]?.role;
        const canAccessSuspended =
          isGlobalAdmin ||
          ["OWNER", "ADMIN", "MODERATOR"].includes(memberRole || "");

        return {
          ...c,
          isBanned: false,
          banDetails: null,
          canAccessSuspended,
          isJoined: (c.members?.length ?? 0) > 0,
        };
      }),
    );

  // 8. Fetch blocked communities data
  const blockedCommunities = await prisma.community
    .findMany({
      where: {
        id: { in: [...blockedIds] },
      },
      include: {
        _count: { select: { members: true } },
      },
    })
    .then((res) =>
      res.map((c) => ({
        ...c,
        isBanned: false,
        isBlockedByMe: true,
        banDetails: null,
      })),
    );

  // 10. Return final grouped lists excluding hidden AND blocked IDs where relevant
  const excludeIds = new Set([...hiddenIds, ...blockedIds]);

  return {
    recommended: recommended.filter((c) => !excludeIds.has(c.id) && c.isActive),
    all: (userTags.length > 0 ? others : communitiesWithBanState).filter(
      (c) => !excludeIds.has(c.id) && c.isActive,
    ),
    joined: joinedCommunities,
    hidden: hiddenCommunities,
    blocked: blockedCommunities,
    suspended: suspendedCommunities,
  };
}

export async function createCommunity(
  userId: string,
  data: CreateCommunityDTO,
) {
  const creator = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });

  if (!creator) {
    throw new Error("Authenticated user not found");
  }

  // Enforce unique name constraint manually for better error handling
  const existing = await prisma.community.findUnique({
    where: { name: data.name },
  });

  if (existing) {
    throw new Error("Community name is already taken");
  }

  const { animalName, animalEmoji, bgColor, suffix } =
    pickRandomAnonymousIdentity();

  // Create community and automatically assign the creator as OWNER + generate anonymous identity
  return prisma.community.create({
    data: {
      name: data.name,
      description: data.description,
      category: data.category,
      isPrivate: data.isPrivate,
      members: {
        create: {
          userId,
          role: "OWNER",
        },
      },
      anonymousIdentities: {
        create: {
          userId,
          displayName: formatAnonymousDisplayName(animalName, suffix),
          username: formatAnonymousUsername(animalName, suffix),
          animalEmoji,
          bgColor,
        },
      },
    },
  });
}

export async function getCommunityByName(
  name: string,
  userId: string,
  userRole: string = "USER",
) {
  // 1. Load community with membership snapshot for requesting user
  const decodedName = decodeURIComponent(name);

  const community = await prisma.community.findUnique({
    where: { name: decodedName },
    include: {
      _count: {
        select: { members: { where: { status: "ACCEPTED" } }, posts: true },
      },
      members: { where: { userId } },
    },
  });

  if (!community) throw new Error("Community not found");

  // 2. Resolve global admin capability using passed role
  // Global Admin check
  const isGlobalAdmin = userRole === "ADMIN";

  // 3. Resolve active ban state for this user in this community
  // Check if the user is actively banned from this community
  const now = new Date();
  const activeBan = await prisma.communityBan.findUnique({
    where: { communityId_userId: { communityId: community.id, userId } },
  });
  const isBanned = !!(
    activeBan &&
    (!activeBan.expiresAt || activeBan.expiresAt > now)
  );

  // Check if user has blocked this community
  const personalBlock = await prisma.blockedCommunity.findUnique({
    where: { userId_communityId: { userId, communityId: community.id } },
  });
  const isBlockedByMe = !!personalBlock;

  // 4. Return scrubbed community payload for banned OR blocked non-admin viewers
  // Scrub sensitive community data for banned OR blocked users (except global admins viewing a blocked comm)
  if ((isBanned || isBlockedByMe) && !isGlobalAdmin) {
    return {
      id: community.id,
      name: community.name,
      description: "...",
      category: community.category,
      image: null,
      headerImage: null,
      isPrivate: community.isPrivate,
      isActive: community.isActive,
      isPersonallyHidden: false,
      isBlockedByMe,
      isBanned,
      createdAt: community.createdAt,
      membership: { status: isBanned ? "BANNED" : "NONE", role: null },
      stats: { members: 0, posts: 0, online: 0 },
      leaders: [],
    };
  }

  // 5. Resolve personal hide + viewer membership
  const personalHide = await prisma.hiddenCommunity.findUnique({
    where: { userId_communityId: { userId, communityId: community.id } },
  });

  const userMembership = community.members[0];

  // 6. Enforce inactive community visibility restrictions
  // If community is inactive (hidden), only admins/owners/mods/system admins can view it.
  if (
    !community.isActive &&
    userMembership?.role !== "ADMIN" &&
    userMembership?.role !== "OWNER" &&
    userMembership?.role !== "MODERATOR" &&
    !isGlobalAdmin
  ) {
    throw new Error("Community is currently inactive or hidden");
  }

  // 7. Load leaders for sidebar/moderation display
  // Fetch Community Admins, Moderators, and Owners
  const leaders = await prisma.communityMember.findMany({
    where: {
      communityId: community.id,
      role: { in: ["OWNER", "ADMIN", "MODERATOR"] },
      status: "ACCEPTED",
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          username: true,
          image: true,
          avatarEmoji: true,
          avatarBgColor: true,
          emailVerified: true,
          dailyStatuses: {
            where: { date: getTodayUTC() },
            take: 1,
            select: { value: true },
          },
        },
      },
    },
    // Hacky sort: OWNER, ADMIN, MODERATOR via descending alphabetical sorting (O > A, but M is between. We'll sort in UI if needed, Prisma doesn't support custom enum sorting easily)
  });

  // 8. Return full community payload for allowed viewers
  return {
    id: community.id,
    name: community.name,
    description: community.description,
    category: community.category,
    image: community.image,
    headerImage: community.headerImage,
    avatarEmoji: community.avatarEmoji,
    avatarBgColor: community.avatarBgColor,
    headerEmoji: community.headerEmoji,
    headerBgColor: community.headerBgColor,
    isPrivate: community.isPrivate,
    isActive: community.isActive,
    rules: community.rules,
    banReason: community.banReason,
    bannedUntil: community.bannedUntil?.toISOString() || null,
    isPersonallyHidden: !!personalHide,
    isBlockedByMe,
    isBanned: false,
    createdAt: community.createdAt,
    membership: {
      status: userMembership ? userMembership.status : "NONE",
      role: userMembership ? userMembership.role : null,
    },
    stats: {
      members: community._count.members,
      posts: community._count.posts,
      online: Math.floor(community._count.members * 0.15) || 1,
    },
    leaders: leaders.map((l) => ({
      role: l.role,
      user: l.user,
    })),
  };
}

export async function toggleCommunityMembership(name: string, userId: string) {
  const decodedName = decodeURIComponent(name);
  const community = await prisma.community.findUnique({
    where: { name: decodedName },
  });

  if (!community) throw new Error("Community not found");

  const existingMember = await prisma.communityMember.findUnique({
    where: { userId_communityId: { userId, communityId: community.id } },
  });

  if (existingMember) {
    // If the user is the OWNER, check if they are the last member
    if (existingMember.role === "OWNER") {
      const memberCount = await prisma.communityMember.count({
        where: { communityId: community.id },
      });

      if (memberCount === 1) {
        // Last member leaving, delete the community
        await prisma.community.delete({ where: { id: community.id } });
        return { status: "NONE" };
      } else {
        throw new Error(
          "You must transfer ownership to another member before leaving the community.",
        );
      }
    }

    // Leave community or cancel request
    await prisma.communityMember.delete({
      where: { userId_communityId: { userId, communityId: community.id } },
    });
    return { status: "NONE" };
  } else {
    // Join community
    const newStatus = community.isPrivate ? "PENDING" : "ACCEPTED";
    const { animalName, animalEmoji, bgColor, suffix } =
      pickRandomAnonymousIdentity();

    await prisma.$transaction([
      prisma.communityMember.create({
        data: {
          userId,
          communityId: community.id,
          status: newStatus,
          role: "USER",
        },
      }),
      prisma.communityAnonymousIdentity.upsert({
        where: { userId_communityId: { userId, communityId: community.id } },
        create: {
          userId,
          communityId: community.id,
          displayName: formatAnonymousDisplayName(animalName, suffix),
          username: formatAnonymousUsername(animalName, suffix),
          animalEmoji,
          bgColor,
        },
        update: {},
      }),
    ]);

    // Send notification to leaders if the request is pending
    if (newStatus === "PENDING") {
      const globalUser = await prisma.user.findUnique({
        where: { id: userId },
      });
      const leaders = await prisma.communityMember.findMany({
        where: {
          communityId: community.id,
          role: { in: ["OWNER", "ADMIN", "MODERATOR"] },
        },
      });
      if (leaders.length > 0) {
        await prisma.notification.createMany({
          data: leaders.map((l) => ({
            userId: l.userId,
            type: "SYSTEM",
            title: toI18nPayload("communityPage.join_request_title", {
              community: community.name,
            }),
            message: toI18nPayload("communityPage.join_request_msg", {
              user: globalUser?.username || "Someone",
              community: community.name,
            }),
          })),
        });
      }
    }

    return { status: newStatus };
  }
}

export async function updateCommunity(
  name: string,
  userId: string,
  data: UpdateCommunityDTO,
) {
  const decodedName = decodeURIComponent(name);
  const community = await prisma.community.findUnique({
    where: { name: decodedName },
    include: { members: { where: { userId } } },
  });

  if (!community) throw new Error("Community not found");

  const globalUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  const userMembership = community.members[0];
  if (
    userMembership?.role !== "ADMIN" &&
    userMembership?.role !== "OWNER" &&
    globalUser?.role !== "ADMIN"
  ) {
    throw new Error(
      "Unauthorized: Only admins or owners can edit the community",
    );
  }

  return prisma.community.update({
    where: { id: community.id },
    data,
  });
}

export async function deleteCommunity(name: string, userId: string) {
  const decodedName = decodeURIComponent(name);
  const community = await prisma.community.findUnique({
    where: { name: decodedName },
    include: { members: { where: { userId } } },
  });

  if (!community) throw new Error("Community not found");

  const globalUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  const userMembership = community.members[0];
  if (
    userMembership?.role !== "ADMIN" &&
    userMembership?.role !== "OWNER" &&
    globalUser?.role !== "ADMIN"
  ) {
    throw new Error(
      "Unauthorized: Only admins or owners can delete the community",
    );
  }

  // Cascades automatically to members and posts due to schema setup
  await prisma.community.delete({
    where: { id: community.id },
  });

  return { success: true };
}

export async function getCommunityMembers(name: string, requesterId: string) {
  // 1. Load community target
  const decodedName = decodeURIComponent(name);
  const community = await prisma.community.findUnique({
    where: { name: decodedName },
  });

  if (!community) throw new Error("Community not found");

  // 2. Resolve requester access level (global admin or privileged member)
  const globalUser = await prisma.user.findUnique({
    where: { id: requesterId },
    select: { role: true },
  });

  const requesterMember = await prisma.communityMember.findUnique({
    where: {
      userId_communityId: { userId: requesterId, communityId: community.id },
    },
  });

  const isGlobalAdmin = globalUser?.role === "ADMIN";
  const hasAccess =
    isGlobalAdmin ||
    (requesterMember &&
      ["OWNER", "ADMIN", "MODERATOR"].includes(requesterMember.role));

  if (!hasAccess) {
    throw new Error("Unauthorized: You do not have permission to view members");
  }

  // 3. Fetch current members, pending members, active mutes, and active bans in parallel
  const now = new Date();

  // Standardized user select to include the specific community identity
  const userSelect = {
    select: {
      id: true,
      name: true,
      username: true,
      image: true,
      avatarEmoji: true,
      avatarBgColor: true,
      dailyStatuses: {
        where: { date: getTodayUTC() },
        take: 1,
        select: { value: true },
      },
      anonymousIdentities: {
        where: { communityId: community.id },
        select: {
          displayName: true,
          username: true,
          animalEmoji: true,
          bgColor: true,
        },
      },
    },
  };

  // Fetch active members, pending members, mutes, and bans concurrently
  const [members, pendingMembers, activeMutes, activeBans] = await Promise.all([
    prisma.communityMember.findMany({
      where: { communityId: community.id, status: "ACCEPTED" },
      include: { user: userSelect },
      orderBy: { joinedAt: "asc" },
    }),
    prisma.communityMember.findMany({
      where: { communityId: community.id, status: "PENDING" },
      include: { user: userSelect },
      orderBy: { joinedAt: "asc" },
    }),
    prisma.communityMute.findMany({
      where: {
        communityId: community.id,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      include: { user: userSelect },
    }),
    prisma.communityBan.findMany({
      where: {
        communityId: community.id,
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      include: { user: userSelect },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const mutedUserIds = new Set((activeMutes ?? []).map((m) => m.userId));

  // Extract the nested identity array into the expected flat format for the frontend
  const mapUserIdentity = <
    T extends {
      anonymousIdentities?: Array<{
        displayName: string;
        username: string;
        animalEmoji: string;
        bgColor: string;
      }>;
    },
  >(
    u: T,
  ) => {
    const anon = u.anonymousIdentities?.[0];
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { anonymousIdentities: _, ...cleanUser } = u;
    return { user: cleanUser, anonymousIdentity: anon || null };
  };

  // 4. Merge mute state and identity into members and return moderation lists
  return {
    members: (members ?? []).map((m) => {
      const { user, anonymousIdentity } = mapUserIdentity(m.user);
      return {
        userId: m.userId,
        role: m.role,
        status: m.status,
        joinedAt: m.joinedAt,
        isMuted: mutedUserIds.has(m.userId),
        anonymousIdentity,
        user,
      };
    }),
    pending: (pendingMembers ?? []).map((m) => {
      const { user, anonymousIdentity } = mapUserIdentity(m.user);
      return {
        userId: m.userId,
        role: m.role,
        status: m.status,
        joinedAt: m.joinedAt,
        anonymousIdentity,
        user,
      };
    }),
    muted: (activeMutes ?? []).map((m) => {
      const { user } = mapUserIdentity(m.user);
      return { ...m, user };
    }),
    banned: (activeBans ?? []).map((b) => {
      const { user } = mapUserIdentity(b.user);
      return { ...b, user };
    }),
  };
}

export async function updateMemberRole(
  name: string,
  targetUserId: string,
  newRole: "USER" | "MODERATOR" | "ADMIN" | "OWNER",
  requesterId: string,
) {
  // 1. Load community and basic safety guards
  const decodedName = decodeURIComponent(name);
  const community = await prisma.community.findUnique({
    where: { name: decodedName },
  });

  if (!community) throw new Error("Community not found");
  if (targetUserId === requesterId)
    throw new Error("You cannot change your own role directly.");

  // 2. Resolve requester/target context
  const globalUser = await prisma.user.findUnique({
    where: { id: requesterId },
    select: { role: true, username: true },
  });
  const isGlobalAdmin = globalUser?.role === "ADMIN";

  const requesterMember = await prisma.communityMember.findUnique({
    where: {
      userId_communityId: { userId: requesterId, communityId: community.id },
    },
  });

  const targetMember = await prisma.communityMember.findUnique({
    where: {
      userId_communityId: { userId: targetUserId, communityId: community.id },
    },
  });

  if (!targetMember)
    throw new Error("Target user is not a member of this community.");

  // 3. Enforce role hierarchy permissions
  const reqRole = isGlobalAdmin ? "SYSTEM_ADMIN" : requesterMember?.role;
  const tarRole = targetMember.role;

  // Permission Hierarchy Matrix for Role Changes
  if (reqRole === "MODERATOR" || !reqRole) {
    throw new Error("Unauthorized: Moderators cannot change roles.");
  }

  if (reqRole === "ADMIN") {
    if (tarRole === "OWNER" || tarRole === "ADMIN") {
      throw new Error(
        "Unauthorized: Admins cannot modify other Admins or Owners.",
      );
    }
    if (newRole === "OWNER" || newRole === "ADMIN") {
      throw new Error("Unauthorized: Admins cannot promote to Admin or Owner.");
    }
  }

  // 4. Handle ownership transfer atomically when promoting to OWNER
  // If transferring ownership (Requester is OWNER or SYSTEM_ADMIN promoting to OWNER)
  if (newRole === "OWNER") {
    // Only OWNER or SYSTEM_ADMIN can make someone an owner
    if (reqRole !== "OWNER" && !isGlobalAdmin) {
      throw new Error(
        "Unauthorized: Only the current Owner or System Admin can make someone an Owner.",
      );
    }

    // Find the current owner to demote them
    const currentOwner = await prisma.communityMember.findFirst({
      where: {
        communityId: community.id,
        role: "OWNER",
      },
    });

    if (!currentOwner) {
      throw new Error("No current owner found to transfer from.");
    }

    // Demote current owner to Admin and promote target to Owner (in a transaction)
    await prisma.$transaction([
      prisma.communityMember.update({
        where: {
          userId_communityId: {
            userId: currentOwner.userId,
            communityId: community.id,
          },
        },
        data: { role: "ADMIN" },
      }),
      prisma.communityMember.update({
        where: {
          userId_communityId: {
            userId: targetUserId,
            communityId: community.id,
          },
        },
        data: { role: "OWNER" },
      }),
    ]);

    await prisma.notification.create({
      data: {
        userId: targetUserId,
        type: "SYSTEM",
        title: toI18nPayload("topNavbar.moderation_title", {
          community: community.name,
        }),
        message: toI18nPayload("topNavbar.member_owner_transferred_message", {
          community: community.name,
          actor: globalUser?.username || "unknown",
        }),
      },
    });

    return { success: true };
  }

  // 5. Apply standard role update
  await prisma.communityMember.update({
    where: {
      userId_communityId: { userId: targetUserId, communityId: community.id },
    },
    data: { role: newRole },
  });

  const roleNotificationKey =
    newRole === "ADMIN"
      ? "topNavbar.member_role_updated_admin_message"
      : newRole === "MODERATOR"
        ? "topNavbar.member_role_updated_moderator_message"
        : newRole === "USER"
          ? "topNavbar.member_role_updated_user_message"
          : null;

  if (roleNotificationKey) {
    await prisma.notification.create({
      data: {
        userId: targetUserId,
        type: "SYSTEM",
        title: toI18nPayload("topNavbar.moderation_title", {
          community: community.name,
        }),
        message: toI18nPayload(roleNotificationKey, {
          community: community.name,
        }),
      },
    });
  }

  return { success: true };
}

export async function kickMember(
  name: string,
  targetUserId: string,
  requesterId: string,
  transferToUserId?: string,
  reason?: string | null,
) {
  // 1. Load community and basic safety guards
  const decodedName = decodeURIComponent(name);
  const community = await prisma.community.findUnique({
    where: { name: decodedName },
  });

  if (!community) throw new Error("Community not found");
  if (targetUserId === requesterId)
    throw new Error("Use the leave function to remove yourself.");

  // 2. Resolve requester/target context
  const globalUser = await prisma.user.findUnique({
    where: { id: requesterId },
    select: { role: true },
  });
  const isGlobalAdmin = globalUser?.role === "ADMIN";

  const requesterMember = await prisma.communityMember.findUnique({
    where: {
      userId_communityId: { userId: requesterId, communityId: community.id },
    },
  });

  const targetMember = await prisma.communityMember.findUnique({
    where: {
      userId_communityId: { userId: targetUserId, communityId: community.id },
    },
  });

  if (!targetMember) throw new Error("Target user is not a member.");

  // 3. Enforce role hierarchy permissions
  const reqRole = isGlobalAdmin ? "SYSTEM_ADMIN" : requesterMember?.role;
  const tarRole = targetMember.role;

  // Permission Hierarchy Matrix for Kicking
  if (!reqRole || reqRole === "USER") throw new Error("Unauthorized.");

  if (reqRole === "MODERATOR" && tarRole !== "USER") {
    throw new Error("Unauthorized: Moderators can only kick regular users.");
  }

  if (reqRole === "ADMIN" && (tarRole === "ADMIN" || tarRole === "OWNER")) {
    throw new Error("Unauthorized: Admins cannot kick other Admins or Owners.");
  }

  // 4. Handle owner kick edge case (requires transfer for non-empty communities)
  // System Admin kicking an Owner requires a transfer
  if (tarRole === "OWNER") {
    if (!isGlobalAdmin)
      throw new Error("Unauthorized: Only System Admins can kick an Owner.");

    // Check if they are the only member
    const memberCount = await prisma.communityMember.count({
      where: { communityId: community.id },
    });

    if (memberCount > 1) {
      if (!transferToUserId) {
        throw new Error(
          "Must provide a new owner ID to kick the current owner.",
        );
      }
      // Transfer ownership
      await prisma.communityMember.update({
        where: {
          userId_communityId: {
            userId: transferToUserId,
            communityId: community.id,
          },
        },
        data: { role: "OWNER" },
      });
    }
  }

  // 5. Remove membership
  await prisma.communityMember.delete({
    where: {
      userId_communityId: { userId: targetUserId, communityId: community.id },
    },
  });

  await prisma.notification.create({
    data: {
      userId: targetUserId,
      type: "SYSTEM",
      title: toI18nPayload("topNavbar.moderation_title", {
        community: community.name,
      }),
      message: reason?.trim()
        ? toI18nPayload("topNavbar.member_kicked_message_with_reason", {
            community: community.name,
            reason: reason.trim(),
          })
        : toI18nPayload("topNavbar.member_kicked_message", {
            community: community.name,
          }),
    },
  });

  return { success: true };
}

export async function banMember(
  name: string,
  targetUserId: string,
  requesterId: string,
  durationHours: number | null,
  reason: string | null,
) {
  // 1. Load community and basic safety guards
  const decodedName = decodeURIComponent(name);
  const community = await prisma.community.findUnique({
    where: { name: decodedName },
  });

  if (!community) throw new Error("Community not found");
  if (targetUserId === requesterId) throw new Error("You cannot ban yourself.");

  // 2. Resolve requester/target context
  const globalUser = await prisma.user.findUnique({
    where: { id: requesterId },
    select: { role: true },
  });
  const isGlobalAdmin = globalUser?.role === "ADMIN";

  const requesterMember = await prisma.communityMember.findUnique({
    where: {
      userId_communityId: { userId: requesterId, communityId: community.id },
    },
  });

  const targetMember = await prisma.communityMember.findUnique({
    where: {
      userId_communityId: { userId: targetUserId, communityId: community.id },
    },
  });

  const reqRole = isGlobalAdmin ? "SYSTEM_ADMIN" : requesterMember?.role;
  const tarRole = targetMember?.role || "USER";

  // 3. Enforce role hierarchy permissions
  if (!reqRole || reqRole === "USER") throw new Error("Unauthorized.");
  if (reqRole === "MODERATOR" && tarRole !== "USER") {
    throw new Error("Unauthorized: Moderators can only ban regular users.");
  }
  if (reqRole === "ADMIN" && (tarRole === "ADMIN" || tarRole === "OWNER")) {
    throw new Error("Unauthorized: Admins cannot ban other Admins or Owners.");
  }
  if (tarRole === "OWNER" && !isGlobalAdmin) {
    throw new Error("Unauthorized: Only System Admins can ban an Owner.");
  }

  // 4. Compute ban expiration
  const expiresAt = durationHours
    ? new Date(Date.now() + durationHours * 60 * 60 * 1000)
    : null;

  // 5. Gather related content IDs for cleanup
  // Fetch comments to delete (Prisma doesn't support relation traversal in deleteMany easily)
  const userComments = await prisma.comment.findMany({
    where: { authorId: targetUserId, post: { communityId: community.id } },
    select: { id: true },
  });
  const commentIds = userComments.map((c) => c.id);

  // 6. Apply ban and community-specific cleanup in one transaction
  // Execute Ban and Cascade Cleanups
  await prisma.$transaction([
    // 1. Delete Community Membership
    prisma.communityMember.deleteMany({
      where: {
        userId: targetUserId,
        communityId: community.id,
      },
    }),
    // 2. Clear any existing mutes
    prisma.communityMute.deleteMany({
      where: {
        userId: targetUserId,
        communityId: community.id,
      },
    }),
    // 3. Delete their comments in this community
    prisma.comment.deleteMany({
      where: { id: { in: commentIds } },
    }),
    // 4. Delete their posts in this community
    prisma.post.deleteMany({
      where: { authorId: targetUserId, communityId: community.id },
    }),
    // 5. Apply the Ban
    prisma.communityBan.upsert({
      where: {
        communityId_userId: { communityId: community.id, userId: targetUserId },
      },
      update: { expiresAt, reason, createdAt: new Date() },
      create: {
        communityId: community.id,
        userId: targetUserId,
        expiresAt,
        reason,
      },
    }),
  ]);

  const normalizedReason = reason?.trim();
  await prisma.notification.create({
    data: {
      userId: targetUserId,
      type: "SYSTEM",
      title: toI18nPayload("topNavbar.moderation_title", {
        community: community.name,
      }),
      message: normalizedReason
        ? toI18nPayload("topNavbar.member_banned_message_with_reason", {
            community: community.name,
            reason: normalizedReason,
          })
        : toI18nPayload("topNavbar.member_banned_message", {
            community: community.name,
          }),
    },
  });

  return { success: true };
}

export async function unbanMember(
  name: string,
  targetUserId: string,
  requesterId: string,
) {
  const decodedName = decodeURIComponent(name);
  const community = await prisma.community.findUnique({
    where: { name: decodedName },
  });
  if (!community) throw new Error("Community not found");

  const globalUser = await prisma.user.findUnique({
    where: { id: requesterId },
    select: { role: true },
  });
  const requesterMember = await prisma.communityMember.findUnique({
    where: {
      userId_communityId: { userId: requesterId, communityId: community.id },
    },
  });

  const reqRole =
    globalUser?.role === "ADMIN" ? "SYSTEM_ADMIN" : requesterMember?.role;
  if (!reqRole || reqRole === "USER") throw new Error("Unauthorized.");

  await prisma.communityBan.deleteMany({
    where: { communityId: community.id, userId: targetUserId },
  });

  return { success: true };
}

export async function muteMember(
  name: string,
  targetUserId: string,
  requesterId: string,
  durationHours: number | null,
  reason: string | null,
) {
  // 1. Load community and basic safety guards
  const decodedName = decodeURIComponent(name);
  const community = await prisma.community.findUnique({
    where: { name: decodedName },
  });
  if (!community) throw new Error("Community not found");
  if (targetUserId === requesterId)
    throw new Error("You cannot mute yourself.");

  // 2. Resolve requester/target context
  const globalUser = await prisma.user.findUnique({
    where: { id: requesterId },
    select: { role: true },
  });
  const isGlobalAdmin = globalUser?.role === "ADMIN";

  const requesterMember = await prisma.communityMember.findUnique({
    where: {
      userId_communityId: { userId: requesterId, communityId: community.id },
    },
  });

  const targetMember = await prisma.communityMember.findUnique({
    where: {
      userId_communityId: { userId: targetUserId, communityId: community.id },
    },
  });

  if (!targetMember) throw new Error("Target user is not a member.");

  // 3. Enforce role hierarchy permissions
  const reqRole = isGlobalAdmin ? "SYSTEM_ADMIN" : requesterMember?.role;
  const tarRole = targetMember.role;

  if (!reqRole || reqRole === "USER") throw new Error("Unauthorized.");
  if (reqRole === "MODERATOR" && tarRole !== "USER")
    throw new Error("Unauthorized: Moderators can only mute users.");
  if (reqRole === "ADMIN" && (tarRole === "ADMIN" || tarRole === "OWNER"))
    throw new Error("Unauthorized: Admins cannot mute Admins/Owners.");
  if (tarRole === "OWNER" && !isGlobalAdmin) throw new Error("Unauthorized.");

  // 4. Compute mute expiration and persist mute state
  const expiresAt = durationHours
    ? new Date(Date.now() + durationHours * 60 * 60 * 1000)
    : null;

  await prisma.communityMute.upsert({
    where: {
      communityId_userId: { communityId: community.id, userId: targetUserId },
    },
    update: { expiresAt, reason, createdAt: new Date() },
    create: {
      communityId: community.id,
      userId: targetUserId,
      expiresAt,
      reason,
    },
  });

  const normalizedReason = reason?.trim();
  await prisma.notification.create({
    data: {
      userId: targetUserId,
      type: "SYSTEM",
      title: toI18nPayload("topNavbar.moderation_title", {
        community: community.name,
      }),
      message: normalizedReason
        ? toI18nPayload("topNavbar.member_muted_message_with_reason", {
            community: community.name,
            reason: normalizedReason,
          })
        : toI18nPayload("topNavbar.member_muted_message", {
            community: community.name,
          }),
    },
  });

  return { success: true };
}

export async function unmuteMember(
  name: string,
  targetUserId: string,
  requesterId: string,
) {
  const decodedName = decodeURIComponent(name);
  const community = await prisma.community.findUnique({
    where: { name: decodedName },
  });
  if (!community) throw new Error("Community not found");

  const globalUser = await prisma.user.findUnique({
    where: { id: requesterId },
    select: { role: true },
  });
  const requesterMember = await prisma.communityMember.findUnique({
    where: {
      userId_communityId: { userId: requesterId, communityId: community.id },
    },
  });

  const reqRole =
    globalUser?.role === "ADMIN" ? "SYSTEM_ADMIN" : requesterMember?.role;
  if (!reqRole || reqRole === "USER") throw new Error("Unauthorized.");

  await prisma.communityMute.deleteMany({
    where: { communityId: community.id, userId: targetUserId },
  });

  return { success: true };
}

export async function respondToMembershipRequest(
  name: string,
  targetUserId: string,
  requesterId: string,
  action: "ACCEPT" | "REJECT",
) {
  const decodedName = decodeURIComponent(name);
  const community = await prisma.community.findUnique({
    where: { name: decodedName },
  });
  if (!community) throw new Error("Community not found");

  const globalUser = await prisma.user.findUnique({
    where: { id: requesterId },
  });
  const requesterMember = await prisma.communityMember.findUnique({
    where: {
      userId_communityId: { userId: requesterId, communityId: community.id },
    },
  });

  const isGlobalAdmin = globalUser?.role === "ADMIN";
  const hasAccess =
    isGlobalAdmin ||
    ["OWNER", "ADMIN", "MODERATOR"].includes(requesterMember?.role || "");

  if (!hasAccess) throw new ForbiddenError("Unauthorized");

  if (action === "ACCEPT") {
    await prisma.communityMember.update({
      where: {
        userId_communityId: { userId: targetUserId, communityId: community.id },
      },
      data: { status: "ACCEPTED" },
    });

    await prisma.notification.create({
      data: {
        userId: targetUserId,
        type: "SYSTEM",
        title: toI18nPayload("communityPage.join_request_update_title", {}),
        message: toI18nPayload("communityPage.join_request_accepted_msg", {
          community: community.name,
        }),
      },
    });
  } else {
    await prisma.communityMember.delete({
      where: {
        userId_communityId: { userId: targetUserId, communityId: community.id },
      },
    });

    await prisma.notification.create({
      data: {
        userId: targetUserId,
        type: "SYSTEM",
        title: toI18nPayload("communityPage.join_request_update_title", {}),
        message: toI18nPayload("communityPage.join_request_declined_msg", {
          community: community.name,
        }),
      },
    });
  }

  return { success: true };
}

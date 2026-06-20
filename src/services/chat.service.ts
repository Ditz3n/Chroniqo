// src/services/chat.service.ts
import {
  formatAnonymousDisplayName,
  formatAnonymousUsername,
  pickRandomAnonymousIdentity,
} from "@/lib/anonymous-animals";
import {
  CreateConversationDTO,
  CreateMessageDTO,
  ExtendConversationDTO,
  UpdateConversationDTO,
  UpdateParticipantDTO,
} from "@/lib/dtos/chat.dto";
import { ForbiddenError } from "@/lib/errors/http-errors";
import { prisma } from "@/lib/prisma";
import { toI18nPayload } from "@/lib/utils/i18n-payload";
import { getTodayUTC } from "@/lib/utils/mood-ring";

// ---------------------------------------------------------------------------
// Shared participant select - reused across queries to keep shapes consistent
// ---------------------------------------------------------------------------
const participantSelect = {
  status: true,
  nickname: true,
  isMuted: true,
  lastReadAt: true,
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
} as const;

const messagePreviewInclude = {
  orderBy: { createdAt: "desc" },
  take: 1,
  include: { sender: { select: { id: true, name: true, username: true } } },
} as const;

// ---------------------------------------------------------------------------
// Access validation
// ---------------------------------------------------------------------------

/**
 * Validates read access to a conversation.
 *
 * - Regular chats: user must be a non-expired participant.
 * - Community chats: user only needs to be an accepted community member
 *   (they can read without having joined the chat as a participant).
 */
async function validateAccess(conversationId: string, userId: string) {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
  });
  if (!conversation) {
    throw new ForbiddenError("Conversation not found or access denied");
  }
  if (conversation.isCommunity) {
    const membership = await prisma.communityMember.findUnique({
      where: {
        userId_communityId: {
          userId,
          communityId: conversation.communityId!,
        },
      },
    });
    if (!membership || membership.status !== "ACCEPTED") {
      throw new ForbiddenError("Conversation not found or access denied");
    }
    return conversation;
  }
  // Regular chat: must not be expired and user must be a participant
  if (!conversation.expiresAt || conversation.expiresAt <= new Date()) {
    throw new ForbiddenError("Conversation not found or access denied");
  }
  const isParticipant = await prisma.conversationParticipant.findUnique({
    where: { userId_conversationId: { userId, conversationId } },
  });
  if (!isParticipant) {
    throw new ForbiddenError("Conversation not found or access denied");
  }
  return conversation;
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/**
 * Returns the user's active direct/group conversations plus all community
 * chats for communities they belong to.
 *
 * Community chats are returned separately so the frontend can render them
 * in a dedicated tab and apply different interaction rules.
 */
export async function getConversations(userId: string) {
  // Personal chats (direct + group) - existing behaviour
  const conversations = await prisma.conversation.findMany({
    where: {
      isCommunity: false,
      expiresAt: { gt: new Date() },
      // Hide conversations from the user if the 15-minute delay has passed
      // (even if the CRON job hasn't run yet)
      OR: [
        { deletionScheduledAt: null },
        { deletionScheduledAt: { gt: new Date() } },
      ],
      participants: { some: { userId } },
    },
    include: {
      participants: { select: participantSelect },
      messages: messagePreviewInclude,
    },
    orderBy: { updatedAt: "desc" },
  });

  // Community chats - visible to all accepted community members, regardless
  // of whether they have joined the chat as a ConversationParticipant
  const communityConversations = await prisma.conversation.findMany({
    where: {
      isCommunity: true,
      community: {
        members: { some: { userId, status: "ACCEPTED" } },
        isActive: true,
      },
    },
    include: {
      // Community metadata + all members with roles for the info sidebar
      community: {
        select: {
          id: true,
          name: true,
          image: true,
          avatarEmoji: true,
          avatarBgColor: true,
          members: {
            where: { status: "ACCEPTED" },
            orderBy: { role: "asc" }, // ADMIN < MODERATOR < OWNER < USER alphabetically
            select: {
              role: true,
              userId: true,
              user: {
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
                },
              },
            },
          },
        },
      },
      // Only joined users (ConversationParticipants)
      participants: { select: participantSelect },
      messages: messagePreviewInclude,
    },
    orderBy: { updatedAt: "desc" },
  });

  // Post-query enrichment: add anonymous identities and mute status to community members
  const communityIds = communityConversations
    .map((c) => c.communityId)
    .filter((id): id is string => !!id);

  // Collect all unique member user IDs across community conversations
  // so we can fetch their global mute status in a single query
  const memberUserIds = Array.from(
    new Set(
      communityConversations.flatMap(
        (c) => c.community?.members.map((m) => m.userId) ?? [],
      ),
    ),
  );

  const [anonymousIdentities, activeMutes, viewerUser, activeGlobalMutes] =
    await Promise.all([
      prisma.communityAnonymousIdentity.findMany({
        where: { communityId: { in: communityIds } },
        select: {
          userId: true,
          communityId: true,
          displayName: true,
          username: true,
          animalEmoji: true,
          bgColor: true,
        },
      }),
      prisma.communityMute.findMany({
        where: {
          communityId: { in: communityIds },
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        },
        select: {
          userId: true,
          communityId: true,
          reason: true,
          expiresAt: true,
        },
      }),
      prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
      }),
      // Fetch active global mutes for all community members in one query
      prisma.globalMute.findMany({
        where: {
          userId: { in: memberUserIds },
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        },
        select: { userId: true, reason: true, expiresAt: true },
      }),
    ]);

  const isGlobalAdmin = viewerUser?.role === "ADMIN";

  const anonMap = new Map(
    anonymousIdentities.map((a) => [`${a.userId}:${a.communityId}`, a]),
  );
  const muteSet = new Set(
    activeMutes.map((m) => `${m.userId}:${m.communityId}`),
  );
  const globalMuteMap = new Map(activeGlobalMutes.map((m) => [m.userId, m]));

  // Current user's role per community - needed to decide whether to anonymize preview
  const userMemberships = await prisma.communityMember.findMany({
    where: { userId, communityId: { in: communityIds } },
    select: { communityId: true, role: true },
  });
  const userRoleMap = new Map(
    userMemberships.map((m) => [m.communityId, m.role]),
  );

  const enrichedCommunityConversations = communityConversations.map((conv) => {
    // Anonymize the last-message preview for non-privileged viewers
    const userRole = userRoleMap.get(conv.communityId ?? "");
    const userIsPrivileged =
      isGlobalAdmin || ["OWNER", "ADMIN", "MODERATOR"].includes(userRole ?? "");

    let messages = conv.messages;
    const lastMsg = conv.messages?.[0];
    if (lastMsg?.isSystem && !userIsPrivileged) {
      try {
        const payload = JSON.parse(lastMsg.content) as {
          key: string;
          params: Record<string, string>;
        };
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const senderId = (lastMsg.sender as any)?.id as string | undefined;

        const senderMember = conv.community?.members.find(
          (m) => m.userId === senderId,
        );
        const senderRole = senderMember?.role ?? "USER";
        const senderIsPrivileged = ["OWNER", "ADMIN", "MODERATOR"].includes(
          senderRole,
        );

        if (!senderIsPrivileged && payload?.params?.user && senderId) {
          const identity = anonMap.get(`${senderId}:${conv.communityId}`);
          if (identity) {
            messages = [
              {
                ...lastMsg,
                content: JSON.stringify({
                  ...payload,
                  params: { ...payload.params, user: identity.displayName },
                }),
              },
            ] as typeof conv.messages;
          }
        }
      } catch {
        // malformed payload - leave as-is
      }
    }

    // ← TILFØJ HER: anonymiser regular-besked preview for ikke-privilegerede
    const currentMsg = messages[0];
    if (currentMsg && !currentMsg.isSystem && !userIsPrivileged) {
      const senderId = currentMsg.sender?.id as string | undefined;
      if (senderId) {
        const senderMember = conv.community?.members.find(
          (m) => m.userId === senderId,
        );
        const senderIsPrivileged = ["OWNER", "ADMIN", "MODERATOR"].includes(
          senderMember?.role ?? "",
        );
        if (!senderIsPrivileged) {
          const identity = anonMap.get(`${senderId}:${conv.communityId}`);
          if (identity) {
            messages = [
              {
                ...currentMsg,
                sender: {
                  id: senderId,
                  name: identity.displayName,
                  username: identity.username,
                },
              },
            ] as typeof conv.messages;
          }
        }
      }
    }

    return {
      ...conv,
      messages,
      community: conv.community
        ? {
            ...conv.community,
            mutes: activeMutes
              .filter((m) => m.communityId === conv.communityId)
              .map((m) => ({
                userId: m.userId,
                reason: m.reason,
                expiresAt: m.expiresAt?.toISOString() || null,
              })),
            members: conv.community.members.map((m) => {
              const gm = globalMuteMap.get(m.userId);
              return {
                ...m,
                anonymousIdentity:
                  anonMap.get(`${m.userId}:${conv.communityId}`) ?? null,
                isMuted: muteSet.has(`${m.userId}:${conv.communityId}`),
                // Serialise global mute so the client can block sending and show the badge
                globalMute: gm
                  ? {
                      reason: gm.reason,
                      expiresAt: gm.expiresAt?.toISOString() ?? null,
                    }
                  : null,
              };
            }),
          }
        : null,
    };
  }) as unknown as typeof communityConversations;

  // --- Calculate unread counts based on lastReadAt ---
  const allConvIds = [
    ...conversations.map((c) => c.id),
    ...enrichedCommunityConversations.map((c) => c.id),
  ];

  const myParticipants = await prisma.conversationParticipant.findMany({
    where: { userId, conversationId: { in: allConvIds } },
    select: { conversationId: true, lastReadAt: true },
  });

  const unreadCounts = await Promise.all(
    myParticipants.map(async (p) => {
      const count = await prisma.message.count({
        where: {
          conversationId: p.conversationId,
          createdAt: { gt: p.lastReadAt },
          senderId: { not: userId }, // Own messages don't count as unread
        },
      });
      return { conversationId: p.conversationId, count };
    }),
  );

  const unreadMap = new Map(
    unreadCounts.map((u) => [u.conversationId, u.count]),
  );

  const finalConversations = conversations.map((c) => ({
    ...c,
    unreadCount: unreadMap.get(c.id) || 0,
  }));

  const finalCommunityConversations = enrichedCommunityConversations.map(
    (c) => ({
      ...c,
      unreadCount: unreadMap.get(c.id) || 0,
    }),
  );

  return {
    conversations: finalConversations,
    communityConversations: finalCommunityConversations,
  };
}

// ---------------------------------------------------------------------------
// Community chat lifecycle
// ---------------------------------------------------------------------------

/**
 * Creates a permanent community chat and adds the community creator as the
 * first participant. Called automatically when a community is created.
 */
export async function createCommunityConversation(
  userId: string,
  communityId: string,
) {
  console.log(
    "[ChatService] createCommunityConversation communityId:",
    communityId,
  );

  const community = await prisma.community.findUnique({
    where: { id: communityId },
    select: {
      name: true,
      image: true,
      avatarEmoji: true,
      avatarBgColor: true,
    },
  });
  if (!community) throw new Error("Community not found");

  const conversation = await prisma.conversation.create({
    data: {
      communityId,
      isCommunity: true,
      name: `c/${community.name}`,
      image: community.image,
      avatarEmoji: community.avatarEmoji,
      avatarBgColor: community.avatarBgColor,
      durationHours: 0, // Not applicable for community chats
      expiresAt: new Date("2099-12-31"), // Effectively permanent
      participants: {
        create: {
          userId,
          status: "ACCEPTED",
          isMuted: true,
          lastReadAt: new Date(),
        },
      },
    },
  });

  const creator = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, username: true },
  });
  const creatorName = creator?.name || creator?.username || "Unknown";

  await prisma.message.create({
    data: {
      conversationId: conversation.id,
      senderId: userId,
      content: toI18nPayload("chat_system.community_chat_created", {
        user: creatorName,
        community: community.name,
      }),
      isSystem: true,
      messageType: "COMMUNITY_CHAT_CREATED",
    },
  });

  // Assign an anonymous identity to the community creator
  const { animalName, animalEmoji, bgColor, suffix } =
    pickRandomAnonymousIdentity();
  await prisma.communityAnonymousIdentity.create({
    data: {
      userId,
      communityId,
      displayName: formatAnonymousDisplayName(animalName, suffix),
      username: formatAnonymousUsername(animalName, suffix),
      animalEmoji,
      bgColor,
    },
  });

  console.log(
    "[ChatService] Community chat created:",
    conversation.id,
    "for community:",
    communityId,
  );

  return conversation;
}

/**
 * Adds a community member to the community chat as a ConversationParticipant,
 * enabling them to send messages and react. Emits a system message.
 */
export async function joinCommunityChat(
  userId: string,
  conversationId: string,
) {
  console.log("[ChatService] joinCommunityChat user:", userId);

  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
  });

  if (!conversation?.isCommunity) {
    throw new Error("Not a community chat");
  }

  // Verify community membership
  const membership = await prisma.communityMember.findUnique({
    where: {
      userId_communityId: {
        userId,
        communityId: conversation.communityId!,
      },
    },
  });
  if (!membership || membership.status !== "ACCEPTED") {
    throw new ForbiddenError(
      "You must be a community member to join this chat",
    );
  }

  // Check community mute before allowing join
  const mute = await prisma.communityMute.findUnique({
    where: {
      communityId_userId: {
        communityId: conversation.communityId!,
        userId,
      },
    },
  });
  if (mute && (!mute.expiresAt || mute.expiresAt > new Date())) {
    throw new ForbiddenError("You are muted in this community");
  }

  // Idempotent: return early if already joined
  const existing = await prisma.conversationParticipant.findUnique({
    where: { userId_conversationId: { userId, conversationId } },
  });
  if (existing) {
    console.log(
      "[ChatService] User already joined community chat:",
      conversationId,
    );
    return { alreadyJoined: true };
  }

  await prisma.conversationParticipant.create({
    data: {
      userId,
      conversationId,
      status: "ACCEPTED",
      isMuted: true,
      lastReadAt: new Date(),
    },
  });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, username: true },
  });
  const name = user?.name || user?.username || "Unknown";

  await prisma.message.create({
    data: {
      conversationId,
      senderId: userId,
      content: toI18nPayload("chat_system.user_joined_community_chat", {
        user: name,
      }),
      isSystem: true,
      messageType: "USER_JOINED",
    },
  });

  // Assign an anonymous identity if one doesn't exist yet (idempotent)
  // Replaced with upsert to avoid race conditions and because it's now primarily generated at community join
  const { animalName, animalEmoji, bgColor, suffix } =
    pickRandomAnonymousIdentity();
  await prisma.communityAnonymousIdentity.upsert({
    where: {
      userId_communityId: { userId, communityId: conversation.communityId! },
    },
    create: {
      userId,
      communityId: conversation.communityId!,
      displayName: formatAnonymousDisplayName(animalName, suffix),
      username: formatAnonymousUsername(animalName, suffix),
      animalEmoji,
      bgColor,
    },
    update: {},
  });

  // Bump updatedAt so the chat surfaces at the top of all members' lists
  await prisma.conversation.update({
    where: { id: conversationId },
    data: { updatedAt: new Date() },
  });

  console.log("[ChatService] User joined community chat:", conversationId);
  return { success: true };
}

// ---------------------------------------------------------------------------
// Direct / Group chat creation
// ---------------------------------------------------------------------------

/**
 * Creates a new conversation, or returns an existing active 1:1 conversation
 * if one already exists between the two users.
 */
export async function createConversation(
  userId: string,
  data: CreateConversationDTO,
) {
  const allParticipantIds = Array.from(
    new Set([...data.participantIds, userId]),
  );
  if (allParticipantIds.length < 2)
    throw new Error("A conversation requires at least two participants");
  const targetUsers = await prisma.user.findMany({
    where: { id: { in: data.participantIds } },
    select: { id: true, messagingPermission: true },
  });
  let targetStatus = "ACCEPTED";
  if (allParticipantIds.length === 2) {
    const targetUser = targetUsers.find((u) => u.id !== userId);
    if (!targetUser) throw new Error("User not found");
    if (targetUser.messagingPermission === "NONE") {
      throw new Error("This user is not accepting messages.");
    }
    const friendship = await prisma.friendship.findUnique({
      where: { userId_friendId: { userId, friendId: targetUser.id } },
    });
    if (targetUser.messagingPermission === "ONLY_FRIENDS" && !friendship) {
      throw new Error("You must be friends to message this user.");
    }
    if (targetUser.messagingPermission === "ALL" && !friendship) {
      targetStatus = "PENDING";
    }
    // Return existing 1:1 chat if one exists (before any side effects)
    const existingConvo = await prisma.conversation.findFirst({
      where: {
        isCommunity: false,
        expiresAt: { gt: new Date() },
        OR: [
          { deletionScheduledAt: null },
          { deletionScheduledAt: { gt: new Date() } },
        ],
        AND: [
          { participants: { some: { userId: allParticipantIds[0] } } },
          { participants: { some: { userId: allParticipantIds[1] } } },
        ],
      },
      include: {
        participants: {
          include: {
            user: { select: { id: true, name: true, username: true } },
          },
        },
      },
    });
    if (existingConvo && existingConvo.participants.length === 2) {
      return existingConvo;
    }
  }

  const expiresAt = new Date(Date.now() + data.durationHours * 60 * 60 * 1000);

  const newConvo = await prisma.conversation.create({
    data: {
      durationHours: data.durationHours,
      expiresAt,
      participants: {
        create: allParticipantIds.map((id) => ({
          userId: id,
          status: id === userId ? "ACCEPTED" : targetStatus,
        })),
      },
    },
    include: {
      participants: {
        include: { user: { select: { id: true, name: true, username: true } } },
      },
    },
  });

  // Create initial system message so the chat appears in lists immediately
  let sysContent = "";
  if (allParticipantIds.length === 2) {
    const creator = newConvo.participants.find(
      (p) => p.userId === userId,
    )?.user;
    const other = newConvo.participants.find((p) => p.userId !== userId)?.user;
    sysContent = toI18nPayload("chat_system.chat_created_direct", {
      creator: creator?.name || creator?.username || "Unknown",
      other: other?.name || other?.username || "Unknown",
    });
  } else {
    const creator = newConvo.participants.find(
      (p) => p.userId === userId,
    )?.user;
    const otherNames = newConvo.participants
      .filter((p) => p.userId !== userId)
      .map((p) => p.user.name || p.user.username)
      .join(", ");
    sysContent = toI18nPayload("chat_system.chat_created_group", {
      creator: creator?.name || creator?.username || "Unknown",
      participants: otherNames || "Unknown",
    });
  }

  await prisma.message.create({
    data: {
      conversationId: newConvo.id,
      senderId: userId,
      content: sysContent,
      isSystem: true,
      messageType: "CHAT_CREATED",
    },
  });

  return newConvo;
}

// ---------------------------------------------------------------------------
// Conversation lifecycle
// ---------------------------------------------------------------------------

/**
 * Extends a regular conversation's expiration. Community chats never expire.
 */
export async function extendConversation(
  userId: string,
  conversationId: string,
  durationHours: ExtendConversationDTO["durationHours"],
) {
  const conversation = await validateAccess(conversationId, userId);

  if (conversation.isCommunity) {
    throw new Error("Community chats do not expire and cannot be extended");
  }

  // Calculate base time to append to. If the chat hasn't expired yet, add to the current expiry.
  // Otherwise, default to now so we don't accidentally set it in the past.
  const baseTime =
    conversation.expiresAt && conversation.expiresAt > new Date()
      ? conversation.expiresAt.getTime()
      : Date.now();

  const newExpiresAt = new Date(baseTime + durationHours * 60 * 60 * 1000);

  // Resolve the requester's display name (nickname takes priority in group chats)
  const requesterPart = await prisma.conversationParticipant.findUnique({
    where: { userId_conversationId: { userId, conversationId } },
    include: { user: { select: { name: true, username: true } } },
  });
  const reqName =
    requesterPart?.nickname ||
    (requesterPart?.user &&
      (requesterPart.user.name || requesterPart.user.username)) ||
    "Unknown";

  const formattedExpiry = newExpiresAt
    .toLocaleString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
    .replace(",", "");

  const updated = await prisma.conversation.update({
    where: { id: conversationId },
    data: { expiresAt: newExpiresAt, durationHours },
  });

  await prisma.message.create({
    data: {
      conversationId,
      senderId: userId,
      content: toI18nPayload("chat_system.chat_extended", {
        user: reqName,
        expires: formattedExpiry,
      }),
      isSystem: true,
      messageType: "CHAT_EXTENDED",
    },
  });

  return updated;
}

// ---------------------------------------------------------------------------
// Messages
// ---------------------------------------------------------------------------

/**
 * Fetches all messages in a conversation (oldest first).
 *
 * For community chats, anonymous messages from other users are obfuscated
 * unless the requesting user is an OWNER, ADMIN, or MODERATOR.
 */
export async function getMessages(userId: string, conversationId: string) {
  let conversation;
  try {
    conversation = await validateAccess(conversationId, userId);
  } catch (err) {
    throw err;
  }

  // Viewer's role and mute status (community chats only)
  let canSeeAnonymousSenders = false;

  if (conversation.isCommunity) {
    const viewerUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });
    const isGlobalAdmin = viewerUser?.role === "ADMIN";

    const membership = await prisma.communityMember.findUnique({
      where: {
        userId_communityId: { userId, communityId: conversation.communityId! },
      },
      select: { role: true },
    });
    canSeeAnonymousSenders =
      isGlobalAdmin ||
      ["OWNER", "ADMIN", "MODERATOR"].includes(membership?.role ?? "");

    // Mute check is not used in return value, so skip assignment
    await prisma.communityMute.findUnique({
      where: {
        communityId_userId: {
          communityId: conversation.communityId!,
          userId,
        },
      },
    });
  }

  const messages = await prisma.message.findMany({
    where: { conversationId },
    include: {
      sender: {
        select: {
          id: true,
          name: true,
          username: true,
          image: true,
          avatarEmoji: true,
          avatarBgColor: true,
          emailVerified: true,
        },
      },
      reactions: {
        include: {
          user: {
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
            },
          },
        },
      },
      dailyStatus: {
        include: { user: { select: { name: true, username: true } } },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  // Apply anonymity logic for community chats
  let processedMessages: typeof messages = messages;

  if (conversation.isCommunity) {
    const senderIds = [...new Set(messages.map((m) => m.senderId))];

    const [memberships, identities] = await Promise.all([
      prisma.communityMember.findMany({
        where: {
          communityId: conversation.communityId!,
          userId: { in: senderIds },
        },
        select: { userId: true, role: true },
      }),
      prisma.communityAnonymousIdentity.findMany({
        where: {
          communityId: conversation.communityId!,
          userId: { in: senderIds },
        },
        select: {
          userId: true,
          displayName: true,
          username: true,
          animalEmoji: true,
          bgColor: true,
        },
      }),
    ]);

    const roleMap = new Map(memberships.map((m) => [m.userId, m.role]));
    const identityMap = new Map(identities.map((i) => [i.userId, i]));

    processedMessages = messages.map((msg) => {
      // 1. Anonymize Reactions
      const anonymizedReactions = msg.reactions.map((reaction) => {
        if (canSeeAnonymousSenders) return reaction;

        const reactorRole = roleMap.get(reaction.user.id) ?? "USER";
        const reactorIsPrivileged = ["OWNER", "ADMIN", "MODERATOR"].includes(
          reactorRole,
        );

        // Owners/Admins/Mods' reactions are always visible
        if (reactorIsPrivileged) return reaction;

        // Regular users' reactions are anonymized
        const reactorIdentity = identityMap.get(reaction.user.id);
        const isOwnReaction = reaction.user.id === userId;

        return {
          ...reaction,
          user: {
            ...reaction.user,
            id: isOwnReaction ? reaction.user.id : ("anonymous" as string),
            name: reactorIdentity?.displayName ?? "Anonymous",
            username: reactorIdentity?.username ?? "anonymous",
            image: null,
            avatarEmoji: reactorIdentity?.animalEmoji ?? null,
            avatarBgColor: reactorIdentity?.bgColor ?? null,
          },
        };
      });

      // 2. Anonymize Sender
      if (canSeeAnonymousSenders) {
        return { ...msg, reactions: anonymizedReactions };
      }

      if (!msg.isAnonymous) {
        return { ...msg, reactions: anonymizedReactions };
      }

      // Anonymous message → use animal identity (even if sender is Privileged,
      // because regular users shouldn't see privileged users who opt to be anonymous)
      const identity = identityMap.get(msg.senderId);
      const isOwnMessage = msg.senderId === userId;

      return {
        ...msg,
        reactions: anonymizedReactions,
        sender: {
          id: isOwnMessage ? msg.sender.id : ("anonymous" as string),
          name: identity?.displayName ?? "Anonymous",
          username: identity?.username ?? "anonymous",
          image: null,
          avatarEmoji: identity?.animalEmoji ?? null,
          avatarBgColor: identity?.bgColor ?? null,
          emailVerified: null,
        },
      };
    }) as typeof messages;

    // Anonymise system message payloads for non-privileged viewers.
    // toI18nPayload stores content as JSON: { key: string, params: Record<string, string> }
    if (!canSeeAnonymousSenders) {
      // Build a reverse map: real display name → anonymous identity, for target param resolution
      const senderNames = await prisma.user.findMany({
        where: { id: { in: senderIds } },
        select: { id: true, name: true, username: true },
      });
      const realNameToIdentity = new Map<string, string>();
      for (const u of senderNames) {
        const identity = identityMap.get(u.id);
        if (!identity) continue;
        if (u.name) realNameToIdentity.set(u.name, identity.displayName);
        if (u.username)
          realNameToIdentity.set(u.username, identity.displayName);
      }

      processedMessages = processedMessages.map((msg) => {
        if (!msg.isSystem) return msg;

        // Skip anonymizing system messages from privileged senders
        const senderRole = roleMap.get(msg.senderId) ?? "USER";
        if (["OWNER", "ADMIN", "MODERATOR"].includes(senderRole)) return msg;

        try {
          const payload = JSON.parse(msg.content) as {
            key: string;
            params: Record<string, string>;
          };
          if (!payload?.params) return msg;

          const anonymisedParams = { ...payload.params };
          let changed = false;

          if (anonymisedParams.user) {
            const identity = identityMap.get(msg.senderId);
            if (identity) {
              anonymisedParams.user = identity.displayName;
              changed = true;
            }
          }

          if (anonymisedParams.target) {
            const anonName = realNameToIdentity.get(anonymisedParams.target);
            if (anonName) {
              anonymisedParams.target = anonName;
              changed = true;
            }
          }

          if (!changed) return msg;
          return {
            ...msg,
            content: JSON.stringify({ ...payload, params: anonymisedParams }),
          };
        } catch {
          return msg;
        }
      }) as typeof messages;
    }
  }

  // Return only the fields expected by the test
  return {
    conversation: {
      expiresAt: conversation.expiresAt ?? undefined,
      deletedByUserId: conversation.deletedByUserId,
      deletionScheduledAt: conversation.deletionScheduledAt,
    },
    messages: processedMessages,
  };
}

/**
 * Creates a message and bumps the conversation's updatedAt timestamp.
 *
 * For community chats, also enforces:
 * - User must have joined the chat (be a ConversationParticipant)
 * - User must not be muted in the community
 */
export async function createMessage(
  userId: string,
  conversationId: string,
  data: CreateMessageDTO,
) {
  const conversation = await validateAccess(conversationId, userId);

  if (conversation.isCommunity) {
    // Participation check: must have pressed "Join" to send messages
    const participant = await prisma.conversationParticipant.findUnique({
      where: { userId_conversationId: { userId, conversationId } },
    });
    if (!participant) {
      throw new ForbiddenError(
        "You must join this chat before sending messages",
      );
    }

    // Mute check: community mute blocks chat interaction
    const mute = await prisma.communityMute.findUnique({
      where: {
        communityId_userId: {
          communityId: conversation.communityId!,
          userId,
        },
      },
    });
    if (mute && (!mute.expiresAt || mute.expiresAt > new Date())) {
      throw new ForbiddenError("You are muted in this community");
    }
    if (mute && (!mute.expiresAt || mute.expiresAt > new Date())) {
      throw new ForbiddenError("You are muted in this community");
    }

    // Global mute check - only applies to community chats.
    // Direct and group chats remain accessible for globally muted users.
    const globalMute = await prisma.globalMute.findUnique({
      where: { userId },
    });
    if (
      globalMute &&
      (!globalMute.expiresAt || globalMute.expiresAt > new Date())
    ) {
      throw new ForbiddenError("You are globally muted");
    }
  }

  // Use a transaction to create the message AND bump the conversation's updatedAt timestamp
  // Bumping updatedAt ensures the conversation bubbles to the top of the list
  const [message] = await prisma.$transaction([
    prisma.message.create({
      data: {
        content: data.content,
        replyToId: data.replyToId,
        dailyStatusId: data.dailyStatusId,
        // isAnonymous only takes effect in community chats
        isAnonymous: conversation.isCommunity
          ? (data.isAnonymous ?? false)
          : false,
        senderId: userId,
        conversationId,
      },
      include: {
        sender: { select: { id: true, name: true, username: true } },
        reactions: true,
        dailyStatus: {
          include: { user: { select: { name: true, username: true } } },
        },
      },
    }),
    prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    }),
    prisma.conversationParticipant.update({
      where: { userId_conversationId: { userId, conversationId } },
      data: { lastReadAt: new Date() },
    }),
  ]);

  return message;
}

/**
 * Toggles a user's reaction on a message.
 */
export async function toggleMessageReaction(
  userId: string,
  messageId: string,
  emoji: string,
) {
  const message = await prisma.message.findUnique({
    where: { id: messageId },
    select: { conversationId: true },
  });
  if (!message) throw new Error("Message not found");
  // If conversation is not found or access denied, throw
  const convo = await prisma.conversation.findFirst({
    where: { id: message.conversationId },
  });
  if (!convo) {
    throw new ForbiddenError("Conversation not found or access denied");
  }
  try {
    await validateAccess(message.conversationId, userId);
  } catch {
    throw new ForbiddenError("Conversation not found or access denied");
  }

  // 3. Check if the user already reacted to this message
  const existingReaction = await prisma.messageReaction.findUnique({
    where: { userId_messageId: { userId, messageId } },
  });

  if (existingReaction) {
    if (existingReaction.emoji === emoji) {
      // Toggle off if clicking the same emoji
      await prisma.messageReaction.delete({
        where: { userId_messageId: { userId, messageId } },
      });
      return { action: "removed" };
    } else {
      // Update to the new emoji
      await prisma.messageReaction.update({
        where: { userId_messageId: { userId, messageId } },
        data: { emoji },
      });
      return { action: "updated" };
    }
  }

  // 4. Create new reaction if none exists
  await prisma.messageReaction.create({
    data: { userId, messageId, emoji },
  });

  return { action: "added" };
}

/**
 * Soft-deletes a message by timestamping deletedAt.
 */
export async function softDeleteMessage(userId: string, messageId: string) {
  const message = await prisma.message.findUnique({
    where: { id: messageId },
    select: { senderId: true, conversationId: true },
  });

  if (!message) throw new Error("Message not found");
  if (message.senderId !== userId)
    throw new Error("You can only delete your own messages");

  await validateAccess(message.conversationId, userId);

  return prisma.message.update({
    where: { id: messageId },
    data: { deletedAt: new Date() },
  });
}

// ---------------------------------------------------------------------------
// Conversation deletion (regular chats only)
// ---------------------------------------------------------------------------

/**
 * Schedules conversation deletion 15 minutes ahead.
 * Community chats cannot be deleted.
 */
export async function scheduleConversationDeletion(
  userId: string,
  conversationId: string,
) {
  const conversation = await validateAccess(conversationId, userId);

  if (conversation.isCommunity) {
    throw new Error("Community chats cannot be deleted");
  }

  const scheduledTime = new Date(Date.now() + 15 * 60 * 1000);
  const updated = await prisma.conversation.update({
    where: { id: conversationId },
    data: { deletedByUserId: userId, deletionScheduledAt: scheduledTime },
  });

  const participant = await prisma.conversationParticipant.findUnique({
    where: { userId_conversationId: { userId, conversationId } },
    include: { user: true },
  });
  const name =
    participant?.nickname ||
    (participant?.user &&
      (participant.user.name || participant.user.username)) ||
    "Unknown";

  await prisma.message.create({
    data: {
      conversationId,
      senderId: userId,
      content: toI18nPayload("chat_system.deletion_scheduled", { user: name }),
      isSystem: true,
      messageType: "DELETION_SCHEDULED",
    },
  });

  return updated;
}

/**
 * Cancels a pending conversation deletion.
 * Community chats cannot be deleted, so this is also a no-op for them.
 */
export async function cancelConversationDeletion(
  userId: string,
  conversationId: string,
) {
  const conversation = await validateAccess(conversationId, userId);

  if (conversation.isCommunity) {
    throw new Error("Community chats cannot be deleted");
  }

  // Only the user who initiated deletion can cancel it
  if (conversation.deletedByUserId !== userId) {
    throw new Error("Only the user who initiated deletion can cancel it");
  }

  const updated = await prisma.conversation.update({
    where: { id: conversationId },
    data: { deletedByUserId: null, deletionScheduledAt: null },
  });

  const participant = await prisma.conversationParticipant.findUnique({
    where: { userId_conversationId: { userId, conversationId } },
    include: { user: true },
  });
  const name =
    participant?.nickname ||
    (participant?.user &&
      (participant.user.name || participant.user.username)) ||
    "Unknown";

  await prisma.message.create({
    data: {
      conversationId,
      senderId: userId,
      content: toI18nPayload("chat_system.deletion_canceled", { user: name }),
      isSystem: true,
      messageType: "DELETION_CANCELED",
    },
  });

  return updated;
}

// ---------------------------------------------------------------------------
// Conversation metadata updates (regular chats only)
// ---------------------------------------------------------------------------

/**
 * Updates group chat details (name, avatar).
 * Community chats sync their metadata from the community - direct editing
 * is not permitted here.
 */
export async function updateConversation(
  userId: string,
  conversationId: string,
  data: UpdateConversationDTO,
) {
  const conversation = await validateAccess(conversationId, userId);

  if (conversation.isCommunity) {
    throw new Error(
      "Community chat details are managed through the community settings",
    );
  }

  // Only allow editing if it's a group chat
  const participantCount = await prisma.conversationParticipant.count({
    where: { conversationId },
  });

  if (participantCount <= 2) {
    throw new Error("Cannot edit 1:1 conversations");
  }

  const requesterPart = await prisma.conversationParticipant.findUnique({
    where: { userId_conversationId: { userId, conversationId } },
    include: { user: true },
  });
  const reqName =
    requesterPart?.nickname ||
    (requesterPart?.user &&
      (requesterPart.user.name || requesterPart.user.username)) ||
    "Unknown";

  // Determine what actually changed
  const nameChanged =
    data.name !== undefined && data.name !== conversation.name;
  const nameReset =
    data.name === null &&
    conversation.name !== null &&
    conversation.name !== undefined &&
    conversation.name !== "";
  const imageChanged =
    data.image !== undefined && data.image !== conversation.image;
  const avatarEmojiChanged =
    data.avatarEmoji !== undefined &&
    data.avatarEmoji !== conversation.avatarEmoji;
  const avatarBgColorChanged =
    data.avatarBgColor !== undefined &&
    data.avatarBgColor !== conversation.avatarBgColor;

  const updated = await prisma.conversation.update({
    where: { id: conversationId },
    data: {
      name: data.name !== undefined ? data.name : conversation.name,
      image: data.image !== undefined ? data.image : conversation.image,
      avatarEmoji:
        data.avatarEmoji !== undefined
          ? data.avatarEmoji
          : conversation.avatarEmoji,
      avatarBgColor:
        data.avatarBgColor !== undefined
          ? data.avatarBgColor
          : conversation.avatarBgColor,
    },
  });

  // Create system messages
  const messagesToCreate = [];
  if (nameReset) {
    messagesToCreate.push({
      conversationId,
      senderId: userId,
      content: toI18nPayload("chat_system.group_name_reset", { user: reqName }),
      isSystem: true,
      messageType: "GROUP_UPDATE",
    });
  } else if (nameChanged) {
    messagesToCreate.push({
      conversationId,
      senderId: userId,
      content: toI18nPayload("chat_system.group_renamed", {
        user: reqName,
        name: data.name ?? "",
      }),
      isSystem: true,
      messageType: "GROUP_UPDATE",
    });
  }
  if (imageChanged || avatarEmojiChanged || avatarBgColorChanged) {
    messagesToCreate.push({
      conversationId,
      senderId: userId,
      content: toI18nPayload("chat_system.group_avatar_changed", {
        user: reqName,
      }),
      isSystem: true,
      messageType: "GROUP_UPDATE",
    });
  }

  if (messagesToCreate.length > 0) {
    await prisma.message.createMany({ data: messagesToCreate });
  }

  return updated;
}

// ---------------------------------------------------------------------------
// Participant management
// ---------------------------------------------------------------------------

/**
 * Updates a participant's nickname and emits a system message.
 */
export async function updateParticipantNickname(
  requesterId: string,
  conversationId: string,
  targetUserId: string,
  data: UpdateParticipantDTO,
) {
  await validateAccess(conversationId, requesterId);

  const target = await prisma.conversationParticipant.findUnique({
    where: { userId_conversationId: { userId: targetUserId, conversationId } },
    include: { user: true },
  });

  if (!target) throw new Error("Participant not found");

  const requesterPart = await prisma.conversationParticipant.findUnique({
    where: { userId_conversationId: { userId: requesterId, conversationId } },
    include: { user: true },
  });
  const reqName =
    requesterPart?.nickname ||
    (requesterPart?.user &&
      (requesterPart.user.name || requesterPart.user.username)) ||
    "Unknown";
  const targetName =
    target.nickname ||
    (target.user && (target.user.name || target.user.username)) ||
    "Unknown";

  const updated = await prisma.conversationParticipant.update({
    where: { userId_conversationId: { userId: targetUserId, conversationId } },
    data: { nickname: data.nickname },
  });

  await prisma.message.create({
    data: {
      conversationId,
      senderId: requesterId,
      content: data.nickname
        ? toI18nPayload("chat_system.nickname_set", {
            user: reqName,
            target: targetName,
            nickname: data.nickname,
          })
        : toI18nPayload("chat_system.nickname_cleared", {
            user: reqName,
            target: targetName,
          }),
      isSystem: true,
      messageType: "NICKNAME_UPDATE",
    },
  });

  return updated;
}

/**
 * Removes a participant from a chat and emits a system message.
 *
 * Community chat rules:
 * - OWNER cannot leave (they own the community)
 * - Only OWNER/ADMIN/MODERATOR can kick other users
 */
export async function removeParticipant(
  requesterId: string,
  conversationId: string,
  targetUserId: string,
) {
  await validateAccess(conversationId, requesterId);

  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
  });

  if (!conversation) throw new Error("Conversation not found");

  if (conversation.isCommunity) {
    const requesterMember = await prisma.communityMember.findUnique({
      where: {
        userId_communityId: {
          userId: requesterId,
          communityId: conversation.communityId!,
        },
      },
      select: { role: true },
    });

    const isSelf = requesterId === targetUserId;

    if (isSelf && requesterMember?.role === "OWNER") {
      throw new Error("The community owner cannot leave the community chat");
    }

    if (!isSelf) {
      const canKick = ["OWNER", "ADMIN", "MODERATOR"].includes(
        requesterMember?.role ?? "",
      );
      if (!canKick) {
        throw new ForbiddenError(
          "Only moderators and admins can remove users from community chats",
        );
      }
    }
  } else {
    const participantCount = await prisma.conversationParticipant.count({
      where: { conversationId },
    });

    if (participantCount <= 2) {
      throw new Error("Cannot remove users from a 1:1 conversation");
    }
  }

  const target = await prisma.conversationParticipant.findUnique({
    where: { userId_conversationId: { userId: targetUserId, conversationId } },
    include: { user: true },
  });

  if (!target) throw new Error("Participant not found");

  const requesterPart = await prisma.conversationParticipant.findUnique({
    where: { userId_conversationId: { userId: requesterId, conversationId } },
    include: { user: true },
  });
  const reqName =
    requesterPart?.nickname ||
    (requesterPart?.user &&
      (requesterPart.user.name || requesterPart.user.username)) ||
    "Unknown";
  const targetName =
    target.nickname ||
    (target.user && (target.user.name || target.user.username)) ||
    "Unknown";

  await prisma.conversationParticipant.delete({
    where: { userId_conversationId: { userId: targetUserId, conversationId } },
  });

  const isSelf = requesterId === targetUserId;
  const sysContent = isSelf
    ? toI18nPayload("chat_system.user_left", { user: reqName })
    : toI18nPayload("chat_system.user_removed", {
        user: reqName,
        target: targetName,
      });

  await prisma.message.create({
    data: {
      conversationId,
      senderId: requesterId,
      content: sysContent,
      isSystem: true,
      messageType: "USER_REMOVED",
    },
  });

  return { success: true };
}

/**
 * Marks all messages in a conversation as read up to the current moment.
 */
export async function markConversationAsRead(
  userId: string,
  conversationId: string,
) {
  await validateAccess(conversationId, userId);

  return prisma.conversationParticipant.update({
    where: { userId_conversationId: { userId, conversationId } },
    data: { lastReadAt: new Date() },
  });
}

/**
 * Toggles the muted state for a participant in a conversation.
 */
export async function toggleConversationMute(
  userId: string,
  conversationId: string,
  isMuted: boolean,
) {
  await validateAccess(conversationId, userId);

  return prisma.conversationParticipant.update({
    where: { userId_conversationId: { userId, conversationId } },
    data: { isMuted },
  });
}

// src/app/api/users/[username]/route.ts
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getTodayUTC } from "@/lib/utils/mood-ring";
import { canViewDailyStatus } from "@/services/user.service";
import { NextResponse } from "next/server";

/**
 * Computes the effective display age.
 * When autoUpdateAge is enabled and a birthDate is stored, age is derived
 * dynamically so it stays current without any scheduled jobs.
 */
function computeEffectiveAge(
  storedAge: number | null,
  birthDate: Date | null,
  autoUpdateAge: boolean,
): number | null {
  if (autoUpdateAge && birthDate) {
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
    return Math.max(0, age);
  }
  return storedAge;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ username: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { username } = await params;

    const targetUser = await prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        image: true,
        avatarEmoji: true,
        avatarBgColor: true,
        headerImage: true,
        headerEmoji: true,
        headerBgColor: true,
        bio: true,
        isPrivate: true,
        pinnedPostId: true,
        messagingPermission: true,
        createdAt: true,
        role: true,
        usernameChangedAt: true,
        gender: true,
        age: true,
        height: true,
        heightUnit: true,
        weight: true,
        weightUnit: true,
        conditions: true,
        medications: true,
        birthDate: true,
        autoUpdateAge: true,
        showConditions: true,
        showMedications: true,
        showAge: true,
        showHeight: true,
        showWeight: true,
        emailVerified: true,
        dailyStatuses: {
          where: { date: getTodayUTC() },
          take: 1,
        },
        _count: {
          select: {
            posts: true,
            comments: true,
            friendships: true,
          },
        },
      },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const isOwnProfile = session.user.id === targetUser.id;
    let relationshipStatus = "NONE"; // NONE, FRIENDS, REQUEST_SENT, REQUEST_RECEIVED, SELF
    let isBlockedByMe = false;
    let hasBlockedMe = false;

    if (isOwnProfile) {
      relationshipStatus = "SELF";
    } else {
      // 1. Check if the target blocked the requester
      const blockedByThem = await prisma.globalBlock.findUnique({
        where: {
          blockerId_blockedId: {
            blockerId: targetUser.id,
            blockedId: session.user.id,
          },
        },
      });
      if (blockedByThem) hasBlockedMe = true;

      // 2. Check if the requester blocked the target
      const blockedByMe = await prisma.globalBlock.findUnique({
        where: {
          blockerId_blockedId: {
            blockerId: session.user.id,
            blockedId: targetUser.id,
          },
        },
      });
      if (blockedByMe) isBlockedByMe = true;

      // 3. Normal friendship checks (only if NO blocks exist)
      if (!isBlockedByMe && !hasBlockedMe) {
        const friendship = await prisma.friendship.findUnique({
          where: {
            userId_friendId: {
              userId: session.user.id,
              friendId: targetUser.id,
            },
          },
        });

        if (friendship) {
          relationshipStatus = "FRIENDS";
        } else {
          // Check pending requests
          const sentRequest = await prisma.friendRequest.findUnique({
            where: {
              senderId_receiverId: {
                senderId: session.user.id,
                receiverId: targetUser.id,
              },
            },
          });
          if (sentRequest && sentRequest.status === "PENDING") {
            relationshipStatus = "REQUEST_SENT";
          } else {
            const receivedRequest = await prisma.friendRequest.findUnique({
              where: {
                senderId_receiverId: {
                  senderId: targetUser.id,
                  receiverId: session.user.id,
                },
              },
            });
            if (receivedRequest && receivedRequest.status === "PENDING") {
              relationshipStatus = "REQUEST_RECEIVED";
            }
          }
        }
      }
    }

    const totalSupports = await prisma.postSupport.count({
      where: { post: { authorId: targetUser.id } },
    });

    const viewerIsAdmin = session.user.role === "ADMIN";
    const shouldFetchGlobalMute = isOwnProfile || viewerIsAdmin;
    const globalMuteRecord = shouldFetchGlobalMute
      ? await prisma.globalMute.findUnique({
          where: { userId: targetUser.id },
          select: { reason: true, expiresAt: true },
        })
      : null;
    const activeGlobalMute =
      globalMuteRecord &&
      (!globalMuteRecord.expiresAt || globalMuteRecord.expiresAt > new Date())
        ? {
            reason: globalMuteRecord.reason,
            expiresAt: globalMuteRecord.expiresAt?.toISOString() ?? null,
          }
        : null;

    const isBlocked = isBlockedByMe || hasBlockedMe;
    const isFriend = relationshipStatus === "FRIENDS";

    // A viewer can see health data for a private profile only if they are a friend.
    // Own profile always passes this check regardless of privacy setting.
    const canViewProfile = isOwnProfile || !targetUser.isPrivate || isFriend;

    // Returns true if the viewer has access to a specific health field.
    // Own profile always returns true - the settings page needs all values.
    const canViewField = (showFlag: boolean) =>
      isOwnProfile || (!isBlocked && showFlag && canViewProfile);

    // Build a friend set from the known friendship status so canViewDailyStatus
    // can apply the private-profile rule without an extra DB query.
    const friendIds = isFriend ? new Set([targetUser.id]) : new Set<string>();

    // Mood ring is hidden when blocked (consistent with image/bio) OR when the
    // target's privacy setting prevents it.
    const showMood =
      !isBlocked && canViewDailyStatus(session.user.id, targetUser, friendIds);

    const effectiveAge = computeEffectiveAge(
      targetUser.age,
      targetUser.birthDate,
      targetUser.autoUpdateAge,
    );

    const profileData = {
      id: targetUser.id,
      name: targetUser.name,
      username: targetUser.username,
      // Scrub images and bio if either party has blocked the other
      image: isBlocked ? null : targetUser.image,
      avatarEmoji: isBlocked ? null : targetUser.avatarEmoji,
      avatarBgColor: isBlocked ? null : targetUser.avatarBgColor,
      headerImage: isBlocked ? null : targetUser.headerImage,
      headerEmoji: isBlocked ? null : targetUser.headerEmoji,
      headerBgColor: isBlocked ? null : targetUser.headerBgColor,
      bio: isBlocked ? null : targetUser.bio,
      isPrivate: targetUser.isPrivate,
      isBlockedByMe,
      hasBlockedMe,
      pinnedPostId: targetUser.pinnedPostId,
      messagingPermission: targetUser.messagingPermission as
        | "ALL"
        | "ONLY_FRIENDS"
        | "NONE",
      createdAt: targetUser.createdAt,
      role: targetUser.role,
      // Null when blocked or when the target's profile is private and the viewer
      // is not a confirmed friend - enforces US2.15.
      currentMood: showMood ? (targetUser.dailyStatuses[0] ?? null) : null,
      // Zero out stats if blocked
      stats: {
        friends: isBlocked ? 0 : targetUser._count.friendships,
        posts: isBlocked ? 0 : targetUser._count.posts,
        comments: isBlocked ? 0 : targetUser._count.comments,
        supports: isBlocked ? 0 : totalSupports,
      },
      relationshipStatus,
      emailVerified: targetUser.emailVerified,
      // Account Fields: sensitive - own profile only
      ...(isOwnProfile && {
        email: targetUser.email,
        gender: targetUser.gender,
        usernameChangedAt: targetUser.usernameChangedAt?.toISOString() ?? null,
      }),
      // Health Fields: conditionally included per visibility rules
      ...(canViewField(targetUser.showAge) && {
        age: effectiveAge,
      }),
      ...(canViewField(targetUser.showConditions) && {
        conditions: targetUser.conditions,
      }),
      ...(canViewField(targetUser.showMedications) && {
        medications: targetUser.medications,
      }),
      ...(canViewField(targetUser.showHeight) && {
        height: targetUser.height,
        heightUnit: targetUser.heightUnit,
      }),
      ...(canViewField(targetUser.showWeight) && {
        weight: targetUser.weight,
        weightUnit: targetUser.weightUnit,
      }),
      // Extended Own-Profile Fields needed by the settings page
      ...(isOwnProfile && {
        birthDate: targetUser.birthDate?.toISOString() ?? null,
        autoUpdateAge: targetUser.autoUpdateAge,
        showConditions: targetUser.showConditions,
        showMedications: targetUser.showMedications,
        showAge: targetUser.showAge,
        showHeight: targetUser.showHeight,
        showWeight: targetUser.showWeight,
      }),
      // Global mute info - only sent to own profile or admins
      ...(shouldFetchGlobalMute && { globalMute: activeGlobalMute }),
    };

    return NextResponse.json({ profile: profileData }, { status: 200 });
  } catch (error) {
    console.error("[Profile Fetch Error]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

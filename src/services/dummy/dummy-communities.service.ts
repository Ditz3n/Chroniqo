// src/services/dummy/dummy-communities.service.ts
import {
  formatAnonymousDisplayName,
  formatAnonymousUsername,
  pickRandomAnonymousIdentity,
} from "@/lib/anonymous-animals";
import { prisma } from "@/lib/prisma";
import { createCommunityConversation } from "@/services/chat.service";
import { CommunityRole, User } from "@prisma/client";
import { DUMMY_COMMUNITIES } from "./data";
import { uploadDummyMedia } from "./dummy-media.service";

export async function generateDummyCommunities(users: User[]) {
  console.log("[Dummy Generator] Generating communities...");
  const createdCommunities = [];

  const owner = users[0];
  const initiator = await prisma.user.findFirst({
    where: { isDummy: false },
    orderBy: { createdAt: "asc" },
  });

  const members = users.filter(
    (u) => u.id !== owner.id && (!initiator || u.id !== initiator.id),
  );

  for (const [index, comm] of DUMMY_COMMUNITIES.entries()) {
    const name = comm.name ?? "";
    const existing = await prisma.community.findUnique({
      where: { name },
    });

    if (existing) {
      createdCommunities.push(existing);

      // Backfill anonymous identities for existing dummy communities.
      // Required if the generator is run multiple times or was run prior to the anonymous feature.
      const existingMembers = await prisma.communityMember.findMany({
        where: { communityId: existing.id },
      });

      for (const member of existingMembers) {
        const { animalName, animalEmoji, bgColor, suffix } =
          pickRandomAnonymousIdentity();
        await prisma.communityAnonymousIdentity.upsert({
          where: {
            userId_communityId: {
              userId: member.userId,
              communityId: existing.id,
            },
          },
          create: {
            userId: member.userId,
            communityId: existing.id,
            displayName: formatAnonymousDisplayName(animalName, suffix),
            username: formatAnonymousUsername(animalName, suffix),
            animalEmoji,
            bgColor,
          },
          update: {},
        });
      }

      continue;
    }

    let avatarUrl: string | null = null;
    let headerUrl: string | null = null;

    if (!comm.avatarEmoji || !comm.avatarBgColor) {
      const sourceUrl =
        comm.customAvatarUrl ||
        `https://picsum.photos/seed/comm${index}/200/200`;
      avatarUrl = await uploadDummyMedia(sourceUrl, `${name}-avatar.jpg`);
    }

    if (!comm.headerEmoji || !comm.headerBgColor) {
      const sourceUrl =
        comm.customHeaderUrl ||
        `https://picsum.photos/seed/commhead${index}/800/300`;
      headerUrl = await uploadDummyMedia(sourceUrl, `${name}-header.jpg`);
    }

    const memberCreates: Array<{
      userId: string;
      role: CommunityRole;
      status: string;
    }> = [];

    // 1. Assign Initiator (Testing Account)
    if (initiator) {
      memberCreates.push({
        userId: initiator.id,
        role: index === 0 ? CommunityRole.OWNER : CommunityRole.USER,
        status: "ACCEPTED",
      });
    }

    // 2. Assign Dummy Owner (users[0])
    memberCreates.push({
      userId: owner.id,
      role: index === 0 && initiator ? CommunityRole.USER : CommunityRole.OWNER,
      status: "ACCEPTED",
    });

    // 3. Add ALL remaining dummy members to ALL communities.
    // This guarantees they have anonymous identities established when the post/comment
    // generators randomly select them to interact anonymously.
    for (let i = 0; i < members.length; i++) {
      memberCreates.push({
        userId: members[i].id,
        role: i % 5 === 0 ? CommunityRole.MODERATOR : CommunityRole.USER,
        status: "ACCEPTED",
      });
    }

    // Stagger createdAt so index 0 (HerniatedDiscs) is the absolute newest
    const staggeredCreatedAt = new Date(Date.now() - index * 1000);

    const community = await prisma.community.create({
      data: {
        name,
        description: comm.description ?? "",
        category: comm.category ?? "",
        image: avatarUrl,
        headerImage: headerUrl,
        avatarEmoji: comm.avatarEmoji ?? null,
        avatarBgColor: comm.avatarBgColor ?? null,
        headerEmoji: comm.headerEmoji ?? null,
        headerBgColor: comm.headerBgColor ?? null,
        rules: comm.rules ?? [],
        isDummy: true,
        createdAt: staggeredCreatedAt,
        members: {
          create: memberCreates,
        },
      },
    });

    createdCommunities.push(community);

    try {
      const communityOwnerId =
        name === "HerniatedDiscs" && initiator ? initiator.id : owner.id;
      await createCommunityConversation(communityOwnerId, community.id);
    } catch (e) {
      console.error("[DummyCommunities] Failed to create community chat:", e);
    }

    const addedUserIds = memberCreates.map((m) => m.userId);
    for (const userId of addedUserIds) {
      const { animalName, animalEmoji, bgColor, suffix } =
        pickRandomAnonymousIdentity();
      await prisma.communityAnonymousIdentity.upsert({
        where: {
          userId_communityId: { userId, communityId: community.id },
        },
        create: {
          userId,
          communityId: community.id,
          displayName: formatAnonymousDisplayName(animalName, suffix),
          username: formatAnonymousUsername(animalName, suffix),
          animalEmoji,
          bgColor,
        },
        update: {},
      });
    }
  }

  return createdCommunities;
}

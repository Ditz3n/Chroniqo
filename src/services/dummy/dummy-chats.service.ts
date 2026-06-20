// src/services/dummy/dummy-chats.service.ts
import { prisma } from "@/lib/prisma";
import { toI18nPayload } from "@/lib/utils/i18n-payload";
import { User } from "@prisma/client";
import { COMMUNITY_CHAT_SCRIPTS } from "./data";
import { uploadDummyMedia } from "./dummy-media.service";

export async function generateDummyChats(adminId: string, dummyUsers: User[]) {
  console.log(
    "[Dummy Generator] Generating directs, groups, and community chats...",
  );
  if (dummyUsers.length < 4) return;

  const admin = await prisma.user.findUnique({ where: { id: adminId } });
  if (!admin) return;

  const u1 = dummyUsers[0]; // Emma
  const u2 = dummyUsers[1]; // Lukas
  const u3 = dummyUsers[2]; // Sarah
  const u4 = dummyUsers[3]; // David

  const baseDate = Date.now();
  const adminName = admin.name || admin.username || "Admin";

  // ==========================================
  // Setup Emma's Moods for the Chat Interactions
  // ==========================================
  const yesterday = new Date(baseDate - 86400000);
  yesterday.setUTCHours(0, 0, 0, 0);

  const emmaYesterdayMood = await prisma.dailyStatus.upsert({
    where: { userId_date: { userId: u1.id, date: yesterday } },
    update: {},
    create: {
      userId: u1.id,
      value: 1,
      note: "Rough day yesterday, completely drained.",
      date: yesterday,
    },
  });

  const today = new Date(baseDate);
  today.setUTCHours(0, 0, 0, 0);

  const emmaTodayMood = await prisma.dailyStatus.upsert({
    where: { userId_date: { userId: u1.id, date: today } },
    update: {},
    create: {
      userId: u1.id,
      value: 3,
      note: "Feeling a bit better today. Need to pace myself.",
      date: today,
    },
  });

  // ==========================================
  // 1. Direct Chats
  // ==========================================

  // Chat 1: Admin & U1 (Emma) - Reacting to moods
  const dChat1 = await prisma.conversation.create({
    data: {
      durationHours: 24,
      expiresAt: new Date(baseDate + 24 * 3600000),
      isDummy: true,
      participants: {
        create: [
          { userId: adminId, status: "ACCEPTED" },
          { userId: u1.id, status: "ACCEPTED" },
        ],
      },
    },
  });
  await prisma.message.create({
    data: {
      conversationId: dChat1.id,
      senderId: adminId,
      isDummy: true,
      isSystem: true,
      messageType: "CHAT_CREATED",
      content: toI18nPayload("chat_system.chat_created_direct", {
        creator: adminName,
        other: u1.name || "User",
      }),
      createdAt: new Date(baseDate - 86400000), // 1 day ago
    },
  });
  const d1m1 = await prisma.message.create({
    data: {
      conversationId: dChat1.id,
      senderId: adminId,
      content: "💛",
      dailyStatusId: emmaYesterdayMood.id,
      isDummy: true,
      createdAt: new Date(baseDate - 20 * 3600000),
    },
  });
  await prisma.message.create({
    data: {
      conversationId: dChat1.id,
      senderId: u1.id,
      content: "Thanks. It was tough, but I got through it.",
      replyToId: d1m1.id,
      isDummy: true,
      createdAt: new Date(baseDate - 18 * 3600000),
    },
  });
  const d1m3 = await prisma.message.create({
    data: {
      conversationId: dChat1.id,
      senderId: adminId,
      content:
        "Glad to see you are feeling a bit better today! Have you been resting?",
      dailyStatusId: emmaTodayMood.id,
      isDummy: true,
      createdAt: new Date(baseDate - 2 * 3600000),
    },
  });
  await prisma.message.create({
    data: {
      conversationId: dChat1.id,
      senderId: u1.id,
      content: "Yes, just taking it easy on the couch. Thanks for checking in!",
      replyToId: d1m3.id,
      isDummy: true,
      createdAt: new Date(baseDate - 3600000),
    },
  });

  // Chat 2: Admin & U2 (Lukas)
  const dChat2 = await prisma.conversation.create({
    data: {
      durationHours: 24,
      expiresAt: new Date(baseDate + 24 * 3600000),
      isDummy: true,
      participants: {
        create: [
          { userId: adminId, status: "ACCEPTED" },
          { userId: u2.id, status: "ACCEPTED" },
        ],
      },
    },
  });
  await prisma.message.create({
    data: {
      conversationId: dChat2.id,
      senderId: adminId,
      isDummy: true,
      isSystem: true,
      messageType: "CHAT_CREATED",
      content: toI18nPayload("chat_system.chat_created_direct", {
        creator: adminName,
        other: u2.name || "User",
      }),
      createdAt: new Date(baseDate - 86400000), // 1 day ago
    },
  });
  await prisma.message.create({
    data: {
      conversationId: dChat2.id,
      senderId: adminId,
      content: "Did you end up going to that appointment?",
      isDummy: true,
      createdAt: new Date(baseDate - 86400000),
    },
  });
  await prisma.message.create({
    data: {
      conversationId: dChat2.id,
      senderId: u2.id,
      content: "Yes! It went really well actually. Thanks for asking.",
      isDummy: true,
      createdAt: new Date(baseDate - 80000000),
    },
  });

  // Chat 3: Admin & U4 (David)
  const dChat3 = await prisma.conversation.create({
    data: {
      durationHours: 24,
      expiresAt: new Date(baseDate + 24 * 3600000),
      isDummy: true,
      participants: {
        create: [
          { userId: adminId, status: "PENDING" },
          { userId: u4.id, status: "ACCEPTED" },
        ],
      },
    },
  });
  await prisma.message.create({
    data: {
      conversationId: dChat3.id,
      senderId: u4.id,
      isDummy: true,
      isSystem: true,
      messageType: "CHAT_CREATED",
      content: toI18nPayload("chat_system.chat_created_direct", {
        creator: u4.name || "User",
        other: adminName,
      }),
      createdAt: new Date(baseDate - 3 * 86400000),
    },
  });
  await prisma.message.create({
    data: {
      conversationId: dChat3.id,
      senderId: u4.id,
      content:
        "Hi there! Saw your post in the community and wanted to connect.",
      isDummy: true,
      createdAt: new Date(baseDate - 5000000),
    },
  });

  // ==========================================
  // 2. Group Chats
  // ==========================================

  const groupImage = await uploadDummyMedia(
    "https://picsum.photos/seed/groupchat1/200/200",
    "dummy-group-1.jpg",
  );
  const gChat1 = await prisma.conversation.create({
    data: {
      name: "Weekend Warriors",
      image: groupImage,
      durationHours: 72,
      expiresAt: new Date(baseDate + 72 * 3600000),
      isDummy: true,
      participants: {
        create: [
          { userId: adminId, status: "ACCEPTED" },
          { userId: u1.id, status: "ACCEPTED" },
          { userId: u2.id, status: "ACCEPTED" },
        ],
      },
    },
  });
  await prisma.message.create({
    data: {
      conversationId: gChat1.id,
      senderId: u1.id,
      isDummy: true,
      isSystem: true,
      messageType: "CHAT_CREATED",
      content: toI18nPayload("chat_system.chat_created_group", {
        creator: u1.name || "User",
        participants: `${adminName}, ${u2.name}`,
      }),
      createdAt: new Date(baseDate - 3 * 86400000), // T-3 days
    },
  });
  await prisma.message.create({
    data: {
      conversationId: gChat1.id,
      senderId: u1.id,
      content: "Ready for the weekend?",
      isDummy: true,
      createdAt: new Date(baseDate - 5000000),
    },
  });

  const gChat2 = await prisma.conversation.create({
    data: {
      name: "Support Squad",
      avatarEmoji: "🦸‍♂️",
      avatarBgColor: "#a8d4f5", // pastel-sky
      durationHours: 72,
      expiresAt: new Date(baseDate + 72 * 3600000),
      isDummy: true,
      participants: {
        create: [
          { userId: adminId, status: "ACCEPTED" },
          { userId: u3.id, status: "ACCEPTED" },
          { userId: u4.id, status: "ACCEPTED" },
        ],
      },
    },
  });
  await prisma.message.create({
    data: {
      conversationId: gChat2.id,
      senderId: adminId,
      isDummy: true,
      isSystem: true,
      messageType: "CHAT_CREATED",
      content: toI18nPayload("chat_system.chat_created_group", {
        creator: adminName,
        participants: `${u3.name}, ${u4.name}`,
      }),
      createdAt: new Date(baseDate - 3 * 86400000),
    },
  });
  const g2m1 = await prisma.message.create({
    data: {
      conversationId: gChat2.id,
      senderId: u3.id,
      content: "Checking in on everyone today!",
      isDummy: true,
      createdAt: new Date(baseDate - 6000000),
    },
  });
  await prisma.messageReaction.create({
    data: { userId: adminId, messageId: g2m1.id, emoji: "❤️" },
  });

  const gChat3 = await prisma.conversation.create({
    data: {
      durationHours: 72,
      expiresAt: new Date(baseDate + 72 * 3600000),
      isDummy: true,
      participants: {
        create: [
          { userId: adminId, status: "ACCEPTED" },
          { userId: u1.id, status: "ACCEPTED" },
          { userId: u3.id, status: "ACCEPTED" },
        ],
      },
    },
  });
  await prisma.message.create({
    data: {
      conversationId: gChat3.id,
      senderId: adminId,
      isDummy: true,
      isSystem: true,
      messageType: "CHAT_CREATED",
      content: toI18nPayload("chat_system.chat_created_group", {
        creator: adminName,
        participants: `${u1.name}, ${u3.name}`,
      }),
      createdAt: new Date(baseDate - 3 * 86400000),
    },
  });
  await prisma.message.create({
    data: {
      conversationId: gChat3.id,
      senderId: adminId,
      content: "I created this group so we can coordinate.",
      isDummy: true,
      createdAt: new Date(baseDate - 7000000),
    },
  });

  const allCommunities = await prisma.community.findMany({
    include: {
      conversation: { select: { id: true } },
      members: {
        where: { status: "ACCEPTED" },
        include: { user: { select: { name: true, username: true } } },
      },
    },
  });

  // Discriminated union typing for event timeline
  type TimelineEvent =
    | { type: "JOIN"; member: (typeof allCommunities)[0]["members"][0] }
    | { type: "MSG"; msg: { content: string; anon: boolean } };

  for (const comm of allCommunities) {
    if (!comm.conversation?.id) continue;
    const convId = comm.conversation.id;

    const chatMembers = comm.members;
    // Find the community creator (Owner) so we don't dispatch a "joined" message for them
    const creatorId =
      chatMembers.find((m) => m.role === "OWNER")?.userId || adminId;

    // To allow the initiator to test joining a chat later, we explicitly skip adding them
    // to the conversation for certain communities (e.g. ChronicFatigue, PainSupport)
    const excludeInitiator =
      comm.name === "ChronicFatigue" || comm.name === "PainSupport";

    const otherMembers = chatMembers.filter((m) => {
      if (m.userId === creatorId) return false;
      if (excludeInitiator && m.userId === adminId) return false;
      return true;
    });

    // T - 7 days for the initial creation message
    const creationTime = new Date(baseDate - 7 * 24 * 3600 * 1000);
    await prisma.message.updateMany({
      where: { conversationId: convId, messageType: "COMMUNITY_CHAT_CREATED" },
      data: { createdAt: creationTime },
    });

    const messagesToCreate = COMMUNITY_CHAT_SCRIPTS[comm.name] || [
      { content: `Welcome to ${comm.name}!`, anon: false },
      { content: `Glad to be here.`, anon: true },
    ];

    // Combine Joins and Messages into a single alternating array
    const timelineEvents: TimelineEvent[] = [];
    const maxLength = Math.max(otherMembers.length, messagesToCreate.length);
    for (let i = 0; i < maxLength; i++) {
      if (i < otherMembers.length)
        timelineEvents.push({ type: "JOIN", member: otherMembers[i] });
      if (i < messagesToCreate.length)
        timelineEvents.push({ type: "MSG", msg: messagesToCreate[i] });
    }

    // Spread the events over the last 6.5 days
    let timeOffset = 6.5 * 24 * 3600 * 1000;
    const timeStep = timeOffset / Math.max(timelineEvents.length, 1);

    const activeIds = chatMembers
      .filter((m) => !excludeInitiator || m.userId !== adminId)
      .map((m) => m.userId);

    const fallbackId = chatMembers[0]?.userId || adminId;

    for (let i = 0; i < timelineEvents.length; i++) {
      const ev = timelineEvents[i];
      const eventTime = new Date(baseDate - timeOffset);

      if (ev.type === "JOIN") {
        const member = ev.member;

        await prisma.conversationParticipant.upsert({
          where: {
            userId_conversationId: {
              userId: member.userId,
              conversationId: convId,
            },
          },
          update: {},
          create: {
            userId: member.userId,
            conversationId: convId,
            status: "ACCEPTED",
          },
        });

        await prisma.message.create({
          data: {
            conversationId: convId,
            senderId: member.userId,
            content: toI18nPayload("chat_system.user_joined_community_chat", {
              user: member.user.name || member.user.username || "Unknown",
            }),
            isSystem: true,
            messageType: "USER_JOINED",
            isDummy: true,
            createdAt: eventTime,
          },
        });
      } else if (ev.type === "MSG") {
        const senderId =
          activeIds.length > 0 ? activeIds[i % activeIds.length] : fallbackId;

        const msgRecord = await prisma.message.create({
          data: {
            conversationId: convId,
            senderId: senderId,
            content: ev.msg.content,
            isAnonymous: ev.msg.anon,
            isDummy: true,
            createdAt: eventTime,
          },
        });

        // Add an occasional reaction
        if (i % 3 === 0) {
          const reactorId =
            activeIds.length > 0
              ? activeIds[(i + 1) % activeIds.length]
              : fallbackId;

          await prisma.messageReaction.create({
            data: { userId: reactorId, messageId: msgRecord.id, emoji: "❤️" },
          });
        }
      }

      timeOffset -= timeStep;
    }
  }
}

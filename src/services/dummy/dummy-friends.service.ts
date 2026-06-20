// src/services/dummy/dummy-friends.service.ts
import { prisma } from "@/lib/prisma";
import { User } from "@prisma/client";

export async function generateDummyFriends(adminId: string, users: User[]) {
  console.log("[Dummy Generator] Generating friendships and requests...");
  if (users.length < 5) return;

  // Initiator explicitly gets 3 friends
  const friends = [users[0], users[1], users[2]];
  const incomingUser = users[3];
  const outgoingUser = users[4];

  // 1. Friendships
  for (const friend of friends) {
    await prisma.friendship.createMany({
      data: [
        { userId: adminId, friendId: friend.id },
        { userId: friend.id, friendId: adminId },
      ],
      skipDuplicates: true,
    });
  }

  // 2. Incoming Request: incomingUser -> Initiator
  await prisma.friendRequest.upsert({
    where: {
      senderId_receiverId: { senderId: incomingUser.id, receiverId: adminId },
    },
    update: { status: "PENDING" },
    create: {
      senderId: incomingUser.id,
      receiverId: adminId,
      status: "PENDING",
    },
  });

  // 3. Sent Request: Initiator -> outgoingUser
  await prisma.friendRequest.upsert({
    where: {
      senderId_receiverId: { senderId: adminId, receiverId: outgoingUser.id },
    },
    update: { status: "PENDING" },
    create: {
      senderId: adminId,
      receiverId: outgoingUser.id,
      status: "PENDING",
    },
  });
}

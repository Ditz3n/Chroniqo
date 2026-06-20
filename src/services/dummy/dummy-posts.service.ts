// src/services/dummy/dummy-posts.service.ts
import { prisma } from "@/lib/prisma";
import { Community, Prisma, User } from "@prisma/client";
import { DUMMY_POST_DEFINITIONS } from "./data";

export async function generateDummyPosts(
  users: User[],
  communities: Community[],
) {
  console.log("[Dummy Generator] Generating unique mapped posts...");

  const initiator = await prisma.user.findFirst({
    where: { isDummy: false },
    orderBy: { createdAt: "asc" },
  });

  const posts = [];

  for (const def of DUMMY_POST_DEFINITIONS) {
    // Resolve the author ID (either the initiator or a specific dummy user)
    const authorId =
      def.authorIndex === "initiator"
        ? initiator?.id || users[0].id // Fallback if initiator somehow missing
        : users[def.authorIndex as number]?.id || users[0].id;

    const post = await prisma.post.create({
      data: {
        title: def.title,
        type: def.type,
        content: def.content ?? null,
        authorId,
        communityId:
          def.communityIndex !== null
            ? communities[def.communityIndex].id
            : null,
        isAnonymous: def.isAnonymous || false,
        isDummy: true,
        ...(def.metadata
          ? { metadata: def.metadata as Prisma.InputJsonValue }
          : {}),
      },
    });

    posts.push(post);

    // Add varied support counts per post (1 to 4 supports)
    const supportCount = Math.floor(Math.random() * 4) + 1;
    const supporters = [...users]
      .sort(() => 0.5 - Math.random())
      .slice(0, supportCount);

    for (const supporter of supporters) {
      await prisma.postSupport.create({
        data: {
          postId: post.id,
          userId: supporter.id,
        },
      });
    }
  }

  return posts;
}

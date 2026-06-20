// src/services/dummy/dummy-comments.service.ts
import { prisma } from "@/lib/prisma";
import { Post, User } from "@prisma/client";

export async function generateDummyComments(users: User[], posts: Post[]) {
  console.log("[Dummy Generator] Generating unique comments and replies...");

  if (posts.length === 0 || users.length < 3) return;

  for (let i = 0; i < posts.length; i++) {
    const post = posts[i];

    // Pick 3 random users to interact with this post
    const shuffledUsers = [...users].sort(() => 0.5 - Math.random());
    const commenter1 = shuffledUsers[0];
    const commenter2 = shuffledUsers[1];
    const replier = shuffledUsers[2];

    // Build context-aware comment based on the post title
    // e.g., "MRI results and next steps" -> "next steps"
    const words = post.title.split(" ");
    const topicWord = words
      .slice(Math.max(words.length - 2, 0))
      .join(" ")
      .replace(/[^a-zA-Z ]/g, "");

    const rootContent =
      post.type === "poll"
        ? `I voted! This is a really interesting question regarding ${topicWord}.`
        : `Thanks for sharing this post about ${topicWord}. I've experienced something very similar recently.`;

    // 1. Create a root comment
    const rootComment = await prisma.comment.create({
      data: {
        content: rootContent,
        authorId: commenter1.id,
        postId: post.id,
        // Allow anonymous comments only in communities (not on profile posts)
        isAnonymous: post.communityId !== null && Math.random() > 0.5,
        isDummy: true,
        createdAt: new Date(Date.now() - 86400000), // 1 day ago
      },
    });

    // Support the root comment
    await prisma.commentSupport.create({
      data: { userId: commenter2.id, commentId: rootComment.id },
    });

    // 2. Create a reply to the root comment
    await prisma.comment.create({
      data: {
        content: `I completely agree with you. It's tough, but sharing experiences like this helps us all.`,
        authorId: replier.id,
        postId: post.id,
        parentId: rootComment.id,
        isAnonymous: post.communityId !== null && Math.random() > 0.5,
        isDummy: true,
        createdAt: new Date(Date.now() - 43200000), // 12 hours ago
      },
    });

    // 3. Create a secondary root comment
    await prisma.comment.create({
      data: {
        content: `Does anyone else have additional advice on this topic? I'm currently looking into alternative options.`,
        authorId: commenter2.id,
        postId: post.id,
        isAnonymous: false,
        isDummy: true,
        createdAt: new Date(Date.now() - 21600000), // 6 hours ago
      },
    });

    // 4. Create a softly deleted comment (simulate moderation or user self-deletion)
    // Only do this on every 3rd post to avoid cluttering the UI too much
    if (i % 3 === 0) {
      await prisma.comment.create({
        data: {
          content: "This content was removed.",
          authorId: commenter1.id,
          postId: post.id,
          isAnonymous: false,
          isDummy: true,
          deletedAt: new Date(Date.now() - 3600000), // 1 hour ago
        },
      });
    }
  }
}

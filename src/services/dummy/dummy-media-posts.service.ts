// src/services/dummy/dummy-media-posts.service.ts
import { prisma } from "@/lib/prisma";
import { Community, User } from "@prisma/client";
import { uploadDummyMedia } from "./dummy-media.service";

export async function generateDummyMediaPosts(
  users: User[],
  communities: Community[],
) {
  console.log("[Dummy Generator] Generating media posts...");
  if (users.length < 5 || communities.length < 2) return [];

  const posts = [];

  // Give the image post to the initiator for better testing
  const initiator = await prisma.user.findFirst({
    where: { isDummy: false },
    orderBy: { createdAt: "asc" },
  });

  const author1 = initiator || users[3];
  const community1 = communities[0]; // HerniatedDiscs

  // Fetch a realistic nature walk image instead of a completely random seed
  const imageUrl = await uploadDummyMedia(
    "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?q=80&w=800&auto=format&fit=crop",
    "dummy-post-image.jpg",
  );

  // 1. Image Post
  const imgPost = await prisma.post.create({
    data: {
      title: "A beautiful view from my walk today",
      type: "image",
      authorId: author1.id,
      communityId: community1.id,
      isDummy: true,
      metadata: {
        images: [imageUrl],
      },
    },
  });
  posts.push(imgPost);

  // 2. Video Post (Uses real MP4 and static thumbnail)
  const thumbUrl = await uploadDummyMedia(
    "https://picsum.photos/seed/postvid/800/600",
    "dummy-video-thumb.jpg",
  );

  // Using a fast, public domain 10s W3C sample video
  const videoUrl = await uploadDummyMedia(
    "https://www.w3schools.com/html/mov_bbb.mp4",
    "dummy-video.mp4",
  );

  const vidPost = await prisma.post.create({
    data: {
      title: "Short update video",
      type: "video",
      authorId: users[4].id,
      communityId: communities[1].id,
      isDummy: true,
      metadata: {
        videoUrl,
        thumbnailUrl: thumbUrl,
        duration: 10, // Big Buck Bunny sample is exactly 10s
      },
    },
  });
  posts.push(vidPost);

  return posts;
}

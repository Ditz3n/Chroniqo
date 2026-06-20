// src/services/dummy/dummy-create.service.ts
import { generateDummyChats } from "@/services/dummy/dummy-chats.service";
import { generateDummyComments } from "@/services/dummy/dummy-comments.service";
import { generateDummyCommunities } from "@/services/dummy/dummy-communities.service";
import { generateDummyFriends } from "@/services/dummy/dummy-friends.service";
import { generateDummyMediaPosts } from "@/services/dummy/dummy-media-posts.service";
import { generateDummyPosts } from "@/services/dummy/dummy-posts.service";
import { generateDummyReports } from "@/services/dummy/dummy-reports.service";
import { generateDummyUsers } from "@/services/dummy/dummy-users.service";

import { GenStep } from "@/types/app-types";

export async function createDummyData(
  adminId: string,
  updateStep: (
    steps: GenStep[],
    stepId: string,
    status: GenStep["status"],
    errorMsg?: string,
  ) => Promise<GenStep[]>,
  currentSteps: GenStep[],
) {
  currentSteps = await updateStep(currentSteps, "users", "loading");
  const users = await generateDummyUsers();
  currentSteps = await updateStep(currentSteps, "users", "done");

  currentSteps = await updateStep(currentSteps, "friends", "loading");
  await generateDummyFriends(adminId, users);
  currentSteps = await updateStep(currentSteps, "friends", "done");

  currentSteps = await updateStep(currentSteps, "communities", "loading");
  const communities = await generateDummyCommunities(users);
  currentSteps = await updateStep(currentSteps, "communities", "done");

  currentSteps = await updateStep(currentSteps, "posts", "loading");
  const textPosts = await generateDummyPosts(users, communities);
  const mediaPosts = await generateDummyMediaPosts(users, communities);
  const allPosts = [...textPosts, ...mediaPosts];
  currentSteps = await updateStep(currentSteps, "posts", "done");

  currentSteps = await updateStep(currentSteps, "comments", "loading");
  await generateDummyComments(users, allPosts);
  currentSteps = await updateStep(currentSteps, "comments", "done");

  currentSteps = await updateStep(currentSteps, "chats", "loading");
  await generateDummyChats(adminId, users);
  currentSteps = await updateStep(currentSteps, "chats", "done");

  currentSteps = await updateStep(currentSteps, "reports", "loading");
  await generateDummyReports(users, communities, allPosts);
  await updateStep(currentSteps, "reports", "done");

  return currentSteps;
}

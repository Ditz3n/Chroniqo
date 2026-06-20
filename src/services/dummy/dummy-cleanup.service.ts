// src/services/dummy/dummy-cleanup.service.ts
import { prisma } from "@/lib/prisma";
import { GenStep } from "@/types/app-types";
import { del, list } from "@vercel/blob";

export async function cleanupDummyData(
  updateStep?: (
    steps: GenStep[],
    stepId: string,
    status: GenStep["status"],
    errorMsg?: string,
  ) => Promise<GenStep[]>,
  currentSteps?: GenStep[],
) {
  console.log("[Dummy Generator] Cleaning up existing dummy data...");

  if (updateStep && currentSteps) {
    currentSteps = await updateStep(currentSteps, "cleanup", "loading");
  }

  // 1. Clean up blob storage (dummy media)
  try {
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      console.log("[Dummy Generator] Cleaning up blob storage...");
      let cursor: string | undefined;
      do {
        const listResult = await list({
          prefix: "dummy/",
          cursor,
          limit: 1000,
        });
        if (listResult.blobs.length > 0) {
          await del(listResult.blobs.map((b) => b.url));
        }
        cursor = listResult.cursor;
      } while (cursor);
    } else {
      console.log(
        "[Dummy Generator] Skipping blob cleanup (no BLOB_READ_WRITE_TOKEN)",
      );
    }
  } catch (error) {
    console.error("[Dummy Generator] Failed to clean up blob storage:", error);
  }

  // 2. Database cleanup
  await prisma.report.deleteMany({ where: { isDummy: true } });
  await prisma.message.deleteMany({ where: { isDummy: true } });
  await prisma.conversation.deleteMany({ where: { isDummy: true } });
  await prisma.comment.deleteMany({ where: { isDummy: true } });
  await prisma.post.deleteMany({ where: { isDummy: true } });
  await prisma.community.deleteMany({ where: { isDummy: true } });
  await prisma.globalBan.deleteMany({ where: { isDummy: true } });

  await prisma.user.deleteMany({ where: { isDummy: true } });

  if (updateStep && currentSteps) {
    return await updateStep(currentSteps, "cleanup", "done");
  }
}

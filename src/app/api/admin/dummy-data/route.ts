// src/app/api/admin/dummy-data/route.ts
import { auth } from "@/auth";
import { redis } from "@/lib/upstash";
import { cleanupDummyData } from "@/services/dummy/dummy-cleanup.service";
import { createDummyData } from "@/services/dummy/dummy-create.service";
import { GenStep } from "@/types/app-types";
import { after, NextResponse } from "next/server";

// Force Next.js to never cache this route, ensuring live progress updates in the UI
export const dynamic = "force-dynamic";

const LOCK_KEY = "dummy_gen_lock";
const PROGRESS_KEY = "dummy_gen_progress";

const INITIAL_STEPS: GenStep[] = [
  { id: "cleanup", status: "pending" },
  { id: "users", status: "pending" },
  { id: "friends", status: "pending" },
  { id: "communities", status: "pending" },
  { id: "posts", status: "pending" },
  { id: "comments", status: "pending" },
  { id: "chats", status: "pending" },
  { id: "reports", status: "pending" },
];

async function updateStep(
  steps: GenStep[],
  stepId: string,
  status: GenStep["status"],
  errorMsg?: string,
) {
  const updated = steps.map((s) =>
    s.id === stepId ? { ...s, status, error: errorMsg } : s,
  );
  await redis.set(PROGRESS_KEY, JSON.stringify(updated));
  return updated;
}

export async function POST() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const existingLock = await redis.get(LOCK_KEY);
    if (existingLock) {
      return NextResponse.json({ error: "Rate limit active" }, { status: 429 });
    }

    await redis.set(
      LOCK_KEY,
      JSON.stringify({
        adminName: session.user.name || session.user.username,
        adminUsername: session.user.username,
        timestamp: Date.now(),
      }),
      { ex: 86400 },
    );

    await redis.set(PROGRESS_KEY, JSON.stringify(INITIAL_STEPS));

    // Run background generation safely in Vercel Serverless environment
    after(() => {
      runDummyGeneration(session.user.id).catch(console.error);
    });

    return NextResponse.json({ status: "started" }, { status: 202 });
  } catch (error) {
    console.error("[Dummy Orchestrator] Failed to start:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function GET() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const [lockData, progressData] = await Promise.all([
    redis.get(LOCK_KEY),
    redis.get(PROGRESS_KEY),
  ]);

  return NextResponse.json({
    isLocked: !!lockData,
    lockData: typeof lockData === "string" ? JSON.parse(lockData) : lockData,
    steps:
      typeof progressData === "string"
        ? JSON.parse(progressData)
        : progressData || null,
  });
}

async function runDummyGeneration(adminId: string) {
  let currentSteps = [...INITIAL_STEPS];
  try {
    currentSteps =
      (await cleanupDummyData(updateStep, currentSteps)) || currentSteps;

    currentSteps = await createDummyData(adminId, updateStep, currentSteps);

    console.log("[Dummy Generator] Generation complete!");

    setTimeout(() => redis.del(PROGRESS_KEY), 15000);
  } catch (error) {
    console.error("[Dummy Orchestrator] Execution failed:", error);
    const failedStep = currentSteps.find((s) => s.status === "loading");
    if (failedStep) {
      // Attach the error message to the failed step
      const msg = error instanceof Error ? error.message : String(error);
      await updateStep(currentSteps, failedStep.id, "error", msg);
    }
    // Delete the lock immediately so the admin can try again
    await redis.del(LOCK_KEY);
  }
}

// src/app/api/auth/session-check/route.ts
import { auth } from "@/auth";
import { redis } from "@/lib/upstash";
import { NextResponse } from "next/server";

// Reads two Redis keys - no database involved.
// Fails open on transient Redis errors so a connectivity blip never signs users out.
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { valid: false, banned: false, deleted: false },
        { status: 401 },
      );
    }

    const [banFlag, deletionFlag] = await Promise.all([
      redis.get(`banned:${session.user.id}`),
      redis.get(`deleted:${session.user.id}`),
    ]);

    return NextResponse.json({
      valid: !banFlag && !deletionFlag,
      banned: Boolean(banFlag),
      deleted: Boolean(deletionFlag),
    });
  } catch {
    // Fail open - transient Redis error should never result in a forced sign-out
    return NextResponse.json({ valid: true, banned: false, deleted: false });
  }
}

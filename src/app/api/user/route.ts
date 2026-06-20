// src/app/api/user/route.ts
import { auth } from "@/auth";
import { BAN_FLAG_TTL_SECONDS } from "@/lib/constants";
import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/upstash";
import { deleteUser } from "@/services/auth.service";
import { NextResponse } from "next/server";
import { z } from "zod";

const deleteSchema = z.object({
  token: z.string().min(1).optional(),
});

export async function DELETE(request: Request) {
  try {
    let userId: string | undefined;

    // Accept either a session or a valid deletion token as proof of identity
    const body = await request.json().catch(() => ({}));
    const parsed = deleteSchema.safeParse(body);
    const token = parsed.success ? parsed.data.token : undefined;

    if (token) {
      const record = await prisma.accountDeletionToken.findUnique({
        where: { token },
      });

      if (!record) {
        return NextResponse.json({ error: "Invalid token" }, { status: 401 });
      }
      if (new Date(record.expires) < new Date()) {
        return NextResponse.json(
          { error: "Token has expired" },
          { status: 401 },
        );
      }

      userId = record.userId ?? undefined;
    } else {
      const session = await auth();
      userId = session?.user?.id;
    }

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await deleteUser(userId);

    console.log(`[Delete User] Successfully deleted user ${userId}`);

    // Set a short-lived Redis flag so other active sessions detect the deletion
    await redis.set(`deleted:${userId}`, "1", { ex: BAN_FLAG_TTL_SECONDS });
    console.log(`[Delete User] Redis deletion flag set for ${userId}`);

    return NextResponse.json(
      { message: "Account and all associated data deleted successfully" },
      { status: 200 },
    );
  } catch (error: unknown) {
    console.error("[Delete User API Error]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

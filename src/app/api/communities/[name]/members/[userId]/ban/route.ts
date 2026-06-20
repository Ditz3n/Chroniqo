// src/app/api/communities/[name]/members/[userId]/ban/route.ts
import { auth } from "@/auth";
import { banMember, unbanMember } from "@/services/community.service";
import { NextResponse } from "next/server";
import { z } from "zod";

const banSchema = z.object({
  durationHours: z.number().nullable(),
  reason: z.string().nullable(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ name: string; userId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { name, userId } = await params;
    const body = await request.json();
    const parsed = banSchema.safeParse(body);

    if (!parsed.success)
      return NextResponse.json({ error: "Invalid data" }, { status: 400 });

    await banMember(
      name,
      userId,
      session.user.id,
      parsed.data.durationHours,
      parsed.data.reason,
    );

    return NextResponse.json(
      { message: "User banned successfully" },
      { status: 200 },
    );
  } catch (error: unknown) {
    const msg =
      error instanceof Error ? error.message : "Internal server error";
    const status = msg.includes("Unauthorized")
      ? 403
      : msg.includes("not found")
        ? 404
        : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ name: string; userId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { name, userId } = await params;
    await unbanMember(name, userId, session.user.id);

    return NextResponse.json(
      { message: "User unbanned successfully" },
      { status: 200 },
    );
  } catch (error: unknown) {
    const msg =
      error instanceof Error ? error.message : "Internal server error";
    const status = msg.includes("Unauthorized")
      ? 403
      : msg.includes("not found")
        ? 404
        : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

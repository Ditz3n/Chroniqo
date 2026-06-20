// src/app/api/communities/[name]/members/[userId]/mute/route.ts
import { auth } from "@/auth";
import { muteMember, unmuteMember } from "@/services/community.service";
import { NextResponse } from "next/server";
import { z } from "zod";

const muteSchema = z.object({
  durationHours: z.number().nullable().optional().default(null),
  reason: z.string().nullable().optional().default(null),
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
    let body = {};
    try {
      body = await request.json();
    } catch {
      /* empty body is fine */
    }
    const parsed = muteSchema.safeParse(body);

    if (!parsed.success)
      return NextResponse.json({ error: "Invalid data" }, { status: 400 });

    await muteMember(
      name,
      userId,
      session.user.id,
      parsed.data.durationHours,
      parsed.data.reason,
    );

    return NextResponse.json(
      { message: "User muted successfully" },
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
    await unmuteMember(name, userId, session.user.id);

    return NextResponse.json(
      { message: "User unmuted successfully" },
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

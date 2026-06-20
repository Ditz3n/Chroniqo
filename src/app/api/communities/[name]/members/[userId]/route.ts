// src/app/api/communities/[name]/members/[userId]/route.ts
import { auth } from "@/auth";
import { kickMember, updateMemberRole } from "@/services/community.service";
import { NextResponse } from "next/server";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ name: string; userId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name, userId } = await params;
    const body = await request.json();
    const { role } = body;

    if (!role || !["USER", "MODERATOR", "ADMIN", "OWNER"].includes(role)) {
      return NextResponse.json(
        { error: "Invalid role provided" },
        { status: 400 },
      );
    }

    await updateMemberRole(name, userId, role, session.user.id);

    return NextResponse.json(
      { message: "Role updated successfully" },
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
  request: Request,
  { params }: { params: Promise<{ name: string; userId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name, userId } = await params;

    // Parse URL params for potential transferToUserId
    const url = new URL(request.url);
    const transferToUserId =
      url.searchParams.get("transferToUserId") || undefined;
    let reason: string | null = null;
    try {
      const body = (await request.json()) as { reason?: string };
      if (typeof body?.reason === "string" && body.reason.trim()) {
        reason = body.reason.trim();
      }
    } catch {
      // Ignore empty or invalid request body for callers that do not send one.
    }

    await kickMember(name, userId, session.user.id, transferToUserId, reason);

    return NextResponse.json(
      { message: "Member kicked successfully" },
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

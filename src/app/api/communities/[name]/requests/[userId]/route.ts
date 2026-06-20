// src/app/api/communities/[name]/requests/[userId]/route.ts
import { auth } from "@/auth";
import { ForbiddenError } from "@/lib/errors/http-errors";
import { respondToMembershipRequest } from "@/services/community.service";
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
    const action = body.action as "ACCEPT" | "REJECT";

    if (action !== "ACCEPT" && action !== "REJECT") {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    await respondToMembershipRequest(name, userId, session.user.id, action);
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: unknown) {
    const msg =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json(
      { error: msg },
      { status: error instanceof ForbiddenError ? 403 : 400 },
    );
  }
}

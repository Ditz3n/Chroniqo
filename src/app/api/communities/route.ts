// src/app/api/communities/route.ts
import { auth } from "@/auth";
import { createCommunitySchema } from "@/lib/dtos/community.dto";
import { createCommunityConversation } from "@/services/chat.service";
import {
  createCommunity,
  getCommunitiesOverview,
} from "@/services/community.service";
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await getCommunitiesOverview(session.user.id);

    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error("[Communities GET Error]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsedData = createCommunitySchema.safeParse(body);

    if (!parsedData.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsedData.error.issues },
        { status: 400 },
      );
    }

    const community = await createCommunity(session.user.id, parsedData.data);

    // Auto-create the community chat. The creator is automatically a participant.
    // Non-fatal: log and continue if this fails so community creation still succeeds.
    try {
      await createCommunityConversation(session.user.id, community.id);
    } catch (chatError) {
      console.error(
        "[Communities POST] Failed to create community chat:",
        chatError,
      );
    }

    return NextResponse.json(
      { message: "Community created successfully", community },
      { status: 201 },
    );
  } catch (error: unknown) {
    console.error("[Communities POST Error]:", error);
    if (
      error instanceof Error &&
      error.message === "Community name is already taken"
    ) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    if (
      error instanceof Error &&
      error.message === "Authenticated user not found"
    ) {
      return NextResponse.json(
        { error: "Session is invalid. Please sign in again." },
        { status: 401 },
      );
    }
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2003"
    ) {
      return NextResponse.json(
        { error: "Session is invalid. Please sign in again." },
        { status: 401 },
      );
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

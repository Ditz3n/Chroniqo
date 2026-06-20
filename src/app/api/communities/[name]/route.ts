// src/app/api/communities/[name]/route.ts
import { auth } from "@/auth";
import { updateCommunitySchema } from "@/lib/dtos/community.dto";
import {
  deleteCommunity,
  getCommunityByName,
  updateCommunity,
} from "@/services/community.service";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ name: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name } = await params;
    const community = await getCommunityByName(
      name,
      session.user.id,
      session.user.role,
    );

    return NextResponse.json({ community }, { status: 200 });
  } catch (error: unknown) {
    const msg =
      error instanceof Error ? error.message : "Internal server error";
    const status = msg.includes("not found")
      ? 404
      : msg.includes("inactive")
        ? 403
        : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ name: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name } = await params;
    const body = await request.json();

    const parsedData = updateCommunitySchema.safeParse(body);
    if (!parsedData.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsedData.error.issues },
        { status: 400 },
      );
    }

    const updated = await updateCommunity(
      name,
      session.user.id,
      parsedData.data,
    );
    return NextResponse.json(
      { message: "Community updated", community: updated },
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
  { params }: { params: Promise<{ name: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name } = await params;
    await deleteCommunity(name, session.user.id);

    return NextResponse.json({ message: "Community deleted" }, { status: 200 });
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

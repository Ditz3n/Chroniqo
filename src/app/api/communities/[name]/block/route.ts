// src/app/api/communities/[name]/block/route.ts
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ name: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name } = await params;
    const community = await prisma.community.findUnique({
      where: { name: decodeURIComponent(name) },
    });

    if (!community) {
      return NextResponse.json(
        { error: "Community not found" },
        { status: 404 },
      );
    }

    // Check if the user is an OWNER. If so, they must transfer ownership before blocking/leaving.
    const existingMember = await prisma.communityMember.findUnique({
      where: {
        userId_communityId: {
          userId: session.user.id,
          communityId: community.id,
        },
      },
    });

    if (existingMember?.role === "OWNER") {
      const memberCount = await prisma.communityMember.count({
        where: { communityId: community.id },
      });

      if (memberCount > 1) {
        return NextResponse.json(
          { error: "Transfer ownership before blocking the community." },
          { status: 400 },
        );
      }
    }

    await prisma.$transaction(async (tx) => {
      // Ensure block is the single personal visibility state.
      await tx.hiddenCommunity.deleteMany({
        where: {
          userId: session.user.id,
          communityId: community.id,
        },
      });

      // 1. Create the block
      await tx.blockedCommunity.upsert({
        where: {
          userId_communityId: {
            userId: session.user.id,
            communityId: community.id,
          },
        },
        update: {},
        create: {
          userId: session.user.id,
          communityId: community.id,
        },
      });

      // 2. Remove the user from the community if they are a member
      if (existingMember) {
        if (existingMember.role === "OWNER") {
          // If they were the only member (checked above), delete the community entirely
          await tx.community.delete({ where: { id: community.id } });
        } else {
          await tx.communityMember.delete({
            where: {
              userId_communityId: {
                userId: session.user.id,
                communityId: community.id,
              },
            },
          });
        }
      }
    });

    return NextResponse.json({ blocked: true }, { status: 200 });
  } catch (error) {
    console.error("[Community Block POST Error]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
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
    const community = await prisma.community.findUnique({
      where: { name: decodeURIComponent(name) },
    });

    if (!community) {
      return NextResponse.json(
        { error: "Community not found" },
        { status: 404 },
      );
    }

    await prisma.blockedCommunity.delete({
      where: {
        userId_communityId: {
          userId: session.user.id,
          communityId: community.id,
        },
      },
    });

    return NextResponse.json({ blocked: false }, { status: 200 });
  } catch (error) {
    console.error("[Community Block DELETE Error]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// src/app/api/posts/[id]/vote/route.ts
import { auth } from "@/auth";
import { pollVoteSchema } from "@/lib/dtos/post.dto";
import { prisma } from "@/lib/prisma";
import { toPostMetadata } from "@/lib/utils/post-helpers";
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { optionId } = pollVoteSchema.parse(body);

    // Run in a transaction to ensure atomicity
    await prisma.$transaction(async (tx) => {
      const post = await tx.post.findUnique({ where: { id } });
      if (!post) throw new Error("Post not found");
      if (post.type !== "poll") throw new Error("Not a poll");

      const meta = toPostMetadata(post.metadata);
      const voters =
        meta.voters &&
        typeof meta.voters === "object" &&
        !Array.isArray(meta.voters)
          ? meta.voters
          : {};

      if (voters[session.user.id]) {
        throw new Error("Already voted");
      }
      if (
        typeof meta.closesAt === "string" &&
        new Date(meta.closesAt).getTime() < Date.now()
      ) {
        throw new Error("Poll is closed");
      }

      // Add vote
      voters[session.user.id] = optionId;
      meta.voters = voters;
      meta.totalVotes =
        (typeof meta.totalVotes === "number" ? meta.totalVotes : 0) + 1;

      const options = Array.isArray(meta.options) ? [...meta.options] : [];
      meta.options = options;

      // Increment specific option
      const opt = options.find((o) => o.id === optionId);
      if (opt) {
        opt.votes = (typeof opt.votes === "number" ? opt.votes : 0) + 1;
      }

      await tx.post.update({
        where: { id },
        data: { metadata: meta as Prisma.InputJsonValue },
      });
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Internal error";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

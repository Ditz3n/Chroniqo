// src/app/api/comments/[id]/action/route.ts
import { auth } from "@/auth";
import { commentActionSchema } from "@/lib/dtos/comment.dto";
import { handleCommentAction } from "@/services/comment.service";
import { NextResponse } from "next/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const body = await request.json();

    const parsedData = commentActionSchema.safeParse(body);
    if (!parsedData.success) {
      return NextResponse.json({ error: "Validation failed" }, { status: 400 });
    }

    const result = await handleCommentAction(
      session.user.id,
      id,
      parsedData.data.action,
    );
    return NextResponse.json(result, { status: 200 });
  } catch (error: unknown) {
    const msg =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json(
      { error: msg },
      { status: msg === "Unauthorized" ? 403 : 500 },
    );
  }
}

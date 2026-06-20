// src/app/api/drafts/route.ts
import { auth } from "@/auth";
import { saveDraftSchema } from "@/lib/dtos/post.dto";
import { getUserDrafts, saveDraft } from "@/services/post.service";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const drafts = await getUserDrafts(session.user.id);
    return NextResponse.json({ drafts }, { status: 200 });
  } catch (error: unknown) {
    console.error("[Drafts GET Error]:", error);
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
    const parsedData = saveDraftSchema.safeParse(body);

    if (!parsedData.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsedData.error.issues },
        { status: 400 },
      );
    }

    const draft = await saveDraft(session.user.id, parsedData.data);

    return NextResponse.json(
      { message: "Draft saved successfully", draft },
      { status: 200 },
    );
  } catch (error: unknown) {
    console.error("[Drafts POST Error]:", error);
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

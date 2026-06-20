// src/app/api/conversations/[id]/messages/route.ts
import { auth } from "@/auth";
import { createMessageSchema } from "@/lib/dtos/chat.dto";
import { createMessage, getMessages } from "@/services/chat.service";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const id = resolvedParams?.id;

    if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 });

    const data = await getMessages(session.user.id, id);

    return NextResponse.json(data, { status: 200 });
  } catch (error: unknown) {
    console.error("[Messages GET Error]:", error);
    const msg =
      error instanceof Error ? error.message : "Internal server error";
    const status = msg.includes("access denied") ? 403 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await params;
    const id = resolvedParams?.id;

    if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 });

    const body = await request.json();
    const parsedData = createMessageSchema.safeParse(body);

    if (!parsedData.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsedData.error.issues },
        { status: 400 },
      );
    }

    const message = await createMessage(session.user.id, id, parsedData.data);
    return NextResponse.json(
      { message: "Message sent", data: message },
      { status: 201 },
    );
  } catch (error: unknown) {
    console.error("[Messages POST Error]:", error);
    const msg =
      error instanceof Error ? error.message : "Internal server error";
    const status = msg.includes("access denied") ? 403 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

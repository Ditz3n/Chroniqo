// src/app/api/conversations/route.ts
import { auth } from "@/auth";
import { createConversationSchema } from "@/lib/dtos/chat.dto";
import { createConversation, getConversations } from "@/services/chat.service";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Returns { conversations, communityConversations }
    const data = await getConversations(session.user.id);
    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error("[Conversations GET Error]:", error);
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
    const parsedData = createConversationSchema.safeParse(body);

    if (!parsedData.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsedData.error.issues },
        { status: 400 },
      );
    }

    const conversation = await createConversation(
      session.user.id,
      parsedData.data,
    );
    return NextResponse.json(
      { message: "Conversation created", conversation },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "User not found") {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }
      if (
        error.message === "This user is not accepting messages." ||
        error.message === "User does not accept messages"
      ) {
        return NextResponse.json(
          { error: "User does not accept messages" },
          { status: 403 },
        );
      }
      if (
        error.message === "You must be friends to message this user." ||
        error.message === "User only accepts messages from friends"
      ) {
        return NextResponse.json(
          { error: "User only accepts messages from friends" },
          { status: 403 },
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

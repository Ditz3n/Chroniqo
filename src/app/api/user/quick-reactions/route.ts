// src/app/api/user/quick-reactions/route.ts
import { auth } from "@/auth";
import { updateQuickReactionsSchema } from "@/lib/dtos/user.dto";
import {
  getQuickReactions,
  updateQuickReactions,
} from "@/services/user.service";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const quickReactions = await getQuickReactions(session.user.id);
    return NextResponse.json({ quickReactions }, { status: 200 });
  } catch (error) {
    console.error("[Quick Reactions GET Error]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsedData = updateQuickReactionsSchema.safeParse(body);

    if (!parsedData.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsedData.error.issues },
        { status: 400 },
      );
    }

    const quickReactions = await updateQuickReactions(
      session.user.id,
      parsedData.data.emojis,
    );

    return NextResponse.json(
      { message: "Quick reactions updated", quickReactions },
      { status: 200 },
    );
  } catch (error) {
    console.error("[Quick Reactions PUT Error]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

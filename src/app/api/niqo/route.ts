// src/app/api/niqo/route.ts
import { auth } from "@/auth";
import { StartNiqoChatDTO } from "@/lib/dtos/niqo.dto";
import { HttpError } from "@/lib/errors/http-errors";
import { rateLimiterPerHour } from "@/lib/upstash";
import { NiqoService } from "@/services/niqo.service";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) throw new HttpError(401, "Unauthorized");

    const recentChat = await NiqoService.getRecentChat(session.user.id);
    return NextResponse.json({
      conversationId: recentChat?.id ?? null,
      preview: recentChat?.preview ?? null,
    });
  } catch (error: unknown) {
    if (error instanceof HttpError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode },
      );
    }
    console.error("[GET /api/niqo]", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) throw new HttpError(401, "Unauthorized");

    // Rate limit check
    const { success, reset, limit } = await rateLimiterPerHour.limit(
      session.user.id,
    );
    if (!success) {
      return NextResponse.json(
        {
          error: `Rate limit exceeded. Max ${limit} requests per hour. Try again after ${new Date(reset * 1000).toLocaleTimeString()}`,
        },
        { status: 429 },
      );
    }

    const body = await req.json();
    const validatedData = StartNiqoChatDTO.parse(body);

    // Creates the chat and saves the opening message only.
    // The Gemini call is deferred to POST /api/niqo/[id]/generate,
    // which the client triggers after redirecting to the chat page.
    const conversationId = await NiqoService.startNewChat(
      session.user.id,
      validatedData.content,
    );

    return NextResponse.json({ conversationId }, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof HttpError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode },
      );
    }
    console.error("[POST /api/niqo]", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

export async function DELETE() {
  try {
    const session = await auth();
    if (!session?.user?.id) throw new HttpError(401, "Unauthorized");

    await NiqoService.deleteChat(session.user.id);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    if (error instanceof HttpError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode },
      );
    }
    console.error("[DELETE /api/niqo]", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

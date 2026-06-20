// src/app/api/niqo/[id]/generate/route.ts
import { auth } from "@/auth";
import { HttpError } from "@/lib/errors/http-errors";
import { rateLimiterPerHour } from "@/lib/upstash";
import { NiqoService } from "@/services/niqo.service";
import { NextRequest, NextResponse } from "next/server";

// Called by the chat page on mount when it detects a pending USER message
// with no AI reply yet. Runs the Gemini call and saves the AI response.
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
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

    const { id: chatId } = await params;
    const content = await NiqoService.generateResponse(session.user.id, chatId);

    return NextResponse.json({ content }, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof HttpError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode },
      );
    }
    console.error("[POST /api/niqo/[id]/generate]", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

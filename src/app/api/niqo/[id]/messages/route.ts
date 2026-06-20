// src/app/api/niqo/[id]/messages/route.ts
import { auth } from "@/auth";
import { SendNiqoMessageDTO } from "@/lib/dtos/niqo.dto";
import { HttpError } from "@/lib/errors/http-errors";
import { NiqoService } from "@/services/niqo.service";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) throw new HttpError(401, "Unauthorized");

    const resolvedParams = await params;
    const chatId = resolvedParams.id;

    // Use service layer for fetching messages
    const messages = await NiqoService.getMessages(session.user.id, chatId);
    return NextResponse.json(messages);
  } catch (error: unknown) {
    if (error instanceof HttpError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode },
      );
    }
    console.error("[GET /api/niqo/[id]/messages]", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) throw new HttpError(401, "Unauthorized");

    const resolvedParams = await params;
    const chatId = resolvedParams.id;

    const body = await req.json();
    const validatedData = SendNiqoMessageDTO.parse(body);

    const result = await NiqoService.sendMessage(
      session.user.id,
      chatId,
      validatedData.content,
    );

    // returns { userMessage, aiMessage }
    return NextResponse.json(result, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof HttpError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode },
      );
    }
    console.error("[POST /api/niqo/[id]/messages]", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

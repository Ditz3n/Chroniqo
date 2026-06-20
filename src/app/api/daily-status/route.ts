// src/app/api/daily-status/route.ts
import { auth } from "@/auth";
import { dailyStatusSchema } from "@/lib/dtos/daily-status.dto";
import {
  deleteDailyStatus,
  upsertDailyStatus,
} from "@/services/daily-status.service";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsedData = dailyStatusSchema.safeParse(body);

    if (!parsedData.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsedData.error.issues },
        { status: 400 },
      );
    }

    const status = await upsertDailyStatus(session.user.id, parsedData.data);

    return NextResponse.json(
      { message: "Status saved", status },
      { status: 201 },
    );
  } catch (error) {
    console.error("[DailyStatus POST Error]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { date } = body;

    if (!date || typeof date !== "string") {
      return NextResponse.json({ error: "Date is required" }, { status: 400 });
    }

    await deleteDailyStatus(session.user.id, date);

    return NextResponse.json({ message: "Status deleted" }, { status: 200 });
  } catch (error) {
    console.error("[DailyStatus DELETE Error]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

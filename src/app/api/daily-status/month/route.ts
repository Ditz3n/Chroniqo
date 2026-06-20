// src/app/api/daily-status/month/route.ts
import { auth } from "@/auth";
import { getMonthStatuses } from "@/services/daily-status.service";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const year = parseInt(
      searchParams.get("year") || String(new Date().getFullYear()),
    );
    const month = parseInt(
      searchParams.get("month") || String(new Date().getMonth()),
    );

    const statuses = await getMonthStatuses(session.user.id, year, month);

    return NextResponse.json({ statuses }, { status: 200 });
  } catch (error) {
    console.error("[DailyStatus Month API Error]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

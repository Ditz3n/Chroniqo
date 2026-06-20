// src/app/api/daily-status/today/route.ts
import { auth } from "@/auth";
import { getTodayStatus } from "@/services/daily-status.service";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const status = await getTodayStatus(session.user.id);

    return NextResponse.json(
      { hasRegistered: !!status, status },
      { status: 200 },
    );
  } catch (error) {
    console.error("[DailyStatus GET Error]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

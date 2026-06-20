// src/app/api/admin/stats/route.ts
import { auth } from "@/auth";
import { getPlatformStats } from "@/services/admin-stats.service";
import { AdminStatsRange } from "@/types/app-types";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const rangeSchema = z.enum(["today", "week", "month", "year"]).default("week");

export async function GET(req: NextRequest) {
  const session = await auth();

  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = rangeSchema.safeParse(
    req.nextUrl.searchParams.get("range") ?? "week",
  );
  const range: AdminStatsRange = parsed.success ? parsed.data : "week";

  try {
    const stats = await getPlatformStats(range);
    return NextResponse.json(stats);
  } catch (error) {
    console.error("[AdminStats] Failed to fetch platform stats:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

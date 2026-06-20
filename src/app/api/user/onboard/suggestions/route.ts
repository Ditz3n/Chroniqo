// src/app/api/user/onboard/suggestions/route.ts
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const first = searchParams.get("first") || "";
    const last = searchParams.get("last") || "";

    const base = `${first}${last}`.toLowerCase().replace(/[^a-z0-9]/g, "");
    const baseF = first.toLowerCase().replace(/[^a-z0-9]/g, "");
    const lastClean = last.toLowerCase().replace(/[^a-z0-9]/g, "");

    const suggestions: string[] = [];
    let attempts = 0;

    while (suggestions.length < 3 && attempts < 20) {
      attempts++;
      const num = Math.floor(Math.random() * 900) + 100;
      const candidates = [
        `${base}${num}`,
        `${baseF}_${lastClean}${num}`,
        `${base}_${num}`,
      ];

      for (const cand of candidates) {
        if (suggestions.length >= 3) break;
        if (!suggestions.includes(cand) && cand.length > 2) {
          const exists = await prisma.user.findUnique({
            where: { username: cand },
            select: { id: true },
          });
          if (!exists) suggestions.push(cand);
        }
      }
    }

    return NextResponse.json({ suggestions }, { status: 200 });
  } catch (error) {
    console.error("[Username Suggestions Error]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

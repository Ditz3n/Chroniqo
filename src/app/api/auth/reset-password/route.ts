// src/app/api/auth/reset-password/route.ts
import { resetPasswordSchema } from "@/lib/dtos/auth.dto";
import { prisma } from "@/lib/prisma";
import { resetPassword } from "@/services/auth.service";
import { NextResponse } from "next/server";

/** GET - Pre-validates a reset token without consuming it. */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) return NextResponse.json({ valid: false, reason: "missing" });

    const record = await prisma.passwordResetToken.findUnique({
      where: { token },
    });

    if (!record)
      return NextResponse.json({ valid: false, reason: "not_found" });

    if (new Date(record.expires) < new Date())
      return NextResponse.json({ valid: false, reason: "expired" });

    return NextResponse.json({ valid: true });
  } catch (error) {
    console.error("[Reset Password GET Error]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsedData = resetPasswordSchema.safeParse(body);

    if (!parsedData.success) {
      return NextResponse.json({ error: "Validation failed" }, { status: 400 });
    }

    const { token, password } = parsedData.data;

    await resetPassword(token, password);

    return NextResponse.json(
      { message: "Password updated successfully" },
      { status: 200 },
    );
  } catch (error: unknown) {
    console.error("[Reset Password API Error]:", error);
    if (error instanceof Error) {
      // Return 400 for expected domain errors (expired/invalid token)
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

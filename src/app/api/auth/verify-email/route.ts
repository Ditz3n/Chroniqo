// src/app/api/auth/verify-email/route.ts
import { verifyEmailToken } from "@/services/auth.service";
import { NextResponse } from "next/server";

/**
 * GET - Validates an email verification token, marks the user as verified,
 * then redirects to the home page. The middleware handles locale routing from there.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  const baseUrl = process.env.NEXTAUTH_URL!;

  if (!token) {
    return NextResponse.redirect(
      new URL("/verify-email?status=missing", baseUrl),
    );
  }

  try {
    await verifyEmailToken(token);
    console.log("[VerifyEmail] Email verified successfully for token:", token);
    return NextResponse.redirect(
      new URL("/verify-email?status=success", baseUrl),
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";
    console.error("[VerifyEmail] Verification failed:", message);

    if (message === "Token has expired") {
      return NextResponse.redirect(
        new URL("/verify-email?status=expired", baseUrl),
      );
    }
    return NextResponse.redirect(
      new URL("/verify-email?status=invalid", baseUrl),
    );
  }
}

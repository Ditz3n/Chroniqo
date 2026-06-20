// src/app/api/auth/verify-signup/route.ts
import { verifySignupToken } from "@/services/auth.service";
import { NextResponse } from "next/server";

/**
 * GET - Validates a signup verification token, marks the user's signup as verified,
 * and redirects to the verify-signup result page. Middleware handles locale routing.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");
  const baseUrl = process.env.NEXTAUTH_URL!;

  if (!token) {
    return NextResponse.redirect(
      new URL("/verify-signup?status=missing", baseUrl),
    );
  }

  try {
    await verifySignupToken(token);
    console.log("[VerifySignup] Signup verified for token:", token);
    return NextResponse.redirect(
      new URL("/verify-signup?status=success", baseUrl),
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";
    console.error("[VerifySignup] Verification failed:", message);

    if (message === "Token has expired") {
      return NextResponse.redirect(
        new URL("/verify-signup?status=expired", baseUrl),
      );
    }
    return NextResponse.redirect(
      new URL("/verify-signup?status=invalid", baseUrl),
    );
  }
}

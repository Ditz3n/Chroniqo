// src/app/api/auth/register/route.ts
import { registerSchema } from "@/lib/dtos/auth.dto";
import { sendSignupVerificationEmail } from "@/lib/mail";
import {
  generateSignupVerificationToken,
  registerUser,
} from "@/services/auth.service";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validate incoming data to prevent over-posting
    const parsedData = registerSchema.safeParse(body);
    if (!parsedData.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsedData.error.issues },
        { status: 400 },
      );
    }

    const user = await registerUser(parsedData.data);

    // Generate and send the signup verification email immediately after account creation.
    // This is a fire-and-forget from the API's perspective - the user is created regardless,
    // but they cannot proceed past the onboarding gate until the link is clicked.
    try {
      const tokenRecord = await generateSignupVerificationToken(
        user.id,
        user.email,
      );
      await sendSignupVerificationEmail(user.email, tokenRecord.token);
      console.log(`[Register] Signup verification email sent to ${user.email}`);
    } catch (emailError) {
      // Log but don't fail the registration - the user can resend from the gate
      console.error(
        "[Register] Failed to send signup verification email:",
        emailError,
      );
    }

    return NextResponse.json(
      { message: "User registered successfully", user },
      { status: 201 },
    );
  } catch (error: unknown) {
    console.error("[Register API Error]:", error);
    if (
      error instanceof Error &&
      (error.message.includes("Email") || error.message.includes("Username"))
    ) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

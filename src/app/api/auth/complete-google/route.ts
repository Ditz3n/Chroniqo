// src/app/api/auth/complete-google/route.ts
import { auth } from "@/auth";
import { completeGoogleSignupSchema } from "@/lib/dtos/auth.dto";
import { completeGoogleSignup } from "@/services/auth.service";
import { NextResponse } from "next/server";

// Handles POST requests to complete Google signup
export async function POST(request: Request) {
  try {
    // Get the current user session
    const session = await auth();
    // If the user is not authenticated, return 401 Unauthorized
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Parse the request body as JSON
    const body = await request.json();
    // Validate the request body against the expected schema
    const parsedData = completeGoogleSignupSchema.safeParse(body);

    // If validation fails, return 400 Bad Request
    if (!parsedData.success) {
      return NextResponse.json({ error: "Validation failed" }, { status: 400 });
    }

    // Complete the Google signup process using the user ID and validated data
    await completeGoogleSignup(session.user.id, parsedData.data);
    // Respond with success message
    return NextResponse.json({ message: "Signup completed" }, { status: 200 });
  } catch (error: unknown) {
    // If the error is related to username conflict, return 409 Conflict
    if (error instanceof Error && error.message.includes("Username")) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    // For all other errors, return 500 Internal Server Error
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

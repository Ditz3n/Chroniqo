// src/app/api/user/onboard/route.ts
import { auth } from "@/auth";
import { onboardSchema } from "@/lib/dtos/auth.dto";
import { prisma } from "@/lib/prisma";
import { onboardUser } from "@/services/auth.service";
import { NextResponse } from "next/server";

export async function PUT(request: Request) {
  try {
    // Authenticate the request via Auth.js session
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    // Validate incoming data
    const parsedData = onboardSchema.safeParse(body);
    if (!parsedData.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsedData.error.issues },
        { status: 400 },
      );
    }

    const updatedUser = await onboardUser(session.user.id, parsedData.data);

    return NextResponse.json(
      { message: "Onboarding completed successfully", user: updatedUser },
      { status: 200 },
    );
  } catch (error: unknown) {
    console.error("[Onboard API Error]:", error);
    if (
      error instanceof Error &&
      error.message === "Username is already taken"
    ) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        firstName: true,
        lastName: true,
        username: true,
        gender: true,
        age: true,
        weight: true,
        weightUnit: true,
        height: true,
        heightUnit: true,
        medications: true,
        conditions: true,
        onboardingStep: true,
      },
    });

    return NextResponse.json(user, { status: 200 });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

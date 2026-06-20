// src/app/api/users/settings/route.ts
import { auth } from "@/auth";
import {
  updateHealthSettingsSchema,
  updateSettingsSchema,
} from "@/lib/dtos/user.dto";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

/** PUT - Privacy & Messaging Settings */
export async function PUT(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const parsed = updateSettingsSchema.safeParse(body);
    if (!parsed.success)
      return NextResponse.json({ error: "Validation failed" }, { status: 400 });

    await prisma.user.update({
      where: { id: session.user.id },
      data: parsed.data,
    });

    return NextResponse.json({ message: "Settings updated" }, { status: 200 });
  } catch (error) {
    console.error("[Settings PUT Error]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/** PATCH - Health & Personal Info Settings. */
export async function PATCH(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const parsed = updateHealthSettingsSchema.safeParse(body);
    if (!parsed.success)
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.issues },
        { status: 400 },
      );

    // Destructure birthDate out to be able to convert it to a Date object
    const { birthDate, ...rest } = parsed.data;

    // Resolve birthDate: undefined - don't touch, null = clear, string - set
    let resolvedBirthDate: Date | null | undefined = undefined;
    if (birthDate !== undefined) {
      if (birthDate === null) {
        resolvedBirthDate = null;
      } else {
        const d = new Date(birthDate);
        if (isNaN(d.getTime())) {
          return NextResponse.json(
            { error: "Invalid date format" },
            { status: 400 },
          );
        }
        resolvedBirthDate = d;
      }
    }

    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        ...rest,
        ...(resolvedBirthDate !== undefined && {
          birthDate: resolvedBirthDate,
          ...(resolvedBirthDate === null && { autoUpdateAge: false }),
        }),
      },
    });

    return NextResponse.json(
      { message: "Health settings updated" },
      { status: 200 },
    );
  } catch (error) {
    console.error("[Settings PATCH Error]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

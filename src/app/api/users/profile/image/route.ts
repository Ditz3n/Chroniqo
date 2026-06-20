// src/app/api/users/profile/image/route.ts
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { z } from "zod";

const uploadSchema = z.object({
  type: z.enum([
    "avatar",
    "header",
    "avatar-icon",
    "header-icon",
    "remove-avatar",
    "remove-header",
  ]),
});

// Icon selection payload - no file upload needed, just store emoji + color.
const iconPayloadSchema = z.object({
  emoji: z.string().nullable(),
  bgColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Must be a valid hex color"),
});

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const contentType = request.headers.get("content-type") ?? "";

    // JSON path - used for icon/color selection (no file upload)
    if (contentType.includes("application/json")) {
      const body = await request.json();

      const parsedType = uploadSchema.safeParse({ type: body.type });
      if (!parsedType.success) {
        return NextResponse.json({ error: "Invalid type" }, { status: 400 });
      }

      const type = parsedType.data.type;

      // Remove types need no payload - clear all related fields immediately
      if (type === "remove-avatar") {
        await prisma.user.update({
          where: { id: session.user.id },
          data: { image: null, avatarEmoji: null, avatarBgColor: null },
        });
        return NextResponse.json({ ok: true }, { status: 200 });
      }

      if (type === "remove-header") {
        await prisma.user.update({
          where: { id: session.user.id },
          data: { headerImage: null, headerEmoji: null, headerBgColor: null },
        });
        return NextResponse.json({ ok: true }, { status: 200 });
      }

      // avatar-icon / header-icon - validate emoji + color payload

      const parsedPayload = iconPayloadSchema.safeParse({
        emoji: body.emoji,
        bgColor: body.bgColor,
      });
      if (!parsedPayload.success) {
        return NextResponse.json(
          {
            error: "Invalid icon payload",
            details: parsedPayload.error.issues,
          },
          { status: 400 },
        );
      }

      const { emoji, bgColor } = parsedPayload.data;

      if (parsedType.data.type === "avatar-icon") {
        await prisma.user.update({
          where: { id: session.user.id },
          data: {
            avatarEmoji: emoji,
            avatarBgColor: bgColor,
            // Clear the uploaded image so the icon takes precedence
            image: null,
          },
        });
      } else {
        // header-icon
        await prisma.user.update({
          where: { id: session.user.id },
          data: {
            headerEmoji: emoji,
            headerBgColor: bgColor,
            // Clear the uploaded header image so the icon takes precedence
            headerImage: null,
          },
        });
      }

      return NextResponse.json({ ok: true }, { status: 200 });
    }

    // FormData path - existing blob upload for avatar and header photos
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const type = formData.get("type") as string;

    const parsedType = uploadSchema.safeParse({ type });
    if (!parsedType.success || !file) {
      return NextResponse.json(
        { error: "Invalid file or type" },
        { status: 400 },
      );
    }

    const filename = `${session.user.id}-${type}-${Date.now()}.jpg`;
    const blob = await put(filename, file, {
      access: "public",
      contentType: file.type,
    });

    if (type === "avatar") {
      await prisma.user.update({
        where: { id: session.user.id },
        data: {
          image: blob.url,
          // Clear icon fields when a real photo is uploaded
          avatarEmoji: null,
          avatarBgColor: null,
        },
      });
    } else {
      await prisma.user.update({
        where: { id: session.user.id },
        data: {
          headerImage: blob.url,
          headerEmoji: null,
          headerBgColor: null,
        },
      });
    }

    return NextResponse.json({ url: blob.url }, { status: 200 });
  } catch (error) {
    console.error("[Profile Image Upload Error]:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

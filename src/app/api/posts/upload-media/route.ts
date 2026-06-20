// src/app/api/posts/upload-media/route.ts
import { auth } from "@/auth";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as HandleUploadBody;

    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => {
        const session = await auth();
        if (!session?.user?.id) {
          throw new Error("Unauthorized");
        }

        return {
          allowedContentTypes: [
            "image/jpeg",
            "image/png",
            "image/gif",
            "image/webp",
            "video/mp4",
            "video/webm",
            "video/quicktime",
          ],
          tokenPayload: JSON.stringify({ userId: session.user.id }),
        };
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    console.error("[Post Media Upload Error]:", error);
    return NextResponse.json(
      { error: (error as Error).message || "Internal server error" },
      { status: 400 },
    );
  }
}

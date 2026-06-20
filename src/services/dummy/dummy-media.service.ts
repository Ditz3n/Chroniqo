// src/services/dummy/dummy-media.service.ts
import { put } from "@vercel/blob";

export async function uploadDummyMedia(
  sourceUrl: string,
  filename: string,
): Promise<string> {
  try {
    const response = await fetch(sourceUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch media from ${sourceUrl}`);
    }

    const blob = await response.blob();
    // Prefix with dummy/ for easy identification and cleanup.
    // addRandomSuffix: true forces a unique URL, busting the browser/Edge cache.
    const uploaded = await put(`dummy/${filename}`, blob, {
      access: "public",
      addRandomSuffix: true,
    });

    return uploaded.url;
  } catch (error) {
    console.error("[DummyMediaService] Failed to upload media:", error);
    // Throw the error so the orchestrator's retry mechanism can catch it
    throw error;
  }
}

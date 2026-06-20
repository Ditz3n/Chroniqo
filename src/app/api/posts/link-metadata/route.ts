// src/app/api/posts/link-metadata/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({ url: z.string().url() });

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { url } = schema.parse(body);

    // Fetch the URL with a timeout and generic User-Agent
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      signal: AbortSignal.timeout(5000),
    });

    const html = await res.text();

    // Utility to extract meta tag content via Regex (lightweight MVP approach)
    const getMeta = (prop: string) => {
      const match =
        html.match(
          new RegExp(
            `<meta\\s+(?:property|name)=["']${prop}["']\\s+content=["']([^"']+)["']`,
            "i",
          ),
        ) ||
        html.match(
          new RegExp(
            `<meta\\s+content=["']([^"']+)["']\\s+(?:property|name)=["']${prop}["']`,
            "i",
          ),
        );
      return match ? match[1] : null;
    };

    const titleMatch = html.match(/<title>([^<]*)<\/title>/i);

    const metaTitle =
      getMeta("og:title") ||
      getMeta("twitter:title") ||
      (titleMatch ? titleMatch[1] : "");
    const metaDescription =
      getMeta("og:description") || getMeta("description") || "";
    const metaImage = getMeta("og:image") || getMeta("twitter:image") || "";
    const siteName = getMeta("og:site_name") || new URL(url).hostname;

    return NextResponse.json({
      url,
      metaTitle: metaTitle.trim(),
      metaDescription: metaDescription.trim(),
      metaImage: metaImage.trim(),
      siteName: siteName.trim(),
    });
  } catch (error) {
    console.error("[Link Metadata Error]", error);
    return NextResponse.json(
      { error: "Failed to fetch metadata" },
      { status: 400 },
    );
  }
}

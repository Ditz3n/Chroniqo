/**
 * @jest-environment node
 */

// __tests__/api/posts/link-metadata/route.test.ts

/* Tests for the POST /api/posts/link-metadata route.
 * Covers metadata extraction, invalid URLs, and error handling using fetch mocks.
 */

import { POST } from "@/app/api/posts/link-metadata/route";

describe("POST /api/posts/link-metadata", () => {
  let originalFetch: typeof global.fetch;

  beforeAll(() => {
    originalFetch = global.fetch;
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it("returns 400 if validation fails (invalid url)", async () => {
    const req = new Request("https://chroniqo.com/api/posts/link-metadata", {
      method: "POST",
      body: JSON.stringify({ url: "not-a-url" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns extracted metadata on success", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      text: jest.fn().mockResolvedValue(`
        <html>
          <head>
            <title>HTML Title</title>
            <meta property="og:title" content="OG Title" />
            <meta property="og:description" content="OG Description" />
            <meta property="og:image" content="https://example.com/image.png" />
            <meta property="og:site_name" content="OG Site" />
          </head>
          <body></body>
        </html>
      `),
    });

    const req = new Request("https://chroniqo.com/api/posts/link-metadata", {
      method: "POST",
      body: JSON.stringify({ url: "https://example.com" }),
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.metaTitle).toBe("OG Title");
    expect(json.metaDescription).toBe("OG Description");
    expect(json.metaImage).toBe("https://example.com/image.png");
    expect(json.siteName).toBe("OG Site");
  });

  it("falls back to title and hostname if OG tags are missing", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      text: jest.fn().mockResolvedValue(`
        <html>
          <head>
            <title>Fallback Title</title>
          </head>
          <body></body>
        </html>
      `),
    });

    const req = new Request("https://chroniqo.com/api/posts/link-metadata", {
      method: "POST",
      body: JSON.stringify({ url: "https://example.com/path" }),
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.metaTitle).toBe("Fallback Title");
    expect(json.metaDescription).toBe("");
    expect(json.metaImage).toBe("");
    expect(json.siteName).toBe("example.com");
  });

  it("returns 400 if fetch fails", async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error("Network error"));

    const req = new Request("https://chroniqo.com/api/posts/link-metadata", {
      method: "POST",
      body: JSON.stringify({ url: "https://example.com" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});

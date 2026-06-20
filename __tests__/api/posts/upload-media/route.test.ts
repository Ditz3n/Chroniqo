/**
 * @jest-environment node
 */

// __tests__/api/posts/upload-media/route.test.ts

/* Tests for the POST /api/posts/upload-media route.
 * Covers successful uploads and error handling using mocks for authentication and handleUpload.
 */

import { POST } from "@/app/api/posts/upload-media/route";
import { handleUpload } from "@vercel/blob/client";

jest.mock("@/auth", () => ({
  auth: jest.fn().mockResolvedValue({ user: { id: "test-user-123" } }),
}));
jest.mock("@vercel/blob/client", () => ({
  handleUpload: jest.fn(),
}));

describe("POST /api/posts/upload-media", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 400 when handleUpload fails", async () => {
    (handleUpload as jest.Mock).mockRejectedValue(
      new Error("Handshake failed"),
    );

    const req = new Request("https://chroniqo.com/api/posts/upload-media", {
      method: "POST",
      body: JSON.stringify({ type: "upload/request" }),
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(400);
    expect(json.error).toBe("Handshake failed");
  });

  it("returns json token response from handleUpload on success", async () => {
    (handleUpload as jest.Mock).mockResolvedValue({
      type: "upload/success",
      url: "https://blob...",
    });

    const req = new Request("https://chroniqo.com/api/posts/upload-media", {
      method: "POST",
      body: JSON.stringify({ type: "upload/request" }),
    });

    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.url).toBe("https://blob...");
  });
});

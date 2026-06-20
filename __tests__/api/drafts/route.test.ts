/**
 * @jest-environment node
 */

// __tests__/api/drafts/route.test.ts

/*
 * This file tests the API routes for drafts overview and creation.
 * It ensures that unauthenticated requests are blocked, invalid payloads
 * are rejected by Zod, and valid requests successfully call the service.
 */

import { GET, POST } from "@/app/api/drafts/route";
import { auth } from "@/auth";
import { getUserDrafts, saveDraft } from "@/services/post.service";
import type { Session } from "next-auth";

jest.mock("@/auth", () => ({ auth: jest.fn() }));
jest.mock("@/services/post.service");

describe("Drafts API Routes", () => {
  const mockedAuth = auth as jest.Mock;
  const mockedGetDrafts = getUserDrafts as jest.MockedFunction<
    typeof getUserDrafts
  >;
  const mockedSaveDraft = saveDraft as jest.MockedFunction<typeof saveDraft>;

  const mockSession: Session = {
    user: {
      id: "user-1",
      onboarded: true,
      hasPassword: true,
      role: "USER",
      email: "test@example.com",
    },
    expires: new Date(Date.now() + 86400000).toISOString(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET", () => {
    it("should return 401 if unauthenticated", async () => {
      mockedAuth.mockResolvedValue(null);
      const res = await GET();
      expect(res.status).toBe(401);
    });

    it("should return 200 and a list of drafts", async () => {
      mockedAuth.mockResolvedValue(mockSession);
      mockedGetDrafts.mockResolvedValue([
        { id: "draft-1" },
      ] as unknown as Awaited<ReturnType<typeof getUserDrafts>>);

      const res = await GET();
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.drafts).toHaveLength(1);
    });
  });

  describe("POST", () => {
    it("should return 401 if unauthenticated", async () => {
      mockedAuth.mockResolvedValue(null);
      const req = new Request("https://chroniqo.com/api/drafts", {
        method: "POST",
        body: JSON.stringify({ type: "text" }),
      });
      const res = await POST(req);
      expect(res.status).toBe(401);
    });

    it("should return 400 on validation failure", async () => {
      mockedAuth.mockResolvedValue(mockSession);
      const req = new Request("https://chroniqo.com/api/drafts", {
        method: "POST",
        body: JSON.stringify({ type: "invalid" }),
      });

      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it("should return 200 and save draft on success", async () => {
      mockedAuth.mockResolvedValue(mockSession);
      mockedSaveDraft.mockResolvedValue({ id: "draft-1" } as unknown as Awaited<
        ReturnType<typeof saveDraft>
      >);

      const req = new Request("https://chroniqo.com/api/drafts", {
        method: "POST",
        body: JSON.stringify({ title: "My Draft", type: "text" }),
      });

      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.draft.id).toBe("draft-1");
      expect(mockedSaveDraft).toHaveBeenCalledWith(
        "user-1",
        expect.objectContaining({ title: "My Draft" }),
      );
    });
  });
});

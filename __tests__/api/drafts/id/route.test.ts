/**
 * @jest-environment node
 */

// __tests__/api/drafts/id/route.test.ts

/*
 * This file tests the API route for deleting a specific draft by ID.
 * It ensures that unauthenticated requests are blocked, unauthorized
 * access is prevented, and valid deletion requests succeed.
 */

import { DELETE } from "@/app/api/drafts/[id]/route";
import { auth } from "@/auth";
import { deleteDraft } from "@/services/post.service";
import type { Session } from "next-auth";

jest.mock("@/auth", () => ({ auth: jest.fn() }));
jest.mock("@/services/post.service");

describe("Drafts Detail API Route (DELETE)", () => {
  const mockedAuth = auth as jest.Mock;
  const mockedDelete = deleteDraft as jest.MockedFunction<typeof deleteDraft>;

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

  const params = Promise.resolve({ id: "draft-123" });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return 401 if unauthenticated", async () => {
    mockedAuth.mockResolvedValue(null);
    const req = new Request("https://chroniqo.com/api/drafts/draft-123", {
      method: "DELETE",
    });

    const res = await DELETE(req, { params });
    expect(res.status).toBe(401);
  });

  it("should return 403 or 404 if service throws authorization/not found errors", async () => {
    mockedAuth.mockResolvedValue(mockSession);
    mockedDelete.mockRejectedValue(new Error("Unauthorized"));

    const req = new Request("https://chroniqo.com/api/drafts/draft-123", {
      method: "DELETE",
    });

    const res = await DELETE(req, { params });
    const json = await res.json();

    expect(res.status).toBe(403);
    expect(json.error).toBe("Unauthorized");
  });

  it("should return 200 on successful deletion", async () => {
    mockedAuth.mockResolvedValue(mockSession);
    mockedDelete.mockResolvedValue({ success: true });

    const req = new Request("https://chroniqo.com/api/drafts/draft-123", {
      method: "DELETE",
    });

    const res = await DELETE(req, { params });

    expect(res.status).toBe(200);
    expect(mockedDelete).toHaveBeenCalledWith("user-1", "draft-123");
  });
});

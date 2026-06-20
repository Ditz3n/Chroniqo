/**
 * @jest-environment node
 */

// __tests__/api/communities/name/join/route.test.ts

/*
 * This file tests the API route for joining/leaving a community.
 * It ensures that unauthenticated requests are blocked, non-existent
 * communities return 404, and valid requests successfully toggle membership.
 */

import { POST } from "@/app/api/communities/[name]/join/route";
import { auth } from "@/auth";
import { toggleCommunityMembership } from "@/services/community.service";
import type { Session } from "next-auth";

jest.mock("@/auth", () => ({ auth: jest.fn() }));
jest.mock("@/services/community.service");

describe("Community Join API Route", () => {
  const mockedAuth = auth as jest.Mock;
  const mockedToggle = toggleCommunityMembership as jest.MockedFunction<
    typeof toggleCommunityMembership
  >;

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

  const params = Promise.resolve({ name: "TestComm" });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return 401 if unauthenticated", async () => {
    mockedAuth.mockResolvedValue(null);
    const req = new Request(
      "https://chroniqo.com/api/communities/TestComm/join",
      { method: "POST" },
    );
    const res = await POST(req, { params });
    expect(res.status).toBe(401);
  });

  it("should return 404 if community not found", async () => {
    mockedAuth.mockResolvedValue(mockSession);
    mockedToggle.mockRejectedValue(new Error("Community not found"));

    const req = new Request(
      "https://chroniqo.com/api/communities/TestComm/join",
      { method: "POST" },
    );
    const res = await POST(req, { params });
    expect(res.status).toBe(404);
  });

  it("should return 200 and the new status on success", async () => {
    mockedAuth.mockResolvedValue(mockSession);
    mockedToggle.mockResolvedValue({ status: "PENDING" });

    const req = new Request(
      "https://chroniqo.com/api/communities/TestComm/join",
      { method: "POST" },
    );
    const res = await POST(req, { params });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.status).toBe("PENDING");
    expect(mockedToggle).toHaveBeenCalledWith("TestComm", "user-1");
  });
});

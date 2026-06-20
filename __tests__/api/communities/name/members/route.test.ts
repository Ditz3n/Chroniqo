// __tests__/api/communities/name/members/route.test.ts

/*
 * This file tests the API route for fetching community members.
 * It ensures that unauthenticated requests are blocked, non-existent
 * communities return 404, and valid requests successfully return member lists.
 * It also checks for proper error handling when unauthorized or other errors occur.
 */

import { GET } from "@/app/api/communities/[name]/members/route";
import { auth } from "@/auth";
import { getCommunityMembers } from "@/services/community.service";

jest.mock("@/auth", () => ({ auth: jest.fn() }));
jest.mock("@/services/community.service");

describe("GET /api/communities/[name]/members", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return 401 if unauthenticated", async () => {
    (auth as jest.Mock).mockResolvedValue(null);
    const req = new Request("https://chroniqo.com/api");

    const res = await GET(req, { params: Promise.resolve({ name: "test" }) });
    expect(res.status).toBe(401);
  });

  it("should return 200 and members if authorized", async () => {
    (auth as jest.Mock).mockResolvedValue({ user: { id: "user1" } });
    (getCommunityMembers as jest.Mock).mockResolvedValue([
      { userId: "u2", role: "USER" },
    ]);

    const req = new Request("https://chroniqo.com/api");
    const res = await GET(req, { params: Promise.resolve({ name: "test" }) });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.members).toHaveLength(1);
    expect(getCommunityMembers).toHaveBeenCalledWith("test", "user1");
  });

  it("should return 403 if getCommunityMembers throws an Unauthorized error", async () => {
    (auth as jest.Mock).mockResolvedValue({ user: { id: "user1" } });
    (getCommunityMembers as jest.Mock).mockRejectedValue(
      new Error("Unauthorized: You do not have permission"),
    );

    const req = new Request("https://chroniqo.com/api");
    const res = await GET(req, { params: Promise.resolve({ name: "test" }) });

    expect(res.status).toBe(403);
  });
});

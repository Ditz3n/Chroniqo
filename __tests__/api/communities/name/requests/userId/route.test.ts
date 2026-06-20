// __tests__/api/communities/name/requests/userId/route.test.ts
import { PUT } from "@/app/api/communities/[name]/requests/[userId]/route";
import { auth } from "@/auth";
import { ForbiddenError } from "@/lib/errors/http-errors";
import { respondToMembershipRequest } from "@/services/community.service";

jest.mock("@/auth", () => ({ auth: jest.fn() }));
jest.mock("@/services/community.service", () => ({
  respondToMembershipRequest: jest.fn(),
}));

describe("PUT /api/communities/[name]/requests/[userId]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return 401 if unauthenticated", async () => {
    (auth as jest.Mock).mockResolvedValue(null);

    const req = new Request(
      "https://chroniqo.com/api/communities/test/requests/user-2",
      {
        method: "PUT",
        body: JSON.stringify({ action: "ACCEPT" }),
      },
    );

    const res = await PUT(req, {
      params: Promise.resolve({ name: "test", userId: "user-2" }),
    });

    expect(res.status).toBe(401);
    expect(respondToMembershipRequest).not.toHaveBeenCalled();
  });

  it("should return 400 if action is invalid", async () => {
    (auth as jest.Mock).mockResolvedValue({ user: { id: "mod-1" } });

    const req = new Request(
      "https://chroniqo.com/api/communities/test/requests/user-2",
      {
        method: "PUT",
        body: JSON.stringify({ action: "MAYBE" }),
      },
    );

    const res = await PUT(req, {
      params: Promise.resolve({ name: "test", userId: "user-2" }),
    });
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("Invalid action");
    expect(respondToMembershipRequest).not.toHaveBeenCalled();
  });

  it("should return 200 and call service on ACCEPT", async () => {
    (auth as jest.Mock).mockResolvedValue({ user: { id: "mod-1" } });
    (respondToMembershipRequest as jest.Mock).mockResolvedValue(undefined);

    const req = new Request(
      "https://chroniqo.com/api/communities/test/requests/user-2",
      {
        method: "PUT",
        body: JSON.stringify({ action: "ACCEPT" }),
      },
    );

    const res = await PUT(req, {
      params: Promise.resolve({ name: "test", userId: "user-2" }),
    });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(respondToMembershipRequest).toHaveBeenCalledWith(
      "test",
      "user-2",
      "mod-1",
      "ACCEPT",
    );
  });

  it("should return 200 and call service on REJECT", async () => {
    (auth as jest.Mock).mockResolvedValue({ user: { id: "mod-1" } });
    (respondToMembershipRequest as jest.Mock).mockResolvedValue(undefined);

    const req = new Request(
      "https://chroniqo.com/api/communities/test/requests/user-2",
      {
        method: "PUT",
        body: JSON.stringify({ action: "REJECT" }),
      },
    );

    const res = await PUT(req, {
      params: Promise.resolve({ name: "test", userId: "user-2" }),
    });

    expect(res.status).toBe(200);
    expect(respondToMembershipRequest).toHaveBeenCalledWith(
      "test",
      "user-2",
      "mod-1",
      "REJECT",
    );
  });

  it("should return 403 when service throws ForbiddenError", async () => {
    (auth as jest.Mock).mockResolvedValue({ user: { id: "mod-1" } });
    (respondToMembershipRequest as jest.Mock).mockRejectedValue(
      new ForbiddenError("Unauthorized"),
    );

    const req = new Request(
      "https://chroniqo.com/api/communities/test/requests/user-2",
      {
        method: "PUT",
        body: JSON.stringify({ action: "ACCEPT" }),
      },
    );

    const res = await PUT(req, {
      params: Promise.resolve({ name: "test", userId: "user-2" }),
    });
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 400 when service throws non-auth error", async () => {
    (auth as jest.Mock).mockResolvedValue({ user: { id: "mod-1" } });
    (respondToMembershipRequest as jest.Mock).mockRejectedValue(
      new Error("Membership request not found"),
    );

    const req = new Request(
      "https://chroniqo.com/api/communities/test/requests/user-2",
      {
        method: "PUT",
        body: JSON.stringify({ action: "ACCEPT" }),
      },
    );

    const res = await PUT(req, {
      params: Promise.resolve({ name: "test", userId: "user-2" }),
    });
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("Membership request not found");
  });
});

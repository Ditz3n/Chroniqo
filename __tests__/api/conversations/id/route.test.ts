// __tests__/api/conversations/id/route.test.ts
import { PUT } from "@/app/api/conversations/[id]/route";
import { auth } from "@/auth";
import { ForbiddenError } from "@/lib/errors/http-errors";
import { updateConversation } from "@/services/chat.service";

jest.mock("@/auth", () => ({ auth: jest.fn() }));
jest.mock("@/services/chat.service", () => ({
  updateConversation: jest.fn(),
}));

describe("PUT /api/conversations/[id]", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return 401 if unauthenticated", async () => {
    (auth as jest.Mock).mockResolvedValue(null);

    const req = new Request("https://chroniqo.com/api/conversations/conv-1", {
      method: "PUT",
      body: JSON.stringify({ name: "New Name" }),
    });

    const res = await PUT(req, { params: Promise.resolve({ id: "conv-1" }) });
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
    expect(updateConversation).not.toHaveBeenCalled();
  });

  it("should return 400 when payload validation fails", async () => {
    (auth as jest.Mock).mockResolvedValue({ user: { id: "user-1" } });

    const req = new Request("https://chroniqo.com/api/conversations/conv-1", {
      method: "PUT",
      body: JSON.stringify({ name: "x".repeat(51) }),
    });

    const res = await PUT(req, { params: Promise.resolve({ id: "conv-1" }) });
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("Validation failed");
    expect(Array.isArray(data.details)).toBe(true);
    expect(updateConversation).not.toHaveBeenCalled();
  });

  it("should return 200 and updated conversation on success", async () => {
    (auth as jest.Mock).mockResolvedValue({ user: { id: "user-1" } });
    (updateConversation as jest.Mock).mockResolvedValue({
      id: "conv-1",
      name: "Renamed",
    });

    const req = new Request("https://chroniqo.com/api/conversations/conv-1", {
      method: "PUT",
      body: JSON.stringify({ name: "Renamed", image: null }),
    });

    const res = await PUT(req, { params: Promise.resolve({ id: "conv-1" }) });
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.conversation).toEqual({ id: "conv-1", name: "Renamed" });
    expect(updateConversation).toHaveBeenCalledWith("user-1", "conv-1", {
      name: "Renamed",
      image: null,
    });
  });

  it("should return 403 when service throws ForbiddenError", async () => {
    (auth as jest.Mock).mockResolvedValue({ user: { id: "user-1" } });
    (updateConversation as jest.Mock).mockRejectedValue(
      new ForbiddenError("Access denied"),
    );

    const req = new Request("https://chroniqo.com/api/conversations/conv-1", {
      method: "PUT",
      body: JSON.stringify({ name: "Renamed" }),
    });

    const res = await PUT(req, { params: Promise.resolve({ id: "conv-1" }) });
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.error).toBe("Access denied");
  });

  it("should return 400 for other service errors", async () => {
    (auth as jest.Mock).mockResolvedValue({ user: { id: "user-1" } });
    (updateConversation as jest.Mock).mockRejectedValue(new Error("Boom"));

    const req = new Request("https://chroniqo.com/api/conversations/conv-1", {
      method: "PUT",
      body: JSON.stringify({ name: "Renamed" }),
    });

    const res = await PUT(req, { params: Promise.resolve({ id: "conv-1" }) });
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("Boom");
  });
});

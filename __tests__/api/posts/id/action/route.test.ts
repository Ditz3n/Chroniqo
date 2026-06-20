/**
 * @jest-environment node
 */

// __tests__/api/posts/action/route.test.ts

/*
 * This file tests the API route for post actions (save, hide, etc.).
 * It verifies that the route correctly handles authentication,
 * validates input, and calls the post service with the correct parameters.
 */

import { POST } from "@/app/api/posts/[id]/action/route";
import { auth } from "@/auth";
import { handlePostAction } from "@/services/post.service";

jest.mock("@/auth", () => ({ auth: jest.fn() }));
jest.mock("@/services/post.service");

describe("Post Action API Route", () => {
  const mockedAuth = auth as jest.Mock;
  const mockedHandleAction = handlePostAction as jest.MockedFunction<
    typeof handlePostAction
  >;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return 401 if unauthenticated", async () => {
    mockedAuth.mockResolvedValue(null);
    const req = new Request("https://chroniqo.com/api/posts/1/action", {
      method: "POST",
      body: JSON.stringify({ action: "save" }),
    });

    const res = await POST(req, { params: Promise.resolve({ id: "1" }) });
    expect(res.status).toBe(401);
  });

  it("should return 400 on invalid action", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "user-1" } });
    const req = new Request("https://chroniqo.com/api/posts/1/action", {
      method: "POST",
      body: JSON.stringify({ action: "invalid_action" }),
    });

    const res = await POST(req, { params: Promise.resolve({ id: "1" }) });
    expect(res.status).toBe(400);
  });

  it("should return 200 and call service on valid action", async () => {
    mockedAuth.mockResolvedValue({ user: { id: "user-1" } });
    mockedHandleAction.mockResolvedValue({ status: "saved" });

    const req = new Request("https://chroniqo.com/api/posts/1/action", {
      method: "POST",
      body: JSON.stringify({ action: "save" }),
    });

    const res = await POST(req, { params: Promise.resolve({ id: "1" }) });
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.status).toBe("saved");
    expect(mockedHandleAction).toHaveBeenCalledWith("user-1", "1", "save");
  });
});

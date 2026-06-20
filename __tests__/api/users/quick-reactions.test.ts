/**
 * @jest-environment node
 */

/*
 * This file tests the API routes for user quick reactions.
 * It ensures that unauthenticated requests are blocked, invalid payloads
 * are rejected by Zod, and valid requests successfully call the service.
 */

import {
  GET as quickReactionsGET,
  PUT as quickReactionsPUT,
} from "@/app/api/user/quick-reactions/route";
import { auth } from "@/auth";
import {
  getQuickReactions,
  updateQuickReactions,
} from "@/services/user.service";
import type { Session } from "next-auth";

jest.mock("@/auth", () => ({ auth: jest.fn() }));
jest.mock("@/services/user.service");

describe("User Quick Reactions API", () => {
  const mockedAuth = auth as jest.Mock;
  const mockedGetQuickReactions = getQuickReactions as jest.MockedFunction<
    typeof getQuickReactions
  >;
  const mockedUpdateQuickReactions =
    updateQuickReactions as jest.MockedFunction<typeof updateQuickReactions>;

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

  const customEmojis = ["🚀", "🔥", "💯", "👀", "🙌", "✨"];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("GET should return 401 if user is not authenticated", async () => {
    mockedAuth.mockResolvedValue(null);

    const res = await quickReactionsGET();
    const json = await res.json();

    expect(res.status).toBe(401);
    expect(json.error).toBe("Unauthorized");
  });

  it("GET should return 200 and the user's quick reactions", async () => {
    mockedAuth.mockResolvedValue(mockSession);
    mockedGetQuickReactions.mockResolvedValue(customEmojis);

    const res = await quickReactionsGET();
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.quickReactions).toEqual(customEmojis);
    expect(mockedGetQuickReactions).toHaveBeenCalledWith("user-1");
  });

  it("GET should return 500 when service throws", async () => {
    mockedAuth.mockResolvedValue(mockSession);
    mockedGetQuickReactions.mockRejectedValue(new Error("DB fail"));

    const res = await quickReactionsGET();
    expect(res.status).toBe(500);
  });

  it("PUT should return 401 if unauthenticated", async () => {
    mockedAuth.mockResolvedValue(null);

    const req = new Request("https://chroniqo.com/api/user/quick-reactions", {
      method: "PUT",
      body: JSON.stringify({ emojis: customEmojis }),
    });

    const res = await quickReactionsPUT(req);
    expect(res.status).toBe(401);
  });

  it("PUT should return 400 on invalid payload", async () => {
    mockedAuth.mockResolvedValue(mockSession);

    const req = new Request("https://chroniqo.com/api/user/quick-reactions", {
      method: "PUT",
      body: JSON.stringify({ emojis: ["👍", "❤️"] }),
    });

    const res = await quickReactionsPUT(req);
    expect(res.status).toBe(400);
    expect(mockedUpdateQuickReactions).not.toHaveBeenCalled();
  });

  it("PUT should return 200 and update quick reactions", async () => {
    mockedAuth.mockResolvedValue(mockSession);
    mockedUpdateQuickReactions.mockResolvedValue(customEmojis);

    const req = new Request("https://chroniqo.com/api/user/quick-reactions", {
      method: "PUT",
      body: JSON.stringify({ emojis: customEmojis }),
    });

    const res = await quickReactionsPUT(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.quickReactions).toEqual(customEmojis);
    expect(mockedUpdateQuickReactions).toHaveBeenCalledWith(
      "user-1",
      customEmojis,
    );
  });

  it("PUT should return 500 when service throws", async () => {
    mockedAuth.mockResolvedValue(mockSession);
    mockedUpdateQuickReactions.mockRejectedValue(new Error("DB fail"));

    const req = new Request("https://chroniqo.com/api/user/quick-reactions", {
      method: "PUT",
      body: JSON.stringify({ emojis: customEmojis }),
    });

    const res = await quickReactionsPUT(req);
    expect(res.status).toBe(500);
  });
});

/**
 * @jest-environment node
 */

// __tests__/api/reactions.test.ts

/*
 * This file tests the API route for toggling chat message reactions.
 * It verifies that unauthenticated requests are rejected, invalid payloads
 * (e.g., empty or excessively long emojis) are blocked by Zod, and valid requests
 * successfully trigger the service logic and return the correct action payload.
 */

import { POST } from "@/app/api/messages/[id]/reactions/route";
import { auth } from "@/auth";
import { toggleMessageReaction } from "@/services/chat.service";
import type { Session } from "next-auth";

jest.mock("@/auth", () => ({
  auth: jest.fn(),
}));

jest.mock("@/services/chat.service");

describe("Message Reactions API Routes", () => {
  const mockedAuth = auth as jest.Mock;
  const mockedToggleReaction = toggleMessageReaction as jest.MockedFunction<
    typeof toggleMessageReaction
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

  const params = Promise.resolve({ id: "msg-123" });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("POST /api/messages/[id]/reactions", () => {
    it("should return 401 if user is not authenticated", async () => {
      mockedAuth.mockResolvedValue(null);

      const req = new Request(
        "https://chroniqo.com/api/messages/msg-123/reactions",
        {
          method: "POST",
          body: JSON.stringify({ emoji: "👍" }),
        },
      );

      const res = await POST(req, { params });
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json.error).toBe("Unauthorized");
    });

    it("should return 400 if Zod validation fails (empty emoji)", async () => {
      mockedAuth.mockResolvedValue(mockSession);

      const req = new Request(
        "https://chroniqo.com/api/messages/msg-123/reactions",
        {
          method: "POST",
          body: JSON.stringify({ emoji: "" }), // Invalid: empty string
        },
      );

      const res = await POST(req, { params });
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error).toBe("Validation failed");
      expect(mockedToggleReaction).not.toHaveBeenCalled();
    });

    it("should return 200 and the resulting action on valid input", async () => {
      mockedAuth.mockResolvedValue(mockSession);

      // Simulate the service adding a new reaction
      mockedToggleReaction.mockResolvedValue({ action: "added" });

      const req = new Request(
        "https://chroniqo.com/api/messages/msg-123/reactions",
        {
          method: "POST",
          body: JSON.stringify({ emoji: "🎉" }),
        },
      );

      const res = await POST(req, { params });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.message).toBe("Reaction processed");
      expect(json.action).toBe("added");
      expect(mockedToggleReaction).toHaveBeenCalledWith(
        "user-1",
        "msg-123",
        "🎉",
      );
    });

    it("should return 403 if access is denied by the service", async () => {
      mockedAuth.mockResolvedValue(mockSession);
      mockedToggleReaction.mockRejectedValue(
        new Error("Conversation not found or access denied"),
      );

      const req = new Request(
        "https://chroniqo.com/api/messages/msg-123/reactions",
        {
          method: "POST",
          body: JSON.stringify({ emoji: "👍" }),
        },
      );

      const res = await POST(req, { params });
      const json = await res.json();

      expect(res.status).toBe(403);
      expect(json.error).toBe("Conversation not found or access denied");
    });

    it("should return 500 for unexpected reaction errors", async () => {
      mockedAuth.mockResolvedValue(mockSession);
      mockedToggleReaction.mockRejectedValue(new Error("Unexpected"));

      const req = new Request(
        "https://chroniqo.com/api/messages/msg-123/reactions",
        {
          method: "POST",
          body: JSON.stringify({ emoji: "👍" }),
        },
      );

      const res = await POST(req, { params });
      const json = await res.json();

      expect(res.status).toBe(500);
      expect(json.error).toBe("Unexpected");
    });

    it("should return 403 when service reports message not found", async () => {
      mockedAuth.mockResolvedValue(mockSession);
      mockedToggleReaction.mockRejectedValue(new Error("Message not found"));

      const req = new Request(
        "https://chroniqo.com/api/messages/msg-123/reactions",
        {
          method: "POST",
          body: JSON.stringify({ emoji: "👍" }),
        },
      );

      const res = await POST(req, { params });
      const json = await res.json();

      expect(res.status).toBe(403);
      expect(json.error).toBe("Message not found");
    });

    it("should return 500 with default message for non-Error throws", async () => {
      mockedAuth.mockResolvedValue(mockSession);
      mockedToggleReaction.mockRejectedValue("non-error-throw");

      const req = new Request(
        "https://chroniqo.com/api/messages/msg-123/reactions",
        {
          method: "POST",
          body: JSON.stringify({ emoji: "👍" }),
        },
      );

      const res = await POST(req, { params });
      const json = await res.json();

      expect(res.status).toBe(500);
      expect(json.error).toBe("Internal server error");
    });
  });
});

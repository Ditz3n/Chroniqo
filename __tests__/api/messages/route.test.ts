/**
 * @jest-environment node
 */

// __tests__/api/messages/route.test.ts

/*
 * This file tests the API routes for chat messages.
 * It ensures that unauthenticated requests are blocked, invalid payloads
 * are rejected by Zod, and valid requests successfully call the service.
 */

import {
  GET as messagesGet,
  POST,
} from "@/app/api/conversations/[id]/messages/route";
import { DELETE as messageDelete } from "@/app/api/messages/[id]/route";
import { auth } from "@/auth";
import {
  createMessage,
  getMessages,
  softDeleteMessage,
} from "@/services/chat.service";
import type { Session } from "next-auth";
import { TEST_IDS } from "../../utils/test-constants";
import { createMockSession } from "../../utils/test-utils";

jest.mock("@/auth", () => ({
  auth: jest.fn(),
}));

jest.mock("@/services/chat.service");

describe("Messages API Routes", () => {
  const mockedAuth = auth as jest.Mock;
  const mockedCreateMessage = createMessage as jest.MockedFunction<
    typeof createMessage
  >;
  const mockedGetMessages = getMessages as jest.MockedFunction<
    typeof getMessages
  >;
  const mockedSoftDelete = softDeleteMessage as jest.MockedFunction<
    typeof softDeleteMessage
  >;

  const mockSession: Session = createMockSession();

  const params = Promise.resolve({ id: TEST_IDS.conversation });
  const deleteParams = Promise.resolve({ id: TEST_IDS.message });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("POST /api/conversations/[id]/messages", () => {
    it("should return 401 if user is not authenticated", async () => {
      mockedAuth.mockResolvedValue(null);

      const req = new Request(
        `https://chroniqo.com/api/conversations/${TEST_IDS.conversation}/messages`,
        {
          method: "POST",
          body: JSON.stringify({ content: "Hello" }),
        },
      );

      const res = await POST(req, { params });
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json.error).toBe("Unauthorized");
    });

    it("should return 400 if Zod validation fails (empty content)", async () => {
      mockedAuth.mockResolvedValue(mockSession);

      const req = new Request(
        `https://chroniqo.com/api/conversations/${TEST_IDS.conversation}/messages`,
        {
          method: "POST",
          body: JSON.stringify({ content: "" }), // Invalid: empty string
        },
      );

      const res = await POST(req, { params });
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error).toBe("Validation failed");
      expect(mockedCreateMessage).not.toHaveBeenCalled();
    });

    it("should return 400 when conversation id param is missing", async () => {
      mockedAuth.mockResolvedValue(mockSession);

      const req = new Request(
        "https://chroniqo.com/api/conversations//messages",
        {
          method: "POST",
          body: JSON.stringify({ content: "Hello" }),
        },
      );

      const res = await POST(req, { params: Promise.resolve({ id: "" }) });
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error).toBe("Missing ID");
    });

    it("should return 201 and call the service on valid input", async () => {
      mockedAuth.mockResolvedValue(mockSession);
      const mockDbResponse = {
        id: "msg-1",
        content: "Hello world",
        conversationId: "conv-123",
        senderId: "user-1",
        createdAt: new Date(),
        replyToId: null,
      };

      mockedCreateMessage.mockResolvedValue(
        mockDbResponse as unknown as Awaited<ReturnType<typeof createMessage>>,
      );

      const req = new Request(
        `https://chroniqo.com/api/conversations/${TEST_IDS.conversation}/messages`,
        {
          method: "POST",
          body: JSON.stringify({ content: "Hello world" }),
        },
      );

      const res = await POST(req, { params });
      const json = await res.json();

      expect(res.status).toBe(201);
      expect(json.message).toBe("Message sent");
      expect(mockedCreateMessage).toHaveBeenCalledWith(
        TEST_IDS.user,
        TEST_IDS.conversation,
        expect.objectContaining({ content: "Hello world" }),
      );
    });

    it("should return 403 if access is denied by the service", async () => {
      mockedAuth.mockResolvedValue(mockSession);
      mockedCreateMessage.mockRejectedValue(
        new Error("Conversation not found or access denied"),
      );

      const req = new Request(
        `https://chroniqo.com/api/conversations/${TEST_IDS.conversation}/messages`,
        {
          method: "POST",
          body: JSON.stringify({ content: "Let me in" }),
        },
      );

      const res = await POST(req, { params });
      const json = await res.json();

      expect(res.status).toBe(403);
      expect(json.error).toBe("Conversation not found or access denied");
    });

    it("should return 500 for non-access errors from service", async () => {
      mockedAuth.mockResolvedValue(mockSession);
      mockedCreateMessage.mockRejectedValue(new Error("Unexpected"));

      const req = new Request(
        `https://chroniqo.com/api/conversations/${TEST_IDS.conversation}/messages`,
        {
          method: "POST",
          body: JSON.stringify({ content: "Let me in" }),
        },
      );

      const res = await POST(req, { params });
      const json = await res.json();

      expect(res.status).toBe(500);
      expect(json.error).toBe("Unexpected");
    });

    it("should return 500 with default message for non-Error createMessage throws", async () => {
      mockedAuth.mockResolvedValue(mockSession);
      mockedCreateMessage.mockRejectedValue("non-error-throw");

      const req = new Request(
        "https://chroniqo.com/api/conversations/conv-123/messages",
        {
          method: "POST",
          body: JSON.stringify({ content: "Let me in" }),
        },
      );

      const res = await POST(req, { params });
      const json = await res.json();

      expect(res.status).toBe(500);
      expect(json.error).toBe("Internal server error");
    });
  });

  describe("GET /api/conversations/[id]/messages", () => {
    it("should return 401 if user is not authenticated", async () => {
      mockedAuth.mockResolvedValue(null);

      const req = new Request(
        "https://chroniqo.com/api/conversations/conv-123/messages",
      );

      const res = await messagesGet(req, { params });
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json.error).toBe("Unauthorized");
    });

    it("should return 200 and message payload when access is valid", async () => {
      mockedAuth.mockResolvedValue(mockSession);
      mockedGetMessages.mockResolvedValue({
        conversation: {
          expiresAt: new Date(),
          deletedByUserId: null,
          deletionScheduledAt: null,
        },
        messages: [],
      });

      const req = new Request(
        "https://chroniqo.com/api/conversations/conv-123/messages",
      );

      const res = await messagesGet(req, { params });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.messages).toEqual([]);
      expect(mockedGetMessages).toHaveBeenCalledWith(
        TEST_IDS.user,
        TEST_IDS.conversation,
      );
    });

    it("should return 400 when conversation id param is missing", async () => {
      mockedAuth.mockResolvedValue(mockSession);

      const req = new Request(
        "https://chroniqo.com/api/conversations//messages",
      );

      const res = await messagesGet(req, {
        params: Promise.resolve({ id: "" }),
      });
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error).toBe("Missing ID");
    });

    it("should return 403 when getMessages denies access", async () => {
      mockedAuth.mockResolvedValue(mockSession);
      mockedGetMessages.mockRejectedValue(
        new Error("Conversation not found or access denied"),
      );

      const req = new Request(
        "https://chroniqo.com/api/conversations/conv-123/messages",
      );

      const res = await messagesGet(req, { params });
      const json = await res.json();

      expect(res.status).toBe(403);
      expect(json.error).toBe("Conversation not found or access denied");
    });

    it("should return 500 for unexpected getMessages errors", async () => {
      mockedAuth.mockResolvedValue(mockSession);
      mockedGetMessages.mockRejectedValue(new Error("Unexpected"));

      const req = new Request(
        "https://chroniqo.com/api/conversations/conv-123/messages",
      );

      const res = await messagesGet(req, { params });
      const json = await res.json();

      expect(res.status).toBe(500);
      expect(json.error).toBe("Unexpected");
    });

    it("should return 500 with default message for non-Error getMessages throws", async () => {
      mockedAuth.mockResolvedValue(mockSession);
      mockedGetMessages.mockRejectedValue("non-error-throw");

      const req = new Request(
        "https://chroniqo.com/api/conversations/conv-123/messages",
      );

      const res = await messagesGet(req, { params });
      const json = await res.json();

      expect(res.status).toBe(500);
      expect(json.error).toBe("Internal server error");
    });
  });

  describe("DELETE /api/messages/[id]", () => {
    it("should return 401 if unauthenticated", async () => {
      mockedAuth.mockResolvedValue(null);
      const req = new Request("https://chroniqo.com/api/messages/msg-123", {
        method: "DELETE",
      });

      const res = await messageDelete(req, { params: deleteParams });
      expect(res.status).toBe(401);
    });

    it("should return 200 on successful soft delete", async () => {
      mockedAuth.mockResolvedValue(mockSession);
      const deletedMessage = { id: "msg-123" } as unknown as Awaited<
        ReturnType<typeof softDeleteMessage>
      >;
      mockedSoftDelete.mockResolvedValue(deletedMessage);

      const req = new Request("https://chroniqo.com/api/messages/msg-123", {
        method: "DELETE",
      });
      const res = await messageDelete(req, { params: deleteParams });

      expect(res.status).toBe(200);
      expect(mockedSoftDelete).toHaveBeenCalledWith(
        TEST_IDS.user,
        TEST_IDS.message,
      );
    });

    it("should return 400 when id param is missing", async () => {
      mockedAuth.mockResolvedValue(mockSession);

      const req = new Request("https://chroniqo.com/api/messages/", {
        method: "DELETE",
      });
      const res = await messageDelete(req, {
        params: Promise.resolve({ id: "" }),
      });
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error).toBe("Missing ID parameter");
    });

    it("should return 403 if service throws access denied error", async () => {
      mockedAuth.mockResolvedValue(mockSession);
      mockedSoftDelete.mockRejectedValue(
        new Error("You can only delete your own messages"),
      );

      const req = new Request("https://chroniqo.com/api/messages/msg-123", {
        method: "DELETE",
      });
      const res = await messageDelete(req, { params: deleteParams });
      const json = await res.json();

      expect(res.status).toBe(403);
      expect(json.error).toBe("You can only delete your own messages");
    });

    it("should return 500 for unexpected service errors", async () => {
      mockedAuth.mockResolvedValue(mockSession);
      mockedSoftDelete.mockRejectedValue(new Error("Unexpected failure"));

      const req = new Request("https://chroniqo.com/api/messages/msg-123", {
        method: "DELETE",
      });
      const res = await messageDelete(req, { params: deleteParams });
      const json = await res.json();

      expect(res.status).toBe(500);
      expect(json.error).toBe("Unexpected failure");
    });

    it("should return 500 with default message for non-Error throws", async () => {
      mockedAuth.mockResolvedValue(mockSession);
      mockedSoftDelete.mockRejectedValue("non-error-throw");

      const req = new Request("https://chroniqo.com/api/messages/msg-123", {
        method: "DELETE",
      });
      const res = await messageDelete(req, { params: deleteParams });
      const json = await res.json();

      expect(res.status).toBe(500);
      expect(json.error).toBe("Internal server error");
    });
  });
});

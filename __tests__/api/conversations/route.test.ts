// __tests__/api/conversations/route.test.ts

/*
 * This file tests the API routes for conversations.
 * It ensures that unauthenticated requests are blocked, invalid payloads
 * are rejected by Zod, and valid requests successfully call the service.
 */

import {
  DELETE as deletionDELETE,
  POST as deletionPOST,
} from "@/app/api/conversations/[id]/deletion/route";
import { PUT as extendPUT } from "@/app/api/conversations/[id]/extend/route";
import { PUT as participantPUT } from "@/app/api/conversations/[id]/participant/route";
import { GET, POST } from "@/app/api/conversations/route";
import { auth } from "@/auth";
import { prisma as prismaMock } from "@/lib/prisma";
import {
  cancelConversationDeletion,
  createConversation,
  extendConversation,
  getConversations,
  scheduleConversationDeletion,
} from "@/services/chat.service";
import type { PrismaClient } from "@prisma/client";
import type { DeepMockProxy } from "jest-mock-extended";
import type { Session } from "next-auth";
import { TEST_IDS } from "../../utils/test-constants";
import { createMockSession } from "../../utils/test-utils";

jest.mock("@/auth", () => ({
  auth: jest.fn(),
}));

jest.mock("@/services/chat.service");
jest.mock("@/lib/prisma");

describe("Conversations API Routes", () => {
  const mockedAuth = auth as jest.Mock;
  const mockedGetConversations = getConversations as jest.MockedFunction<
    typeof getConversations
  >;
  const mockedCreateConversation = createConversation as jest.MockedFunction<
    typeof createConversation
  >;
  const mockedExtendConversation = extendConversation as jest.MockedFunction<
    typeof extendConversation
  >;
  const mockedScheduleDeletion =
    scheduleConversationDeletion as jest.MockedFunction<
      typeof scheduleConversationDeletion
    >;
  const mockedCancelDeletion =
    cancelConversationDeletion as jest.MockedFunction<
      typeof cancelConversationDeletion
    >;
  const prismaDeepMock = prismaMock as unknown as DeepMockProxy<PrismaClient>;

  const mockSession: Session = createMockSession();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const deletionParams = Promise.resolve({ id: TEST_IDS.conversation });

  describe("GET /api/conversations", () => {
    it("should return 401 if unauthenticated", async () => {
      mockedAuth.mockResolvedValue(null);
      const res = await GET();
      expect(res.status).toBe(401);
    });

    it("should return 200 and conversations list", async () => {
      mockedAuth.mockResolvedValue(mockSession);
      const conversationsData = {
        conversations: [{ id: "conv-1" }],
        communityConversations: [],
      } as unknown as Awaited<ReturnType<typeof getConversations>>;
      mockedGetConversations.mockResolvedValue(conversationsData);

      const res = await GET();
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.conversations).toHaveLength(1);
      expect(mockedGetConversations).toHaveBeenCalledWith(TEST_IDS.user);
    });
  });

  describe("POST /api/conversations", () => {
    it("should return 401 if unauthenticated", async () => {
      mockedAuth.mockResolvedValue(null);
      const req = new Request("https://chroniqo.com/api/conversations", {
        method: "POST",
        body: JSON.stringify({ participantIds: ["user-2"] }),
      });
      const res = await POST(req);
      expect(res.status).toBe(401);
    });

    it("should return 400 if Zod validation fails (empty participants)", async () => {
      mockedAuth.mockResolvedValue(mockSession);
      const req = new Request("https://chroniqo.com/api/conversations", {
        method: "POST",
        body: JSON.stringify({ participantIds: [] }), // Invalid: empty
      });

      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error).toBe("Validation failed");
      expect(mockedCreateConversation).not.toHaveBeenCalled();
    });

    it("should return 404 if recipient user is not found", async () => {
      mockedAuth.mockResolvedValue(mockSession);
      mockedCreateConversation.mockRejectedValue(new Error("User not found"));

      const req = new Request("https://chroniqo.com/api/conversations", {
        method: "POST",
        body: JSON.stringify({ participantIds: ["user-2"] }),
      });

      const res = await POST(req);
      const json = await res.json();
      expect(res.status).toBe(404);
      expect(json.error).toBe("User not found");
    });

    it("should return 403 if recipient has messagingPermission set to NONE", async () => {
      mockedAuth.mockResolvedValue(mockSession);
      mockedCreateConversation.mockRejectedValue(
        new Error("This user is not accepting messages."),
      );

      const req = new Request("https://chroniqo.com/api/conversations", {
        method: "POST",
        body: JSON.stringify({ participantIds: ["user-2"] }),
      });

      const res = await POST(req);
      const json = await res.json();
      expect(res.status).toBe(403);
      expect(json.error).toBe("User does not accept messages");
    });

    it("should return 403 if recipient is ONLY_FRIENDS and not friends", async () => {
      mockedAuth.mockResolvedValue(mockSession);
      mockedCreateConversation.mockRejectedValue(
        new Error("You must be friends to message this user."),
      );

      const req = new Request("https://chroniqo.com/api/conversations", {
        method: "POST",
        body: JSON.stringify({ participantIds: ["user-2"] }),
      });

      const res = await POST(req);
      const json = await res.json();
      expect(res.status).toBe(403);
      expect(json.error).toBe("User only accepts messages from friends");
    });

    it("should return 201 and conversation data on success (ALL or Friends)", async () => {
      mockedAuth.mockResolvedValue(mockSession);
      prismaDeepMock.user.findUnique.mockResolvedValue({
        messagingPermission: "ALL",
        friendships: [],
      } as unknown as Awaited<ReturnType<typeof prismaMock.user.findUnique>>);
      const createdConversation = { id: "conv-1" } as unknown as Awaited<
        ReturnType<typeof createConversation>
      >;
      mockedCreateConversation.mockResolvedValue(createdConversation);

      const req = new Request("https://chroniqo.com/api/conversations", {
        method: "POST",
        body: JSON.stringify({ participantIds: ["user-2"] }),
      });

      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(201);
      expect(json.conversation.id).toBe("conv-1");
      expect(mockedCreateConversation).toHaveBeenCalledWith(TEST_IDS.user, {
        participantIds: ["user-2"],
        durationHours: 24,
      });
    });
  });

  describe("PUT /api/conversations/[id]/participant", () => {
    const participantParams = Promise.resolve({ id: "conv-123" });

    it("should return 401 if unauthenticated", async () => {
      mockedAuth.mockResolvedValue(null);
      const req = new Request(
        "https://chroniqo.com/api/conversations/conv-123/participant",
        {
          method: "PUT",
          body: JSON.stringify({ action: "ACCEPT" }),
        },
      );

      const res = await participantPUT(req, { params: participantParams });
      expect(res.status).toBe(401);
    });

    it("should ACCEPT and create a system message", async () => {
      mockedAuth.mockResolvedValue(mockSession);
      prismaDeepMock.$transaction.mockResolvedValue([
        {},
        {},
      ] as unknown as Awaited<ReturnType<typeof prismaMock.$transaction>>);

      const req = new Request(
        "https://chroniqo.com/api/conversations/conv-123/participant",
        {
          method: "PUT",
          body: JSON.stringify({ action: "ACCEPT" }),
        },
      );
      const res = await participantPUT(req, { params: participantParams });

      expect(res.status).toBe(200);
      expect(prismaDeepMock.conversationParticipant.update).toHaveBeenCalled();
      expect(prismaDeepMock.message.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ isSystem: true }),
        }),
      );
      expect(prismaDeepMock.$transaction).toHaveBeenCalled();
    });

    it("should DECLINE and delete 1:1 conversation", async () => {
      mockedAuth.mockResolvedValue(mockSession);
      prismaDeepMock.conversation.findUnique.mockResolvedValue({
        participants: [{ userId: "user-1" }, { userId: "user-2" }],
      } as unknown as Awaited<
        ReturnType<typeof prismaMock.conversation.findUnique>
      >);

      const req = new Request(
        "https://chroniqo.com/api/conversations/conv-123/participant",
        {
          method: "PUT",
          body: JSON.stringify({ action: "DECLINE" }),
        },
      );
      const res = await participantPUT(req, { params: participantParams });

      expect(res.status).toBe(200);
      expect(prismaDeepMock.conversation.delete).toHaveBeenCalledWith({
        where: { id: "conv-123" },
      });
    });

    it("should DECLINE and delete participant from group chat", async () => {
      mockedAuth.mockResolvedValue(mockSession);
      prismaDeepMock.conversation.findUnique.mockResolvedValue({
        participants: [
          { userId: "user-1" },
          { userId: "user-2" },
          { userId: "user-3" },
        ],
      } as unknown as Awaited<
        ReturnType<typeof prismaMock.conversation.findUnique>
      >);

      const req = new Request(
        "https://chroniqo.com/api/conversations/conv-123/participant",
        {
          method: "PUT",
          body: JSON.stringify({ action: "DECLINE" }),
        },
      );
      const res = await participantPUT(req, { params: participantParams });

      expect(res.status).toBe(200);
      expect(
        prismaDeepMock.conversationParticipant.delete,
      ).toHaveBeenCalledWith({
        where: {
          userId_conversationId: {
            userId: "user-1",
            conversationId: "conv-123",
          },
        },
      });
    });

    it("should return 500 when participant update throws", async () => {
      mockedAuth.mockResolvedValue(mockSession);
      prismaDeepMock.$transaction.mockRejectedValue(new Error("DB failed"));

      const req = new Request(
        "https://chroniqo.com/api/conversations/conv-123/participant",
        {
          method: "PUT",
          body: JSON.stringify({ action: "ACCEPT" }),
        },
      );
      const res = await participantPUT(req, { params: participantParams });
      const json = await res.json();

      expect(res.status).toBe(500);
      expect(json.error).toBe("Internal server error");
    });
  });

  describe("POST /api/conversations/[id]/deletion", () => {
    it("should return 401 if unauthenticated", async () => {
      mockedAuth.mockResolvedValue(null);
      const req = new Request(
        "https://chroniqo.com/api/conversations/conv-123/deletion",
        {
          method: "POST",
        },
      );

      const res = await deletionPOST(req, { params: deletionParams });

      expect(res.status).toBe(401);
    });

    it("should return 200 when scheduling succeeds", async () => {
      mockedAuth.mockResolvedValue(mockSession);
      const scheduledConversation = { id: "conv-123" } as unknown as Awaited<
        ReturnType<typeof scheduleConversationDeletion>
      >;
      mockedScheduleDeletion.mockResolvedValue(scheduledConversation);

      const req = new Request(
        "https://chroniqo.com/api/conversations/conv-123/deletion",
        {
          method: "POST",
        },
      );
      const res = await deletionPOST(req, { params: deletionParams });

      expect(res.status).toBe(200);
      expect(mockedScheduleDeletion).toHaveBeenCalledWith(
        TEST_IDS.user,
        TEST_IDS.conversation,
      );
    });

    it("should return 400 when deletion id is missing", async () => {
      mockedAuth.mockResolvedValue(mockSession);

      const req = new Request(
        "https://chroniqo.com/api/conversations//deletion",
        {
          method: "POST",
        },
      );
      const res = await deletionPOST(req, {
        params: Promise.resolve({ id: "" }),
      });
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error).toBe("Missing ID");
    });

    it("should return 500 when scheduling throws", async () => {
      mockedAuth.mockResolvedValue(mockSession);
      mockedScheduleDeletion.mockRejectedValue(new Error("Unexpected"));

      const req = new Request(
        "https://chroniqo.com/api/conversations/conv-123/deletion",
        {
          method: "POST",
        },
      );
      const res = await deletionPOST(req, { params: deletionParams });
      const json = await res.json();

      expect(res.status).toBe(500);
      expect(json.error).toBe("Unexpected");
    });

    it("should return 500 with default message for non-Error scheduling throws", async () => {
      mockedAuth.mockResolvedValue(mockSession);
      mockedScheduleDeletion.mockRejectedValue("non-error-throw");

      const req = new Request(
        "https://chroniqo.com/api/conversations/conv-123/deletion",
        {
          method: "POST",
        },
      );
      const res = await deletionPOST(req, { params: deletionParams });
      const json = await res.json();

      expect(res.status).toBe(500);
      expect(json.error).toBe("Internal server error");
    });
  });

  describe("PUT /api/conversations/[id]/extend", () => {
    it("should return 401 if unauthenticated", async () => {
      mockedAuth.mockResolvedValue(null);
      const req = new Request(
        "https://chroniqo.com/api/conversations/conv-123/extend",
        {
          method: "PUT",
          body: JSON.stringify({ durationHours: 24 }),
        },
      );

      const res = await extendPUT(req, { params: deletionParams });
      expect(res.status).toBe(401);
    });

    it("should return 200 with new expiresAt when extension succeeds", async () => {
      mockedAuth.mockResolvedValue(mockSession);
      const expiration = new Date(Date.now() + 24 * 60 * 60 * 1000);
      mockedExtendConversation.mockResolvedValue({
        id: "conv-123",
        expiresAt: expiration,
      } as Awaited<ReturnType<typeof extendConversation>>);

      const req = new Request(
        "https://chroniqo.com/api/conversations/conv-123/extend",
        {
          method: "PUT",
          body: JSON.stringify({ durationHours: 24 }),
        },
      );

      const res = await extendPUT(req, { params: deletionParams });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.expiresAt).toBe(expiration.toISOString());
      expect(mockedExtendConversation).toHaveBeenCalledWith(
        "user-1",
        "conv-123",
        24,
      );
    });

    it("should return 403 when extension is access denied", async () => {
      mockedAuth.mockResolvedValue(mockSession);
      mockedExtendConversation.mockRejectedValue(
        new Error("Conversation not found or access denied"),
      );

      const req = new Request(
        "https://chroniqo.com/api/conversations/conv-123/extend",
        {
          method: "PUT",
          body: JSON.stringify({ durationHours: 24 }),
        },
      );

      const res = await extendPUT(req, { params: deletionParams });
      const json = await res.json();

      expect(res.status).toBe(403);
      expect(json.error).toBe("Conversation not found or access denied");
    });

    it("should return 500 for unexpected extension errors", async () => {
      mockedAuth.mockResolvedValue(mockSession);
      mockedExtendConversation.mockRejectedValue(new Error("Unexpected"));

      const req = new Request(
        "https://chroniqo.com/api/conversations/conv-123/extend",
        {
          method: "PUT",
          body: JSON.stringify({ durationHours: 24 }),
        },
      );

      const res = await extendPUT(req, { params: deletionParams });
      const json = await res.json();

      expect(res.status).toBe(500);
      expect(json.error).toBe("Unexpected");
    });

    it("should return 500 with default message for non-Error extension throws", async () => {
      mockedAuth.mockResolvedValue(mockSession);
      mockedExtendConversation.mockRejectedValue("non-error-throw");

      const req = new Request(
        "https://chroniqo.com/api/conversations/conv-123/extend",
        {
          method: "PUT",
          body: JSON.stringify({ durationHours: 24 }),
        },
      );

      const res = await extendPUT(req, { params: deletionParams });
      const json = await res.json();

      expect(res.status).toBe(500);
      expect(json.error).toBe("Internal server error");
    });
  });

  describe("DELETE /api/conversations/[id]/deletion", () => {
    it("should return 401 if unauthenticated", async () => {
      mockedAuth.mockResolvedValue(null);
      const req = new Request(
        "https://chroniqo.com/api/conversations/conv-123/deletion",
        {
          method: "DELETE",
        },
      );

      const res = await deletionDELETE(req, { params: deletionParams });

      expect(res.status).toBe(401);
    });

    it("should return 200 when canceling succeeds", async () => {
      mockedAuth.mockResolvedValue(mockSession);
      const canceledConversation = { id: "conv-123" } as unknown as Awaited<
        ReturnType<typeof cancelConversationDeletion>
      >;
      mockedCancelDeletion.mockResolvedValue(canceledConversation);

      const req = new Request(
        "https://chroniqo.com/api/conversations/conv-123/deletion",
        {
          method: "DELETE",
        },
      );
      const res = await deletionDELETE(req, { params: deletionParams });

      expect(res.status).toBe(200);
      expect(mockedCancelDeletion).toHaveBeenCalledWith(
        TEST_IDS.user,
        TEST_IDS.conversation,
      );
    });

    it("should return 500 (or mapped error) if canceling fails", async () => {
      mockedAuth.mockResolvedValue(mockSession);
      mockedCancelDeletion.mockRejectedValue(
        new Error("Only the user who initiated deletion can cancel it"),
      );

      const req = new Request(
        "https://chroniqo.com/api/conversations/conv-123/deletion",
        {
          method: "DELETE",
        },
      );
      const res = await deletionDELETE(req, { params: deletionParams });
      const json = await res.json();

      expect(res.status).toBe(500);
      expect(json.error).toBe(
        "Only the user who initiated deletion can cancel it",
      );
    });

    it("should return 500 with default message for non-Error cancel throws", async () => {
      mockedAuth.mockResolvedValue(mockSession);
      mockedCancelDeletion.mockRejectedValue("non-error-throw");

      const req = new Request(
        "https://chroniqo.com/api/conversations/conv-123/deletion",
        {
          method: "DELETE",
        },
      );
      const res = await deletionDELETE(req, { params: deletionParams });
      const json = await res.json();

      expect(res.status).toBe(500);
      expect(json.error).toBe("Internal server error");
    });

    it("should return 400 when deletion id is missing", async () => {
      mockedAuth.mockResolvedValue(mockSession);

      const req = new Request(
        "https://chroniqo.com/api/conversations//deletion",
        {
          method: "DELETE",
        },
      );

      const res = await deletionDELETE(req, {
        params: Promise.resolve({ id: "" }),
      });
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error).toBe("Missing ID");
    });
  });
});

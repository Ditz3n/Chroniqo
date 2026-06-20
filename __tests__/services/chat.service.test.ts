// __tests__/services/chat.service.test.ts

/*
 * This file tests the chat service business logic.
 * It verifies access validation, participant constraints, and
 * ensures Prisma transactions correctly update conversation metadata.
 */

import { prisma as prismaMock } from "@/lib/prisma";

import {
  cancelConversationDeletion,
  createConversation,
  createMessage,
  extendConversation,
  getConversations,
  getMessages,
  removeParticipant,
  scheduleConversationDeletion,
  softDeleteMessage,
  toggleMessageReaction,
  updateConversation,
  updateParticipantNickname,
} from "@/services/chat.service";
import {
  Conversation,
  ConversationParticipant,
  Message,
  MessageReaction,
  PrismaClient,
  User,
} from "@prisma/client";
import { DeepMockProxy } from "jest-mock-extended";
import { TEST_EMAILS, TEST_IDS } from "../utils/test-constants";
import { createMockUser } from "../utils/test-utils";

jest.mock("@/lib/prisma");

const prismaDeepMock = prismaMock as unknown as DeepMockProxy<PrismaClient>;

describe("Chat Service", () => {
  const mockUserId = TEST_IDS.user;
  const mockConversationId = TEST_IDS.conversation;

  beforeEach(() => {
    // Global fallback mock so validateAccess passes for standard cases
    prismaDeepMock.conversationParticipant.findUnique.mockResolvedValue({
      userId: mockUserId,
      conversationId: mockConversationId,
      status: "ACCEPTED",
    } as unknown as ConversationParticipant);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("getConversations", () => {
    it("should include active community mutes in the community payload", async () => {
      const mockCommunityId = "comm-1";
      const futureDate = new Date(Date.now() + 1000 * 60 * 60 * 24); // 24 hours from now

      // 1. Mock personal conversations (returns empty)
      prismaDeepMock.conversation.findMany.mockResolvedValueOnce([]);

      // 2. Mock community conversations (returns one active community chat)
      prismaDeepMock.conversation.findMany.mockResolvedValueOnce([
        {
          id: "chat-1",
          isCommunity: true,
          communityId: mockCommunityId,
          community: {
            id: mockCommunityId,
            name: "Test Community",
            members: [{ userId: mockUserId, role: "USER" }],
          },
          participants: [],
          messages: [],
        },
      ] as unknown as Conversation[]);

      // 3. Mock the subsequent enrichment queries
      prismaDeepMock.communityAnonymousIdentity.findMany.mockResolvedValue([]);

      prismaDeepMock.communityMember.findMany.mockResolvedValue([
        { communityId: mockCommunityId, role: "USER" },
      ] as unknown as Awaited<
        ReturnType<typeof prismaMock.communityMember.findMany>
      >);

      prismaDeepMock.user.findUnique.mockResolvedValue({
        role: "USER",
      } as unknown as Awaited<ReturnType<typeof prismaMock.user.findUnique>>);

      prismaDeepMock.conversationParticipant.findMany.mockResolvedValue([]);
      prismaDeepMock.message.count.mockResolvedValue(0);

      // 4. Mock the active community mutes returning a valid mute for the user
      prismaDeepMock.communityMute.findMany.mockResolvedValue([
        {
          id: "mute-1",
          userId: mockUserId,
          communityId: mockCommunityId,
          reason: "Spamming",
          expiresAt: futureDate,
          createdAt: new Date(),
        },
      ] as unknown as Awaited<
        ReturnType<typeof prismaMock.communityMute.findMany>
      >);

      prismaDeepMock.globalMute.findMany.mockResolvedValue([]);

      // Execute
      const result = await getConversations(mockUserId);

      // Verify
      expect(result.communityConversations).toHaveLength(1);
      const commChat = result.communityConversations[0];

      const communityData = commChat.community as unknown as {
        mutes?: Array<{
          userId: string;
          reason: string | null;
          expiresAt: string | null;
        }>;
      };
      const mutes = communityData.mutes;

      expect(mutes).toBeDefined();
      expect(mutes).toHaveLength(1);
      expect(mutes![0]).toEqual(
        expect.objectContaining({
          userId: mockUserId,
          reason: "Spamming",
          expiresAt: futureDate.toISOString(),
        }),
      );
    });
  });

  describe("createConversation", () => {
    it("should throw an error if less than two unique participants exist", async () => {
      // User tries to create a chat with only themselves
      await expect(
        createConversation(mockUserId, {
          participantIds: [mockUserId],
          durationHours: 24,
        }),
      ).rejects.toThrow("A conversation requires at least two participants");
    });

    it("should successfully create a conversation with unique participants", async () => {
      const mockResult = {
        id: mockConversationId,
        participants: [
          {
            userId: mockUserId,
            user: { id: mockUserId, name: "Creator", username: "creator" },
          },
          {
            userId: "user-2",
            user: { id: "user-2", name: "User 2", username: "user2" },
          },
        ],
      };
      prismaDeepMock.user.findMany.mockResolvedValue([
        { id: "user-2", messagingPermission: "ALL" },
      ] as unknown as Awaited<ReturnType<typeof prismaMock.user.findMany>>);
      prismaDeepMock.friendship.findUnique.mockResolvedValue(null);
      prismaDeepMock.conversation.create.mockResolvedValue(
        mockResult as unknown as Conversation,
      );

      await createConversation(mockUserId, {
        participantIds: ["user-2", mockUserId],
        durationHours: 24,
      });

      expect(prismaDeepMock.conversation.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            durationHours: 24,
            participants: {
              create: [
                { userId: "user-2", status: "PENDING" },
                { userId: mockUserId, status: "ACCEPTED" },
              ],
            },
          }),
        }),
      );
    });

    it("should return an existing 1:1 conversation if it already exists", async () => {
      const mockExistingConversation = {
        id: "existing-conv",
        participants: [{ userId: "user-2" }, { userId: mockUserId }],
      };
      prismaDeepMock.user.findMany.mockResolvedValue([
        { id: "user-2", messagingPermission: "ALL" },
      ] as unknown as Awaited<ReturnType<typeof prismaMock.user.findMany>>);
      prismaDeepMock.friendship.findUnique.mockResolvedValue(null);

      // Correctly mock findFirst (not findUnique) to match service logic
      prismaDeepMock.conversation.findFirst.mockResolvedValue(
        mockExistingConversation as unknown as Conversation,
      );

      const result = await createConversation(mockUserId, {
        participantIds: ["user-2"],
        durationHours: 24,
      });

      // It should NOT call create
      expect(prismaDeepMock.conversation.create).not.toHaveBeenCalled();
      expect(result.id).toBe("existing-conv");
    });
  });

  describe("validateAccess (via getMessages)", () => {
    it("should throw if conversation does not exist, is expired, or user is not a participant", async () => {
      prismaDeepMock.conversation.findFirst.mockResolvedValue(null);

      await expect(getMessages(mockUserId, mockConversationId)).rejects.toThrow(
        "Conversation not found or access denied",
      );
    });

    it("should return messages if access is granted", async () => {
      prismaDeepMock.conversation.findUnique.mockResolvedValue({
        id: mockConversationId,
        isCommunity: false,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60), // 1 hour in future
        deletedByUserId: undefined,
        deletionScheduledAt: undefined,
        communityId: null,
        durationHours: 24,
        name: null,
        image: null,
        avatarEmoji: null,
        avatarBgColor: null,
        isDummy: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as unknown as Conversation);
      prismaDeepMock.message.findMany.mockResolvedValue([]);

      const result = await getMessages(mockUserId, mockConversationId);

      expect(result).toEqual({
        conversation: {
          expiresAt: expect.any(Date),
          deletedByUserId: undefined,
          deletionScheduledAt: undefined,
        },
        messages: [],
      });
      expect(prismaDeepMock.message.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { conversationId: mockConversationId },
        }),
      );
    });
  });

  describe("createMessage", () => {
    it("should create a message and update conversation updatedAt via transaction", async () => {
      // Bypass access validation
      prismaDeepMock.conversation.findFirst.mockResolvedValue({
        id: mockConversationId,
        isCommunity: false,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60),
        deletedByUserId: null,
        deletionScheduledAt: null,
        communityId: null,
        durationHours: 24,
        name: null,
        image: null,
        avatarEmoji: null,
        avatarBgColor: null,
        isDummy: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as unknown as Conversation);

      const mockMessage = { id: "msg-1", content: "Hello", isAnonymous: false };
      prismaDeepMock.$transaction.mockResolvedValue([mockMessage, {}]);

      const result = await createMessage(mockUserId, mockConversationId, {
        content: "Hello",
        isAnonymous: false,
      });

      expect(prismaDeepMock.$transaction).toHaveBeenCalled();
      expect(result).toEqual(mockMessage);
    });
  });

  describe("extendConversation", () => {
    it("should extend the expiresAt timestamp based on original duration", async () => {
      prismaDeepMock.conversation.findFirst.mockResolvedValue({
        id: mockConversationId,
        isCommunity: false,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60),
        deletedByUserId: null,
        deletionScheduledAt: null,
        communityId: null,
        durationHours: 24,
        name: null,
        image: null,
        avatarEmoji: null,
        avatarBgColor: null,
        isDummy: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as unknown as Conversation);

      await extendConversation(mockUserId, mockConversationId, 24);

      expect(prismaDeepMock.conversation.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: mockConversationId },
          data: expect.objectContaining({
            expiresAt: expect.any(Date),
          }),
        }),
      );
    });
  });

  describe("toggleMessageReaction", () => {
    const mockMessageId = TEST_IDS.message;

    it("should throw if message is not found", async () => {
      prismaDeepMock.message.findUnique.mockResolvedValue(null);

      await expect(
        toggleMessageReaction(mockUserId, mockMessageId, "👍"),
      ).rejects.toThrow("Message not found");
    });

    it("should throw if access is denied to the parent conversation", async () => {
      prismaDeepMock.message.findUnique.mockResolvedValue({
        conversationId: mockConversationId,
      } as unknown as Message);
      prismaDeepMock.conversation.findFirst.mockResolvedValue(null);

      await expect(
        toggleMessageReaction(mockUserId, mockMessageId, "👍"),
      ).rejects.toThrow("Conversation not found or access denied");
    });

    it("should remove the reaction if clicking the exact same emoji", async () => {
      prismaDeepMock.message.findUnique.mockResolvedValue({
        conversationId: mockConversationId,
      } as unknown as Message);
      prismaDeepMock.conversation.findFirst.mockResolvedValue({
        id: mockConversationId,
        isCommunity: false,
        communityId: null,
        durationHours: 24,
        expiresAt: new Date(),
        name: null,
        image: null,
        avatarEmoji: null,
        avatarBgColor: null,
        isDummy: false,
        deletedByUserId: null,
        deletionScheduledAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as unknown as Conversation);

      // Simulate an existing reaction with the same emoji
      prismaDeepMock.messageReaction.findUnique.mockResolvedValue({
        emoji: "👍",
      } as unknown as MessageReaction);

      const result = await toggleMessageReaction(
        mockUserId,
        mockMessageId,
        "👍",
      );

      expect(prismaDeepMock.messageReaction.delete).toHaveBeenCalledWith({
        where: {
          userId_messageId: { userId: mockUserId, messageId: mockMessageId },
        },
      });
      expect(result.action).toBe("removed");
    });

    it("should update the reaction if clicking a different emoji", async () => {
      prismaDeepMock.message.findUnique.mockResolvedValue({
        conversationId: mockConversationId,
      } as unknown as Message);
      prismaDeepMock.conversation.findFirst.mockResolvedValue({
        id: mockConversationId,
        isCommunity: false,
        communityId: null,
        durationHours: 24,
        expiresAt: new Date(),
        name: null,
        image: null,
        avatarEmoji: null,
        avatarBgColor: null,
        isDummy: false,
        deletedByUserId: null,
        deletionScheduledAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as unknown as Conversation);

      // Simulate an existing reaction with a DIFFERENT emoji
      prismaDeepMock.messageReaction.findUnique.mockResolvedValue({
        emoji: "👍",
      } as unknown as MessageReaction);

      const result = await toggleMessageReaction(
        mockUserId,
        mockMessageId,
        "❤️",
      );

      expect(prismaDeepMock.messageReaction.update).toHaveBeenCalledWith({
        where: {
          userId_messageId: { userId: mockUserId, messageId: mockMessageId },
        },
        data: { emoji: "❤️" },
      });
      expect(result.action).toBe("updated");
    });

    it("should create a new reaction if none exists for the user", async () => {
      prismaDeepMock.message.findUnique.mockResolvedValue({
        conversationId: mockConversationId,
      } as unknown as Message);
      prismaDeepMock.conversation.findFirst.mockResolvedValue({
        id: mockConversationId,
        isCommunity: false,
        communityId: null,
        durationHours: 24,
        expiresAt: new Date(),
        name: null,
        image: null,
        avatarEmoji: null,
        avatarBgColor: null,
        isDummy: false,
        deletedByUserId: null,
        deletionScheduledAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as unknown as Conversation);

      // Simulate no existing reaction
      prismaDeepMock.messageReaction.findUnique.mockResolvedValue(null);

      const result = await toggleMessageReaction(
        mockUserId,
        mockMessageId,
        "❤️",
      );

      expect(prismaDeepMock.messageReaction.create).toHaveBeenCalledWith({
        data: { userId: mockUserId, messageId: mockMessageId, emoji: "❤️" },
      });
      expect(result.action).toBe("added");
    });
  });

  describe("softDeleteMessage", () => {
    const mockMessageId = "msg-123";

    it("should throw if message is not found", async () => {
      prismaDeepMock.message.findUnique.mockResolvedValue(null);
      await expect(
        softDeleteMessage(mockUserId, mockMessageId),
      ).rejects.toThrow("Message not found");
    });

    it("should throw if user is not the sender", async () => {
      prismaDeepMock.message.findUnique.mockResolvedValue({
        id: mockMessageId,
        senderId: "different-user",
        conversationId: mockConversationId,
      } as unknown as Message);

      await expect(
        softDeleteMessage(mockUserId, mockMessageId),
      ).rejects.toThrow("You can only delete your own messages");
    });

    it("should update deletedAt if the user is the sender and has access", async () => {
      // 1. Message check
      prismaDeepMock.message.findUnique.mockResolvedValue({
        id: mockMessageId,
        senderId: mockUserId, // User is sender
        conversationId: mockConversationId,
      } as unknown as Message);

      // 2. Validate access check
      prismaDeepMock.conversation.findUnique.mockResolvedValue({
        id: mockConversationId,
        isCommunity: false,
        expiresAt: new Date(Date.now() + 100000), // Valid future date
      } as unknown as Conversation);
      prismaDeepMock.conversationParticipant.findUnique.mockResolvedValue({
        userId: mockUserId,
        conversationId: mockConversationId,
        status: "ACCEPTED",
      } as unknown as ConversationParticipant);

      // 3. Update execution
      prismaDeepMock.message.update.mockResolvedValue({
        id: mockMessageId,
      } as unknown as Message);

      await softDeleteMessage(mockUserId, mockMessageId);

      expect(prismaDeepMock.message.update).toHaveBeenCalledWith({
        where: { id: mockMessageId },
        data: { deletedAt: expect.any(Date) },
      });
    });
  });

  describe("scheduleConversationDeletion", () => {
    it("should set deletedByUserId and deletionScheduledAt", async () => {
      prismaDeepMock.conversation.findFirst.mockResolvedValue({
        id: mockConversationId,
      } as unknown as Conversation);

      prismaDeepMock.conversation.update.mockResolvedValue({
        id: mockConversationId,
      } as unknown as Conversation);

      await scheduleConversationDeletion(mockUserId, mockConversationId);

      expect(prismaDeepMock.conversation.update).toHaveBeenCalledWith({
        where: { id: mockConversationId },
        data: {
          deletedByUserId: mockUserId,
          deletionScheduledAt: expect.any(Date),
        },
      });
    });
  });

  describe("cancelConversationDeletion", () => {
    it("should throw if the user is not the initiator", async () => {
      prismaDeepMock.conversation.findFirst.mockResolvedValue({
        id: mockConversationId,
        deletedByUserId: TEST_IDS.otherUser, // Someone else scheduled the deletion
        isCommunity: false,
        communityId: null,
        durationHours: 24,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60),
        name: null,
        image: null,
        avatarEmoji: null,
        avatarBgColor: null,
        isDummy: false,
        deletionScheduledAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as unknown as Conversation);

      await expect(
        cancelConversationDeletion(mockUserId, mockConversationId),
      ).rejects.toThrow("Only the user who initiated deletion can cancel it");
    });

    it("should clear the deletion fields if the user is the initiator", async () => {
      prismaDeepMock.conversation.findUnique.mockResolvedValue({
        id: mockConversationId,
        deletedByUserId: mockUserId,
        isCommunity: false,
        communityId: null,
        durationHours: 24,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60), // 1 hour in the future
        name: null,
        image: null,
        avatarEmoji: null,
        avatarBgColor: null,
        isDummy: false,
        deletionScheduledAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as unknown as Conversation);

      prismaDeepMock.conversation.update.mockResolvedValue({
        id: mockConversationId,
        isCommunity: false,
        communityId: null,
        durationHours: 24,
        expiresAt: new Date(),
        name: null,
        image: null,
        avatarEmoji: null,
        avatarBgColor: null,
        isDummy: false,
        deletedByUserId: null,
        deletionScheduledAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as unknown as Conversation);

      await cancelConversationDeletion(mockUserId, mockConversationId);

      expect(prismaDeepMock.conversation.update).toHaveBeenCalledWith({
        where: { id: mockConversationId },
        data: {
          deletedByUserId: null,
          deletionScheduledAt: null,
        },
      });
    });
  });

  describe("Group Chat Management", () => {
    const mockUserId = "user-1";
    const mockConvoId = "convo-1";

    beforeEach(() => {
      // Mock validateAccess success by finding a conversation and a participant
      prismaDeepMock.conversationParticipant.findUnique.mockResolvedValue({
        userId: mockUserId,
        conversationId: mockConvoId,
        status: "ACCEPTED",
      } as unknown as ConversationParticipant);

      // Clear any previous mocks and set up both findUnique and findFirst
      prismaDeepMock.conversation.findUnique.mockReset();
      prismaDeepMock.conversation.findFirst.mockReset();
      const convo = {
        id: mockConversationId,
        deletedByUserId: mockUserId,
        isCommunity: false,
        communityId: null,
        durationHours: 24,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60),
        name: null,
        image: null,
        avatarEmoji: null,
        avatarBgColor: null,
        isDummy: false,
        deletionScheduledAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as unknown as Conversation;
      prismaDeepMock.conversation.findUnique.mockResolvedValue(convo);
      prismaDeepMock.conversation.findFirst.mockResolvedValue(convo);
      prismaDeepMock.user.findUnique.mockResolvedValue(
        createMockUser({
          id: mockUserId,
          name: "Admin",
          username: "admin",
          email: TEST_EMAILS.author,
          onboarded: true,
        }) as unknown as User,
      );
    });

    describe("updateConversation", () => {
      it("should reject updates for 1:1 chats", async () => {
        prismaDeepMock.conversationParticipant.count.mockResolvedValueOnce(2);

        await expect(
          updateConversation(mockUserId, mockConvoId, { name: "New Name" }),
        ).rejects.toThrow("Cannot edit 1:1 conversations");
      });

      it("should update conversation and create system message for groups", async () => {
        prismaDeepMock.conversationParticipant.count.mockResolvedValueOnce(3);
        prismaDeepMock.conversation.update.mockResolvedValueOnce({
          isDummy: false,
          id: mockConvoId,
          name: "New Group Name",
          image: null,
          avatarEmoji: null,
          avatarBgColor: null,
          durationHours: 24,
          expiresAt: new Date(Date.now() + 100000),
          deletedByUserId: null,
          deletionScheduledAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          communityId: null,
          isCommunity: false,
        });
        prismaDeepMock.message.createMany.mockResolvedValueOnce({ count: 1 });

        await updateConversation(mockUserId, mockConvoId, {
          name: "New Group Name",
        });

        expect(prismaDeepMock.conversation.update).toHaveBeenCalledWith({
          where: { id: mockConvoId },
          data: {
            name: "New Group Name",
            image: null,
            avatarEmoji: null,
            avatarBgColor: null,
          },
        });
        expect(prismaDeepMock.message.createMany).toHaveBeenCalledWith({
          data: [
            expect.objectContaining({
              isSystem: true,
              messageType: "GROUP_UPDATE",
              content: expect.stringContaining(
                '"key":"chat_system.group_renamed"',
              ),
            }),
          ],
        });
      });

      it("should update group conversation with icon emoji and background color", async () => {
        prismaDeepMock.conversationParticipant.count.mockResolvedValueOnce(3);
        // Mock the conversation returned by validateAccess to have name: "Old Name"
        prismaDeepMock.conversation.findUnique.mockResolvedValue({
          isDummy: false,
          id: mockConvoId,
          name: "Old Name",
          image: null,
          avatarEmoji: null,
          avatarBgColor: null,
          durationHours: 24,
          expiresAt: new Date(Date.now() + 100000),
          deletedByUserId: null,
          deletionScheduledAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          communityId: null,
          isCommunity: false,
        });
        prismaDeepMock.conversation.update.mockResolvedValueOnce({
          isDummy: false,
          id: mockConvoId,
          name: "Old Name",
          image: null,
          avatarEmoji: "🌿",
          avatarBgColor: "#a8ddc8",
          durationHours: 24,
          expiresAt: new Date(Date.now() + 100000),
          deletedByUserId: null,
          deletionScheduledAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          communityId: null,
          isCommunity: false,
        });
        prismaDeepMock.message.createMany.mockResolvedValueOnce({ count: 1 });

        await updateConversation(mockUserId, mockConvoId, {
          avatarEmoji: "🌿",
          avatarBgColor: "#a8ddc8",
        });

        expect(prismaDeepMock.conversation.update).toHaveBeenCalledWith({
          where: { id: mockConvoId },
          data: {
            name: "Old Name",
            image: null,
            avatarEmoji: "🌿",
            avatarBgColor: "#a8ddc8",
          },
        });
        // System message should be emitted for avatar change
        expect(prismaDeepMock.message.createMany).toHaveBeenCalledWith({
          data: [
            expect.objectContaining({
              isSystem: true,
              messageType: "GROUP_UPDATE",
            }),
          ],
        });
      });

      it("should not emit system message when nothing changed", async () => {
        prismaDeepMock.conversationParticipant.count.mockResolvedValueOnce(3);
        prismaDeepMock.conversation.update.mockResolvedValueOnce({
          isDummy: false,
          id: mockConvoId,
          name: "Old Name",
          image: null,
          avatarEmoji: null,
          avatarBgColor: null,
          durationHours: 24,
          expiresAt: new Date(Date.now() + 100000),
          deletedByUserId: null,
          deletionScheduledAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          communityId: null,
          isCommunity: false,
        });

        // Pass the same values as current conversation state - no change
        await updateConversation(mockUserId, mockConvoId, {});

        expect(prismaDeepMock.message.createMany).not.toHaveBeenCalled();
      });
    });

    describe("updateParticipantNickname", () => {
      it("should update nickname and log system message", async () => {
        prismaDeepMock.conversationParticipant.findUnique.mockResolvedValueOnce(
          {
            userId: "user-2",
            conversationId: mockConvoId,
            nickname: null,
            status: "ACCEPTED",
            joinedAt: new Date(),
            user: { id: "user-2", name: "John", username: "john" },
          } as unknown as ConversationParticipant & {
            user: { id: string; name: string; username: string };
          },
        );
        prismaDeepMock.conversationParticipant.update.mockResolvedValueOnce({
          userId: "user-2",
          conversationId: mockConvoId,
          nickname: "Johnny",
          status: "ACCEPTED",
          joinedAt: new Date(),
          isMuted: false,
          lastReadAt: new Date(),
        });

        prismaDeepMock.message.create.mockResolvedValueOnce({
          isDummy: false,
          id: "msg-2",
          conversationId: mockConvoId,
          senderId: mockUserId,
          content: "system message",
          isSystem: true,
          messageType: "NICKNAME_UPDATE",
          replyToId: null,
          dailyStatusId: null,
          createdAt: new Date(),
          deletedAt: null,
          isAnonymous: false,
          minigameId: null,
        });

        await updateParticipantNickname(mockUserId, mockConvoId, "user-2", {
          nickname: "Johnny",
        });

        expect(
          prismaDeepMock.conversationParticipant.update,
        ).toHaveBeenCalledWith({
          where: {
            userId_conversationId: {
              userId: "user-2",
              conversationId: mockConvoId,
            },
          },
          data: { nickname: "Johnny" },
        });
        expect(prismaDeepMock.message.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            isSystem: true,
            messageType: "NICKNAME_UPDATE",
          }),
        });
      });
    });

    describe("removeParticipant", () => {
      it("should reject removal if participant count <= 2", async () => {
        prismaDeepMock.conversationParticipant.count.mockResolvedValueOnce(2);

        await expect(
          removeParticipant(mockUserId, mockConvoId, "user-2"),
        ).rejects.toThrow("Cannot remove users from a 1:1 conversation");
      });

      it("should remove participant and log system message", async () => {
        prismaDeepMock.conversationParticipant.count.mockResolvedValueOnce(3);
        prismaDeepMock.conversationParticipant.findUnique.mockResolvedValueOnce(
          {
            userId: "user-2",
            conversationId: mockConvoId,
            nickname: null,
            status: "ACCEPTED",
            joinedAt: new Date(),
            user: { id: "user-2", name: "John", username: "john" },
          } as unknown as ConversationParticipant & {
            user: { id: string; name: string; username: string };
          },
        );

        prismaDeepMock.conversationParticipant.delete.mockResolvedValueOnce({
          userId: "user-2",
          conversationId: mockConvoId,
          nickname: null,
          status: "ACCEPTED",
          joinedAt: new Date(),
          isMuted: false,
          lastReadAt: new Date(),
        });

        prismaDeepMock.message.create.mockResolvedValueOnce({
          isDummy: false,
          id: "msg-3",
          conversationId: mockConvoId,
          senderId: mockUserId,
          content: "system message",
          isSystem: true,
          messageType: "USER_REMOVED",
          replyToId: null,
          dailyStatusId: null,
          createdAt: new Date(),
          deletedAt: null,
          isAnonymous: false,
          minigameId: null,
        });

        await removeParticipant(mockUserId, mockConvoId, "user-2");

        expect(
          prismaDeepMock.conversationParticipant.delete,
        ).toHaveBeenCalledWith({
          where: {
            userId_conversationId: {
              userId: "user-2",
              conversationId: mockConvoId,
            },
          },
        });
        expect(prismaDeepMock.message.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            isSystem: true,
            messageType: "USER_REMOVED",
            content: expect.stringContaining(
              '"key":"chat_system.user_removed"',
            ),
          }),
        });
      });
    });
  });
});

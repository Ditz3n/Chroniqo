// __tests__/services/niqo.service.test.ts

/*
 * This file tests the Niqo AI service, ensuring the core chat logic functions properly.
 * It verifies that old conversations are properly nuked when starting a new chat,
 * that messages are appended correctly to existing chats, and that the Gemini API
 * is called with the correct filtered payloads and context history, specifically
 * validating the dedicated NiqoChat and NiqoMessage models.
 */

import { prisma as prismaMock } from "@/lib/prisma";
import { NiqoService } from "@/services/niqo.service";
import { NiqoChat, NiqoMessage, PrismaClient } from "@prisma/client";
import { DeepMockProxy } from "jest-mock-extended";
import { TEST_IDS } from "../utils/test-constants";
import { createMockUser } from "../utils/test-utils";

// 1. Mock Prisma
jest.mock("@/lib/prisma");
const prismaDeepMock = prismaMock as unknown as DeepMockProxy<PrismaClient>;

// 2. Mock Google Generative AI - factory is fully self-contained to avoid hoisting issues.
// niqo.service.ts calls getGenerativeModel() at module load time, so the mock must
// provide a working implementation immediately. Inner mocks are exposed via __mocks
// so tests can set return values and assert calls without outer variable references.
jest.mock("@google/generative-ai", () => {
  const mockSendMessage = jest.fn();
  const mockStartChat = jest
    .fn()
    .mockReturnValue({ sendMessage: mockSendMessage });
  const mockGenerateContent = jest.fn();

  return {
    GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
      getGenerativeModel: jest.fn().mockReturnValue({
        generateContent: mockGenerateContent,
        startChat: mockStartChat,
      }),
    })),
    __mocks: { mockGenerateContent, mockSendMessage, mockStartChat },
  };
});

// Access the inner mocks through the module after it has been set up
import * as GoogleGenAI from "@google/generative-ai";

type GoogleGenAIMocks = {
  mockGenerateContent: jest.Mock;
  mockSendMessage: jest.Mock;
  mockStartChat: jest.Mock;
};

const { mockGenerateContent, mockSendMessage, mockStartChat } = (
  GoogleGenAI as unknown as { __mocks: GoogleGenAIMocks }
).__mocks;

describe("Niqo Service", () => {
  const mockUserId = TEST_IDS.user;
  const mockActualUser = createMockUser({
    id: mockUserId,
    username: "real_user",
  });

  beforeEach(() => {
    jest.clearAllMocks();
    // Default arrange for finding the current user
    prismaDeepMock.user.findUnique.mockResolvedValue(mockActualUser);
  });

  describe("getRecentChat", () => {
    it("should fetch the active NiqoChat for the user", async () => {
      // Arrange
      const mockChat = {
        id: TEST_IDS.conversation,
        userId: mockUserId,
        createdAt: new Date(),
        updatedAt: new Date(),
        messages: [{ content: "Hello!", role: "USER" }],
      };
      prismaDeepMock.niqoChat.findUnique.mockResolvedValue(mockChat);

      // Act
      const result = await NiqoService.getRecentChat(mockUserId);

      // Assert
      expect(prismaDeepMock.niqoChat.findUnique).toHaveBeenCalledWith({
        where: { userId: mockUserId },
        include: {
          messages: {
            where: { role: "USER" },
            orderBy: { createdAt: "asc" },
            take: 1,
          },
        },
      });
      expect(result).toEqual({
        id: mockChat.id,
        preview: "Hello!",
      });
    });
  });

  describe("startNewChat", () => {
    it("should delete old chat, create a new one, and save the user's message", async () => {
      // Arrange
      const content = "Hello Niqo!";

      const mockNewChat: NiqoChat = {
        id: TEST_IDS.conversation,
        userId: mockUserId,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prismaDeepMock.niqoChat.delete.mockResolvedValue({
        id: "old-id",
        userId: mockUserId,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      prismaDeepMock.niqoChat.create.mockResolvedValue(mockNewChat);
      prismaDeepMock.niqoMessage.create.mockResolvedValue({
        id: TEST_IDS.message,
        niqoChatId: mockNewChat.id,
        role: "USER",
        content: "Hello Niqo!",
        createdAt: new Date(),
      } as NiqoMessage);

      // Act
      const result = await NiqoService.startNewChat(mockUserId, content);

      // Assert
      expect(prismaDeepMock.niqoChat.delete).toHaveBeenCalledWith({
        where: { userId: mockUserId },
      });
      expect(prismaDeepMock.niqoChat.create).toHaveBeenCalledWith({
        data: { userId: mockUserId },
      });

      // Only the USER message is created
      expect(prismaDeepMock.niqoMessage.create).toHaveBeenCalledTimes(1);
      expect(prismaDeepMock.niqoMessage.create).toHaveBeenCalledWith({
        data: { niqoChatId: mockNewChat.id, role: "USER", content },
      });
      expect(result).toEqual(TEST_IDS.conversation);
    });

    it("should proceed if there is no old chat to delete", async () => {
      // Arrange
      prismaDeepMock.niqoChat.delete.mockRejectedValue(
        new Error("Record not found"),
      );

      prismaDeepMock.niqoChat.create.mockResolvedValue({
        id: TEST_IDS.conversation,
        userId: mockUserId,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as NiqoChat);

      // Act
      await NiqoService.startNewChat(mockUserId, "Hello!");

      // Assert
      expect(prismaDeepMock.niqoChat.create).toHaveBeenCalled();
    });

    it("should not call Gemini or create a MODEL message if Gemini fails, since startNewChat does not call Gemini", async () => {
      // Arrange
      prismaDeepMock.niqoChat.create.mockResolvedValue({
        id: TEST_IDS.conversation,
        userId: mockUserId,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as NiqoChat);
      mockGenerateContent.mockRejectedValue(new Error("API Down"));

      // Act
      await NiqoService.startNewChat(mockUserId, "Hello!");

      // Assert
      // Only the USER message is created
      expect(prismaDeepMock.niqoMessage.create).toHaveBeenCalledTimes(1);
      expect(prismaDeepMock.niqoMessage.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            role: "USER",
            content: "Hello!",
          }),
        }),
      );
    });
  });

  describe("sendMessage", () => {
    it("should append a message and include context history in the AI request", async () => {
      // Arrange
      const content = "How do I cope with fatigue?";
      const chatId = TEST_IDS.conversation;

      const mockChatWithHistory: NiqoChat & { messages: NiqoMessage[] } = {
        id: chatId,
        userId: mockUserId,
        createdAt: new Date(),
        updatedAt: new Date(),
        messages: [
          {
            id: "msg-1",
            niqoChatId: chatId,
            role: "USER",
            content: "Hi",
            createdAt: new Date(),
          },
          {
            id: "msg-2",
            niqoChatId: chatId,
            role: "MODEL",
            content: "Hello",
            createdAt: new Date(),
          },
        ],
      };

      prismaDeepMock.niqoChat.findUnique.mockResolvedValue(mockChatWithHistory);
      prismaDeepMock.niqoMessage.create.mockResolvedValue({
        id: "new-ai-msg",
        niqoChatId: chatId,
        role: "MODEL",
        content: "Resting is important.",
        createdAt: new Date(),
      } as NiqoMessage);

      mockSendMessage.mockResolvedValue({
        response: { text: () => "Resting is important." },
      });

      // Act
      await NiqoService.sendMessage(mockUserId, chatId, content);

      // Assert
      expect(prismaDeepMock.niqoChat.findUnique).toHaveBeenCalled();

      // Verifies the role mapping logic to Gemini format
      expect(mockStartChat).toHaveBeenCalledWith({
        history: [
          { role: "user", parts: [{ text: "Hi" }] },
          { role: "model", parts: [{ text: "Hello" }] },
        ],
      });

      expect(mockSendMessage).toHaveBeenCalledWith(
        "How do I cope with fatigue?",
      );
      expect(prismaDeepMock.niqoMessage.create).toHaveBeenCalledTimes(2); // User msg + AI msg
    });
  });
});

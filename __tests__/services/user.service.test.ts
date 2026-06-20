// __tests__/services/user.service.test.ts

/*
 * This file tests the user service, specifically the logic for
 * retrieving and updating user quick-reaction preferences.
 */

import { prisma as prismaMock } from "@/lib/prisma";
import {
  canViewDailyStatus,
  getQuickReactions,
  updateQuickReactions,
} from "@/services/user.service";
import { PrismaClient, User } from "@prisma/client";
import { DeepMockProxy } from "jest-mock-extended";

jest.mock("@/lib/prisma");

const prismaDeepMock = prismaMock as unknown as DeepMockProxy<PrismaClient>;

describe("User Service - Quick Reactions", () => {
  const mockUserId = "user-123";
  const defaultEmojis = ["❤️", "😂", "😮", "😢", "😡", "👍"];
  const customEmojis = ["🚀", "🔥", "💯", "👀", "🙌", "✨"];

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("getQuickReactions", () => {
    it("should return the user's custom quick reactions if they exist", async () => {
      prismaDeepMock.user.findUnique.mockResolvedValue({
        quickReactions: customEmojis,
      } as unknown as User);

      const result = await getQuickReactions(mockUserId);

      expect(prismaDeepMock.user.findUnique).toHaveBeenCalledWith({
        where: { id: mockUserId },
        select: { quickReactions: true },
      });
      expect(result).toEqual(customEmojis);
    });

    it("should return default emojis if the user is not found or has none", async () => {
      prismaDeepMock.user.findUnique.mockResolvedValue(null);

      const result = await getQuickReactions(mockUserId);

      expect(result).toEqual(defaultEmojis);
    });
  });

  describe("updateQuickReactions", () => {
    it("should update the user's quick reactions and return the updated array", async () => {
      prismaDeepMock.user.update.mockResolvedValue({
        quickReactions: customEmojis,
      } as unknown as User);

      const result = await updateQuickReactions(mockUserId, customEmojis);

      expect(prismaDeepMock.user.update).toHaveBeenCalledWith({
        where: { id: mockUserId },
        data: { quickReactions: customEmojis },
        select: { quickReactions: true },
      });
      expect(result).toEqual(customEmojis);
    });
  });
});

describe("canViewDailyStatus", () => {
  const publicTarget = { id: "target-1", isPrivate: false };
  const privateTarget = { id: "target-2", isPrivate: true };

  it("always returns true when the viewer is the target (own profile)", () => {
    // Owns the profile . always sees their own status regardless of privacy
    expect(canViewDailyStatus("target-1", publicTarget, new Set())).toBe(true);
    expect(canViewDailyStatus("target-2", privateTarget, new Set())).toBe(true);
  });

  it("returns true for a public profile regardless of friendship", () => {
    expect(canViewDailyStatus("viewer", publicTarget, new Set())).toBe(true);
    expect(
      canViewDailyStatus("viewer", publicTarget, new Set(["target-1"])),
    ).toBe(true);
  });

  it("returns false for a private profile when the viewer is not a friend", () => {
    expect(canViewDailyStatus("viewer", privateTarget, new Set())).toBe(false);
    // Other users in the friend set don't count
    expect(
      canViewDailyStatus("viewer", privateTarget, new Set(["someone-else"])),
    ).toBe(false);
  });

  it("returns true for a private profile when the viewer is a confirmed friend", () => {
    expect(
      canViewDailyStatus("viewer", privateTarget, new Set(["target-2"])),
    ).toBe(true);
  });
});

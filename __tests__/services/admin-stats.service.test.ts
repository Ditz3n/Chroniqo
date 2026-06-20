// __tests__/services/admin-stats.service.test.ts

/*
 * Tests for the admin stats service, which aggregates platform-wide metrics.
 * The 18 count queries run inside a single $transaction call, while the
 * dailyStatus.groupBy query runs separately so Prisma can infer its return
 * type correctly. Tests verify correct stat mapping, mood distribution
 * normalization across all 5 dagsform values (0-4), and edge cases such as
 * zero users (no division-by-zero in onboardingRate) and an empty mood
 * dataset (no NaN percentages).
 */

import { prisma as prismaMock } from "@/lib/prisma";
import { getPlatformStats } from "@/services/admin-stats.service";
import { PrismaClient } from "@prisma/client";
import { DeepMockProxy } from "jest-mock-extended";

jest.mock("@/lib/prisma");

const prismaDeepMock = prismaMock as unknown as DeepMockProxy<PrismaClient>;

// Transaction result indices - must match the order inside getPlatformStats.
// moodGrouped is intentionally absent: it runs outside $transaction.
const IDX = {
  totalUsers: 0,
  newUsersThisPeriod: 1,
  newUsersLastPeriod: 2,
  onboardedUsers: 3,
  totalPosts: 4,
  postsThisPeriod: 5,
  postsLastPeriod: 6,
  totalComments: 7,
  commentsThisPeriod: 8,
  commentsLastPeriod: 9,
  totalCommunities: 10,
  activeCommunities: 11,
  suspendedCommunities: 12,
  newCommunitiesThisPeriod: 13,
  activeBans: 14,
  activeMutes: 15,
  totalReports: 16,
  suppressedReports: 17,
} as const;

type MockMoodRow = { value: number; _count: { value: number } };

/** Builds the 18-element transaction result array from a partial override map */
function buildTransactionResult(
  overrides: Partial<Record<keyof typeof IDX, number>> = {},
): unknown[] {
  const defaults: unknown[] = Array(18).fill(0);

  for (const [key, value] of Object.entries(overrides)) {
    const idx = IDX[key as keyof typeof IDX];
    defaults[idx] = value;
  }

  return defaults;
}

describe("getPlatformStats", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default empty mood data so non-mood tests don't need to set it up
    prismaDeepMock.dailyStatus.groupBy.mockResolvedValue([]);
  });

  describe("users", () => {
    it("should return correct user stats", async () => {
      // Arrange
      prismaDeepMock.$transaction.mockResolvedValue(
        buildTransactionResult({
          totalUsers: 100,
          newUsersThisPeriod: 12,
          newUsersLastPeriod: 8,
          onboardedUsers: 75,
        }),
      );

      // Act
      const result = await getPlatformStats();

      // Assert
      expect(result.users.total).toBe(100);
      expect(result.users.newThisPeriod).toBe(12);
      expect(result.users.newLastPeriod).toBe(8);
      expect(result.users.onboarded).toBe(75);
      expect(result.users.onboardingRate).toBe(75); // 75/100 * 100
    });

    it("should return onboardingRate of 0 when there are no users to avoid division by zero", async () => {
      // Arrange
      prismaDeepMock.$transaction.mockResolvedValue(
        buildTransactionResult({ totalUsers: 0, onboardedUsers: 0 }),
      );

      // Act
      const result = await getPlatformStats();

      // Assert
      expect(result.users.onboardingRate).toBe(0);
    });

    it("should round onboardingRate to the nearest integer", async () => {
      // Arrange - 1 of 3 users onboarded = 33.33...%
      prismaDeepMock.$transaction.mockResolvedValue(
        buildTransactionResult({ totalUsers: 3, onboardedUsers: 1 }),
      );

      // Act
      const result = await getPlatformStats();

      // Assert
      expect(result.users.onboardingRate).toBe(33);
    });
  });

  describe("content", () => {
    it("should return correct post and comment stats", async () => {
      // Arrange
      prismaDeepMock.$transaction.mockResolvedValue(
        buildTransactionResult({
          totalPosts: 500,
          postsThisPeriod: 50,
          postsLastPeriod: 40,
          totalComments: 1200,
          commentsThisPeriod: 120,
          commentsLastPeriod: 95,
        }),
      );

      // Act
      const result = await getPlatformStats();

      // Assert
      expect(result.content.totalPosts).toBe(500);
      expect(result.content.postsThisPeriod).toBe(50);
      expect(result.content.postsLastPeriod).toBe(40);
      expect(result.content.totalComments).toBe(1200);
      expect(result.content.commentsThisPeriod).toBe(120);
      expect(result.content.commentsLastPeriod).toBe(95);
    });
  });

  describe("communities", () => {
    it("should return correct community stats", async () => {
      // Arrange
      prismaDeepMock.$transaction.mockResolvedValue(
        buildTransactionResult({
          totalCommunities: 20,
          activeCommunities: 17,
          suspendedCommunities: 3,
          newCommunitiesThisPeriod: 2,
        }),
      );

      // Act
      const result = await getPlatformStats();

      // Assert
      expect(result.communities.total).toBe(20);
      expect(result.communities.active).toBe(17);
      expect(result.communities.suspended).toBe(3);
      expect(result.communities.newThisPeriod).toBe(2);
    });
  });

  describe("moderation", () => {
    it("should derive pendingReports as totalReports minus suppressedReports", async () => {
      // Arrange
      prismaDeepMock.$transaction.mockResolvedValue(
        buildTransactionResult({
          activeBans: 5,
          activeMutes: 3,
          totalReports: 25,
          suppressedReports: 7,
        }),
      );

      // Act
      const result = await getPlatformStats();

      // Assert
      expect(result.moderation.activeBans).toBe(5);
      expect(result.moderation.activeMutes).toBe(3);
      expect(result.moderation.totalReports).toBe(25);
      expect(result.moderation.pendingReports).toBe(18); // 25 - 7
    });

    it("should return pendingReports of 0 when all reports are suppressed", async () => {
      // Arrange
      prismaDeepMock.$transaction.mockResolvedValue(
        buildTransactionResult({ totalReports: 10, suppressedReports: 10 }),
      );

      // Act
      const result = await getPlatformStats();

      // Assert
      expect(result.moderation.pendingReports).toBe(0);
    });
  });

  describe("mood distribution", () => {
    it("should always return exactly 5 mood slots (one per dagsform value 0-4)", async () => {
      // Arrange - only values 0 and 4 have data; 1, 2, 3 are absent from the DB
      const mockMoodData: MockMoodRow[] = [
        { value: 0, _count: { value: 20 } },
        { value: 4, _count: { value: 80 } },
      ];
      prismaDeepMock.dailyStatus.groupBy.mockResolvedValue(
        mockMoodData as unknown as never,
      );
      prismaDeepMock.$transaction.mockResolvedValue(buildTransactionResult());

      // Act
      const result = await getPlatformStats();

      // Assert
      expect(result.mood.distribution).toHaveLength(5);
      // Missing values are filled with 0
      expect(result.mood.distribution[1]).toEqual({
        value: 1,
        count: 0,
        percentage: 0,
      });
      expect(result.mood.distribution[2]).toEqual({
        value: 2,
        count: 0,
        percentage: 0,
      });
      expect(result.mood.distribution[3]).toEqual({
        value: 3,
        count: 0,
        percentage: 0,
      });
    });

    it("should correctly compute percentages across all 5 dagsform values", async () => {
      // Arrange - 100 entries total for easy percentage verification
      const mockMoodData: MockMoodRow[] = [
        { value: 0, _count: { value: 10 } },
        { value: 1, _count: { value: 20 } },
        { value: 2, _count: { value: 30 } },
        { value: 3, _count: { value: 25 } },
        { value: 4, _count: { value: 15 } },
      ];
      prismaDeepMock.dailyStatus.groupBy.mockResolvedValue(
        mockMoodData as unknown as never,
      );
      prismaDeepMock.$transaction.mockResolvedValue(buildTransactionResult());

      // Act
      const result = await getPlatformStats();

      // Assert
      expect(result.mood.total).toBe(100);
      expect(result.mood.distribution[0]).toEqual({
        value: 0,
        count: 10,
        percentage: 10,
      });
      expect(result.mood.distribution[1]).toEqual({
        value: 1,
        count: 20,
        percentage: 20,
      });
      expect(result.mood.distribution[4]).toEqual({
        value: 4,
        count: 15,
        percentage: 15,
      });
    });

    it("should return all-zero percentages and total=0 when no daily status entries exist", async () => {
      // Arrange - groupBy already defaults to [] in beforeEach
      prismaDeepMock.$transaction.mockResolvedValue(buildTransactionResult());

      // Act
      const result = await getPlatformStats();

      // Assert - no NaN or division by zero
      expect(result.mood.total).toBe(0);
      expect(
        result.mood.distribution.every(
          (d) => d.percentage === 0 && d.count === 0,
        ),
      ).toBe(true);
    });

    it("should sum mood counts into the total field", async () => {
      // Arrange
      const mockMoodData: MockMoodRow[] = [
        { value: 2, _count: { value: 33 } },
        { value: 4, _count: { value: 67 } },
      ];
      prismaDeepMock.dailyStatus.groupBy.mockResolvedValue(
        mockMoodData as unknown as never,
      );
      prismaDeepMock.$transaction.mockResolvedValue(buildTransactionResult());

      // Act
      const result = await getPlatformStats();

      // Assert
      expect(result.mood.total).toBe(100);
    });
  });

  describe("$transaction call", () => {
    it("should call prisma.$transaction exactly once", async () => {
      // Arrange
      prismaDeepMock.$transaction.mockResolvedValue(buildTransactionResult());

      // Act
      await getPlatformStats();

      // Assert - all 18 count aggregations run in a single round-trip
      expect(prismaDeepMock.$transaction).toHaveBeenCalledTimes(1);
    });
  });
});

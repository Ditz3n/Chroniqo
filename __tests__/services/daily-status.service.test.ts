// __tests__/services/daily-status.service.test.ts

/*
 * This file tests the daily status service, which is responsible for handling
 * the creation and retrieval of daily status records for users.
 * The tests cover the upsertDailyStatus function to ensure that it correctly
 * normalizes dates to UTC midnight and interacts with the database as expected.
 * It also tests the getTodayStatus and getMonthStatuses functions to verify that they
 * query the database with the correct date ranges and return the expected results.
 */

import { prisma as prismaMock } from "@/lib/prisma";
import {
  getMonthStatuses,
  getTodayStatus,
  upsertDailyStatus,
} from "@/services/daily-status.service";
import { PrismaClient } from "@prisma/client";
import { DeepMockProxy } from "jest-mock-extended";

// No factory - Jest resolves to src/lib/__mocks__/prisma.ts automatically,
// which preserves all jest-mock-extended methods on the mock object.
jest.mock("@/lib/prisma");

const prismaDeepMock = prismaMock as unknown as DeepMockProxy<PrismaClient>;

describe("Daily Status Service", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("upsertDailyStatus", () => {
    it("should correctly normalize the date to UTC midnight and save the status", async () => {
      const mockUserId = "user-123";
      const mockDto = {
        value: 3,
        note: "Feeling good",
        date: "2026-03-12",
      };

      const expectedNormalizedDate = new Date("2026-03-12T00:00:00Z");
      const mockResult = {
        id: "status-1",
        userId: mockUserId,
        value: 3,
        note: "Feeling good",
        date: expectedNormalizedDate,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prismaDeepMock.dailyStatus.upsert.mockResolvedValue(mockResult);

      const result = await upsertDailyStatus(mockUserId, mockDto);

      expect(prismaDeepMock.dailyStatus.upsert).toHaveBeenCalledTimes(1);
      expect(prismaDeepMock.dailyStatus.upsert).toHaveBeenCalledWith({
        where: {
          userId_date: {
            userId: mockUserId,
            date: expectedNormalizedDate,
          },
        },
        update: { value: 3, note: "Feeling good" },
        create: {
          userId: mockUserId,
          value: 3,
          note: "Feeling good",
          date: expectedNormalizedDate,
        },
      });
      expect(result).toEqual(mockResult);
    });
  });

  describe("getTodayStatus", () => {
    it("should query the database for the current normalized date", async () => {
      const mockUserId = "user-123";
      const mockResult = {
        id: "status-1",
        userId: mockUserId,
        value: 2,
        note: null,
        date: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prismaDeepMock.dailyStatus.findUnique.mockResolvedValue(mockResult);

      const result = await getTodayStatus(mockUserId);

      expect(prismaDeepMock.dailyStatus.findUnique).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockResult);
    });
  });

  describe("getMonthStatuses", () => {
    it("should query records between the first and last day of the provided month", async () => {
      const mockUserId = "user-123";
      const year = 2026;
      const month = 5; // June (0-indexed)

      prismaDeepMock.dailyStatus.findMany.mockResolvedValue([]);

      await getMonthStatuses(mockUserId, year, month);

      const expectedStartDate = new Date(Date.UTC(2026, 5, 1));
      const expectedEndDate = new Date(Date.UTC(2026, 6, 0));

      expect(prismaDeepMock.dailyStatus.findMany).toHaveBeenCalledWith({
        where: {
          userId: mockUserId,
          date: {
            gte: expectedStartDate,
            lte: expectedEndDate,
          },
        },
        orderBy: { date: "asc" },
      });
    });
  });
});

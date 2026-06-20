// src/lib/__mocks__/prisma.ts

/*
 * Jest manual mock for @/lib/prisma.
 * Placed here (adjacent to the real prisma.ts) so that Jest's manual mock
 * resolution picks it up automatically when jest.mock('@/lib/prisma') is called
 * in a test - no moduleNameMapper entry or require() needed.
 */

import { PrismaClient } from "@prisma/client";
import { DeepMockProxy, mockDeep } from "jest-mock-extended";

export const prisma =
  mockDeep<PrismaClient>() as unknown as DeepMockProxy<PrismaClient>;

// Mock $transaction to immediately execute the callback/promises,
// allowing to test service logic that uses interactive transactions.
prisma.$transaction.mockImplementation(async (arg: unknown) => {
  if (typeof arg === "function") {
    return arg(prisma);
  }
  return Promise.all(arg as Promise<unknown>[]);
});

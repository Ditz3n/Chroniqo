/**
 * @jest-environment node
 */

// __tests__/api/reports/id/route.test.ts

/*
 * This test suite verifies the functionality of the DELETE API route for reports.
 * It checks for proper authentication, authorization, and the successful deletion
 * of a report. Mocking is used to isolate the route logic from the actual database
 * and authentication layers.
 */

import { DELETE } from "@/app/api/reports/[id]/route";
import { auth } from "@/auth";
import { prisma as prismaMock } from "@/lib/prisma";
import { PrismaClient, Report } from "@prisma/client";
import { DeepMockProxy } from "jest-mock-extended";
import type { Session } from "next-auth";

jest.mock("@/auth", () => ({ auth: jest.fn() }));
jest.mock("@/lib/prisma");

const prismaDeepMock = prismaMock as unknown as DeepMockProxy<PrismaClient>;

describe("Delete Report API", () => {
  const mockedAuth = auth as jest.Mock;
  const mockSession: Session = {
    user: {
      id: "mod-1",
      onboarded: true,
      hasPassword: true,
      role: "USER",
      email: "mod@example.com",
    },
    expires: new Date().toISOString(),
  };
  const params = Promise.resolve({ id: "report-123" });

  beforeEach(() => jest.clearAllMocks());

  it("should return 401 if unauthenticated", async () => {
    mockedAuth.mockResolvedValue(null);
    const req = new Request("https://chroniqo.com/api/reports/report-123", {
      method: "DELETE",
    });
    const res = await DELETE(req, { params });
    expect(res.status).toBe(401);
  });

  it("should delete report and return 200", async () => {
    mockedAuth.mockResolvedValue(mockSession);
    prismaDeepMock.report.findUnique.mockResolvedValue({
      id: "report-123",
      targetCommunityId: null,
      targetPost: null,
      targetComment: null,
    } as unknown as Report);
    prismaDeepMock.report.delete.mockResolvedValue({} as unknown as Report);

    const req = new Request("https://chroniqo.com/api/reports/report-123", {
      method: "DELETE",
    });
    const res = await DELETE(req, { params });

    expect(res.status).toBe(200);
    expect(prismaDeepMock.report.delete).toHaveBeenCalledWith({
      where: { id: "report-123" },
    });
  });
});

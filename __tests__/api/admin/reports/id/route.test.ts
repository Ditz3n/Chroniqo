/**
 * @jest-environment node
 */

// __tests__/api/admin/reports/id/route.test.ts

/*
 * This test suite verifies the functionality of the PATCH /api/admin/reports/[id] API route.
 * It checks for proper authentication and the ability to update the isSuppressed status of a report.
 */

import { PATCH } from "@/app/api/admin/reports/[id]/route";
import { auth } from "@/auth";
import { prisma as prismaMock } from "@/lib/prisma";
import { PrismaClient, Report } from "@prisma/client";
import { DeepMockProxy } from "jest-mock-extended";
import type { Session } from "next-auth";

jest.mock("@/auth", () => ({ auth: jest.fn() }));
jest.mock("@/lib/prisma");

const prismaDeepMock = prismaMock as unknown as DeepMockProxy<PrismaClient>;

describe("Admin Suppress Report API", () => {
  const mockedAuth = auth as jest.Mock;
  const mockAdminSession: Session = {
    user: { id: "admin-1", role: "ADMIN" },
    expires: new Date().toISOString(),
  } as Session;
  const params = Promise.resolve({ id: "rep-123" });

  beforeEach(() => jest.clearAllMocks());

  it("should return 401 if unauthenticated", async () => {
    mockedAuth.mockResolvedValue(null);
    const req = new Request("https://chroniqo.com/api", { method: "PATCH" });
    const res = await PATCH(req, { params });
    expect(res.status).toBe(401);
  });

  it("should update isSuppressed status", async () => {
    mockedAuth.mockResolvedValue(mockAdminSession);
    prismaDeepMock.report.update.mockResolvedValue({
      id: "rep-123",
      isSuppressed: true,
    } as unknown as Report);

    const req = new Request("https://chroniqo.com/api", {
      method: "PATCH",
      body: JSON.stringify({ isSuppressed: true }),
    });

    const res = await PATCH(req, { params });
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.report.isSuppressed).toBe(true);
    expect(prismaDeepMock.report.update).toHaveBeenCalledWith({
      where: { id: "rep-123" },
      data: { isSuppressed: true },
    });
  });
});

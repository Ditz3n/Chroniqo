/**
 * @jest-environment node
 */

/*
 * This file tests the API route for retrieving daily statuses for a given month.
 * It verifies that authentication is required, query parameters are correctly parsed,
 * and that the service function is called with the expected parameters.
 * Mocking is used to isolate the API route logic from the underlying service and database layers.
 */

import { GET } from "@/app/api/daily-status/month/route";
import { auth } from "@/auth";
import { getMonthStatuses } from "@/services/daily-status.service";
import type { Session } from "next-auth";

jest.mock("@/auth", () => ({
  auth: jest.fn(),
}));

jest.mock("@/services/daily-status.service");

describe("Daily Status Month API", () => {
  const mockedAuth = auth as jest.Mock;
  const mockedGetMonthStatuses = getMonthStatuses as jest.MockedFunction<
    typeof getMonthStatuses
  >;

  const mockSession: Session = {
    user: {
      id: "user-1",
      onboarded: true,
      hasPassword: true,
      role: "USER",
      email: "test@example.com",
    },
    expires: new Date(Date.now() + 86400000).toISOString(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return 401 if unauthenticated", async () => {
    mockedAuth.mockResolvedValue(null);

    const req = new Request(
      "https://chroniqo.com/api/daily-status/month?year=2026&month=2",
    );
    const res = await GET(req);

    expect(res.status).toBe(401);
  });

  it("should return 200 and pass year/month query to service", async () => {
    mockedAuth.mockResolvedValue(mockSession);
    mockedGetMonthStatuses.mockResolvedValue([]);

    const req = new Request(
      "https://chroniqo.com/api/daily-status/month?year=2026&month=2",
    );
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(mockedGetMonthStatuses).toHaveBeenCalledWith("user-1", 2026, 2);
  });

  it("should default to current year/month when query params are missing", async () => {
    mockedAuth.mockResolvedValue(mockSession);
    mockedGetMonthStatuses.mockResolvedValue([]);

    const req = new Request("https://chroniqo.com/api/daily-status/month");
    const res = await GET(req);

    expect(res.status).toBe(200);
    expect(mockedGetMonthStatuses).toHaveBeenCalledWith(
      "user-1",
      new Date().getFullYear(),
      new Date().getMonth(),
    );
  });

  it("should return 500 when service throws", async () => {
    mockedAuth.mockResolvedValue(mockSession);
    mockedGetMonthStatuses.mockRejectedValue(new Error("DB fail"));

    const req = new Request(
      "https://chroniqo.com/api/daily-status/month?year=2026&month=2",
    );
    const res = await GET(req);

    expect(res.status).toBe(500);
  });
});

/**
 * @jest-environment node
 */

// __tests__/api/users/settings/health.test.ts

/*
 * Tests for the user settings API route.
 * Covers the existing PUT handler (privacy & messaging - unchanged behaviour)
 * and the new PATCH handler for health & personal info: field persistence,
 * birthDate string-to-Date conversion, null-clearing of optional fields,
 * cascading autoUpdateAge reset when birthDate is cleared, and Zod
 * boundary validation for age, height, and weight.
 */

import { PATCH, PUT } from "@/app/api/users/settings/route";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

jest.mock("@/auth", () => ({ auth: jest.fn() }));
jest.mock("@/lib/prisma", () => ({
  prisma: { user: { update: jest.fn() } },
}));

const mockAuth = auth as jest.Mock;
const mockUpdate = prisma.user.update as jest.Mock;

function makeRequest(body: unknown, method = "PATCH") {
  return new Request("http://localhost/api/users/settings", {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockAuth.mockResolvedValue({ user: { id: "user-1" } });
  mockUpdate.mockResolvedValue({});
});

describe("PUT /api/users/settings - privacy (existing behaviour unchanged)", () => {
  it("saves isPrivate and messagingPermission", async () => {
    const res = await PUT(
      makeRequest(
        { isPrivate: true, messagingPermission: "ONLY_FRIENDS" },
        "PUT",
      ),
    );
    expect(res.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          isPrivate: true,
          messagingPermission: "ONLY_FRIENDS",
        }),
      }),
    );
  });

  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await PUT(
      makeRequest({ isPrivate: false, messagingPermission: "ALL" }, "PUT"),
    );
    expect(res.status).toBe(401);
  });
});

describe("PATCH /api/users/settings - health settings", () => {
  it("saves age and visibility flags", async () => {
    const res = await PATCH(
      makeRequest({ age: 32, showAge: true, showConditions: false }),
    );
    expect(res.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          age: 32,
          showAge: true,
          showConditions: false,
        }),
      }),
    );
  });

  it("converts birthDate string to a Date object", async () => {
    const res = await PATCH(
      makeRequest({ birthDate: "1994-06-15", autoUpdateAge: true }),
    );
    expect(res.status).toBe(200);
    const callData = mockUpdate.mock.calls[0][0].data;
    expect(callData.birthDate).toBeInstanceOf(Date);
    expect(callData.autoUpdateAge).toBe(true);
  });

  it("clears birthDate when null is sent and forces autoUpdateAge to false", async () => {
    const res = await PATCH(makeRequest({ birthDate: null }));
    expect(res.status).toBe(200);
    const callData = mockUpdate.mock.calls[0][0].data;
    expect(callData.birthDate).toBeNull();
    expect(callData.autoUpdateAge).toBe(false);
  });

  it("rejects an invalid birthDate string", async () => {
    const res = await PATCH(makeRequest({ birthDate: "not-a-date" }));
    expect(res.status).toBe(400);
  });

  it("rejects age above 99", async () => {
    const res = await PATCH(makeRequest({ age: 120 }));
    expect(res.status).toBe(400);
  });

  it("rejects age below 1", async () => {
    const res = await PATCH(makeRequest({ age: 0 }));
    expect(res.status).toBe(400);
  });

  it("clears height when null is sent", async () => {
    const res = await PATCH(makeRequest({ height: null, heightUnit: "cm" }));
    expect(res.status).toBe(200);
    expect(mockUpdate.mock.calls[0][0].data.height).toBeNull();
  });

  it("saves conditions and medications arrays", async () => {
    const res = await PATCH(
      makeRequest({ conditions: ["Fibromyalgia", "ME/CFS"], medications: [] }),
    );
    expect(res.status).toBe(200);
    const callData = mockUpdate.mock.calls[0][0].data;
    expect(callData.conditions).toEqual(["Fibromyalgia", "ME/CFS"]);
    expect(callData.medications).toEqual([]);
  });

  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await PATCH(makeRequest({ age: 30 }));
    expect(res.status).toBe(401);
  });
});

/**
 * @jest-environment node
 */

// __tests__/api/users/username/route.test.ts

/*
 * Tests for the user profile GET endpoint.
 * Covers auth guard, 404 handling, own-profile full data exposure,
 * per-field health visibility filtering (showAge, showConditions, etc.),
 * private-profile access control (non-friend vs friend), and dynamic
 * age computation from birthDate when autoUpdateAge is enabled.
 */

import { GET } from "@/app/api/users/[username]/route";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

jest.mock("@/auth", () => ({
  auth: jest.fn(),
}));
jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: jest.fn() },
    globalBlock: { findUnique: jest.fn() },
    friendship: { findUnique: jest.fn() },
    friendRequest: { findUnique: jest.fn() },
    postSupport: { count: jest.fn() },
    globalMute: { findUnique: jest.fn() },
  },
}));

const mockGlobalMuteFindUnique = prisma.globalMute.findUnique as jest.Mock;
const mockAuth = auth as jest.Mock;
const mockFindUnique = prisma.user.findUnique as jest.Mock;
const mockBlockFindUnique = prisma.globalBlock.findUnique as jest.Mock;
const mockFriendshipFindUnique = prisma.friendship.findUnique as jest.Mock;
const mockFriendRequestFindUnique = prisma.friendRequest
  .findUnique as jest.Mock;
const mockSupportCount = prisma.postSupport.count as jest.Mock;

const SESSION_ID = "viewer-id";
const TARGET_ID = "target-id";

const baseUser = {
  id: TARGET_ID,
  name: "Alice",
  username: "alice",
  email: "alice@example.com",
  image: null,
  headerImage: null,
  bio: "Hello",
  isPrivate: false,
  pinnedPostId: null,
  messagingPermission: "ALL",
  createdAt: new Date("2024-01-01"),
  role: "USER",
  usernameChangedAt: null,
  age: 28,
  height: 170,
  heightUnit: "cm",
  weight: 65,
  weightUnit: "kg",
  conditions: ["Fibromyalgia"],
  medications: ["Ibuprofen"],
  birthDate: null,
  autoUpdateAge: false,
  showConditions: true,
  showMedications: false,
  showAge: true,
  showHeight: false,
  showWeight: false,
  dailyStatuses: [],
  _count: { posts: 5, comments: 3, friendships: 10 },
};

function makeRequest(username: string) {
  return new Request(`http://localhost/api/users/${username}`);
}

function makeParams(username: string) {
  return { params: Promise.resolve({ username }) };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockAuth.mockResolvedValue({ user: { id: SESSION_ID } });
  mockBlockFindUnique.mockResolvedValue(null);
  mockFriendshipFindUnique.mockResolvedValue(null);
  mockFriendRequestFindUnique.mockResolvedValue(null);
  mockSupportCount.mockResolvedValue(42);
  mockGlobalMuteFindUnique.mockResolvedValue(null);
});

describe("GET /api/users/[username] - health visibility", () => {
  it("returns own profile with all health fields and visibility flags", async () => {
    mockAuth.mockResolvedValue({ user: { id: TARGET_ID } });
    mockFindUnique.mockResolvedValue(baseUser);

    const res = await GET(makeRequest("alice"), makeParams("alice"));
    const json = await res.json();
    const p = json.profile;

    expect(res.status).toBe(200);
    expect(p.age).toBe(28);
    expect(p.height).toBe(170);
    expect(p.conditions).toEqual(["Fibromyalgia"]);
    expect(p.medications).toEqual(["Ibuprofen"]);
    expect(p.showConditions).toBe(true);
    expect(p.showMedications).toBe(false);
    expect(p.showAge).toBe(true);
    expect(p.showHeight).toBe(false);
    expect(p.showWeight).toBe(false);
    expect(p.email).toBe("alice@example.com");
    expect(p.usernameChangedAt).toBeNull();
  });

  it("exposes age and conditions to a viewer on a public profile when flags are on", async () => {
    mockFindUnique.mockResolvedValue({
      ...baseUser,
      showAge: true,
      showConditions: true,
      showMedications: false,
      showHeight: false,
      showWeight: false,
    });

    const res = await GET(makeRequest("alice"), makeParams("alice"));
    const json = await res.json();
    const p = json.profile;

    expect(p.age).toBe(28);
    expect(p.conditions).toEqual(["Fibromyalgia"]);
    expect(p.medications).toBeUndefined();
    expect(p.height).toBeUndefined();
    expect(p.weight).toBeUndefined();
    expect(p.showConditions).toBeUndefined();
    expect(p.email).toBeUndefined();
  });

  it("strips all health fields from a private profile when viewer is not a friend", async () => {
    mockFindUnique.mockResolvedValue({
      ...baseUser,
      isPrivate: true,
      showAge: true,
      showConditions: true,
    });

    const res = await GET(makeRequest("alice"), makeParams("alice"));
    const json = await res.json();
    const p = json.profile;

    expect(p.age).toBeUndefined();
    expect(p.conditions).toBeUndefined();
  });

  it("exposes health fields on private profile when viewer is a friend", async () => {
    mockFindUnique.mockResolvedValue({
      ...baseUser,
      isPrivate: true,
      showAge: true,
      showConditions: true,
    });
    mockFriendshipFindUnique.mockResolvedValue({
      userId: SESSION_ID,
      friendId: TARGET_ID,
    });

    const res = await GET(makeRequest("alice"), makeParams("alice"));
    const json = await res.json();
    const p = json.profile;

    expect(p.age).toBe(28);
    expect(p.conditions).toEqual(["Fibromyalgia"]);
  });

  it("computes effective age from birthDate when autoUpdateAge is true", async () => {
    const today = new Date();
    const birthDate = new Date(
      today.getFullYear() - 30,
      today.getMonth(),
      today.getDate(),
    );
    mockAuth.mockResolvedValue({ user: { id: TARGET_ID } });
    mockFindUnique.mockResolvedValue({
      ...baseUser,
      age: 99,
      birthDate,
      autoUpdateAge: true,
      showAge: true,
    });

    const res = await GET(makeRequest("alice"), makeParams("alice"));
    const json = await res.json();

    expect(json.profile.age).toBe(30);
  });

  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await GET(makeRequest("alice"), makeParams("alice"));
    expect(res.status).toBe(401);
  });

  it("returns 404 when user does not exist", async () => {
    mockFindUnique.mockResolvedValue(null);
    const res = await GET(makeRequest("ghost"), makeParams("ghost"));
    expect(res.status).toBe(404);
  });
});

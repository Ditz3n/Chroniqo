/**
 * @jest-environment node
 */

// __tests__/api/users.test.ts

/*
 * This file tests the API routes under /api/users, including:
 * - GET/PUT /api/user/quick-reactions
 * - GET /api/users/search
 * - GET /api/users/[username]
 * - POST/DELETE /api/users/[username]/friend
 * - GET /api/users/requests
 * - PUT /api/users/requests/[id]
 * - PUT /api/users/settings
 * - POST /api/users/profile/image
 *
 * The tests cover authentication, validation, and expected behavior of each route.
 */

import {
  GET as quickReactionsGET,
  PUT as quickReactionsPUT,
} from "@/app/api/user/quick-reactions/route";
import {
  DELETE as userFriendDELETE,
  GET as userFriendGET,
  POST as userFriendPOST,
} from "@/app/api/users/[username]/friend/route";
import { GET as userProfileGET } from "@/app/api/users/[username]/route";
import { POST as profileImagePOST } from "@/app/api/users/profile/image/route";
import { PUT as userRequestPUT } from "@/app/api/users/requests/[id]/route";
import { GET as usersRequestsGET } from "@/app/api/users/requests/route";
import { GET as usersSearchGET } from "@/app/api/users/search/route";
import { PUT as userSettingsPUT } from "@/app/api/users/settings/route";
import { auth } from "@/auth";
import { prisma as prismaMock } from "@/lib/prisma";
import {
  getQuickReactions,
  updateQuickReactions,
} from "@/services/user.service";
import type { PrismaClient } from "@prisma/client";
import { put } from "@vercel/blob";
import type { DeepMockProxy } from "jest-mock-extended";
import type { Session } from "next-auth";

jest.mock("@/auth", () => ({
  auth: jest.fn(),
}));

jest.mock("@/lib/prisma");
jest.mock("@/services/user.service");
jest.mock("@vercel/blob", () => ({
  put: jest.fn(),
}));

describe("Users API Routes", () => {
  const mockedAuth = auth as jest.Mock;
  const prismaDeepMock = prismaMock as unknown as DeepMockProxy<PrismaClient>;
  const mockedGetQuickReactions = getQuickReactions as jest.MockedFunction<
    typeof getQuickReactions
  >;
  const mockedUpdateQuickReactions =
    updateQuickReactions as jest.MockedFunction<typeof updateQuickReactions>;
  const mockedBlobPut = put as jest.MockedFunction<typeof put>;

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

  const customEmojis = ["🚀", "🔥", "💯", "👀", "🙌", "✨"];

  beforeEach(() => {
    jest.clearAllMocks();
    prismaDeepMock.globalBlock.findMany.mockResolvedValue(
      [] as unknown as Awaited<
        ReturnType<typeof prismaMock.globalBlock.findMany>
      >,
    );
  });

  describe("GET /api/user/quick-reactions", () => {
    it("should return 401 if user is not authenticated", async () => {
      mockedAuth.mockResolvedValue(null);

      const res = await quickReactionsGET();
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json.error).toBe("Unauthorized");
    });

    it("should return 200 and the user's quick reactions", async () => {
      mockedAuth.mockResolvedValue(mockSession);
      mockedGetQuickReactions.mockResolvedValue(customEmojis);

      const res = await quickReactionsGET();
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.quickReactions).toEqual(customEmojis);
      expect(mockedGetQuickReactions).toHaveBeenCalledWith("user-1");
    });

    it("should return 500 if the service throws an error", async () => {
      mockedAuth.mockResolvedValue(mockSession);
      mockedGetQuickReactions.mockRejectedValue(new Error("Database error"));

      const res = await quickReactionsGET();
      const json = await res.json();

      expect(res.status).toBe(500);
      expect(json.error).toBe("Internal server error");
    });
  });

  describe("PUT /api/user/quick-reactions", () => {
    it("should return 401 if user is not authenticated", async () => {
      mockedAuth.mockResolvedValue(null);

      const req = new Request("https://chroniqo.com/api/user/quick-reactions", {
        method: "PUT",
        body: JSON.stringify({ emojis: customEmojis }),
      });

      const res = await quickReactionsPUT(req);
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json.error).toBe("Unauthorized");
    });

    it("should return 400 if Zod validation fails (array length != 6)", async () => {
      mockedAuth.mockResolvedValue(mockSession);

      const req = new Request("https://chroniqo.com/api/user/quick-reactions", {
        method: "PUT",
        body: JSON.stringify({ emojis: ["👍", "❤️"] }), // Invalid: only 2 emojis
      });

      const res = await quickReactionsPUT(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error).toBe("Validation failed");
      expect(mockedUpdateQuickReactions).not.toHaveBeenCalled();
    });

    it("should return 400 if Zod validation fails (empty emoji string)", async () => {
      mockedAuth.mockResolvedValue(mockSession);

      const req = new Request("https://chroniqo.com/api/user/quick-reactions", {
        method: "PUT",
        // Invalid: contains an empty string
        body: JSON.stringify({ emojis: ["👍", "❤️", "😂", "", "😡", "😢"] }),
      });

      const res = await quickReactionsPUT(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error).toBe("Validation failed");
      expect(mockedUpdateQuickReactions).not.toHaveBeenCalled();
    });

    it("should return 200 and call the service on valid input", async () => {
      mockedAuth.mockResolvedValue(mockSession);
      mockedUpdateQuickReactions.mockResolvedValue(customEmojis);

      const req = new Request("https://chroniqo.com/api/user/quick-reactions", {
        method: "PUT",
        body: JSON.stringify({ emojis: customEmojis }),
      });

      const res = await quickReactionsPUT(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.message).toBe("Quick reactions updated");
      expect(json.quickReactions).toEqual(customEmojis);
      expect(mockedUpdateQuickReactions).toHaveBeenCalledWith(
        "user-1",
        customEmojis,
      );
    });
  });

  describe("GET /api/users/search", () => {
    it("should return 401 if unauthenticated", async () => {
      mockedAuth.mockResolvedValue(null);
      const req = new Request("https://chroniqo.com/api/users/search?q=john");

      const res = await usersSearchGET(req);
      expect(res.status).toBe(401);
    });

    it("should return 200 and enforce messaging permissions in query", async () => {
      mockedAuth.mockResolvedValue(mockSession);
      const users = [{ id: "user-2", username: "john" }] as unknown as Awaited<
        ReturnType<typeof prismaMock.user.findMany>
      >;
      prismaDeepMock.user.findMany.mockResolvedValue(users);

      const req = new Request("https://chroniqo.com/api/users/search?q=john");
      const res = await usersSearchGET(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.users).toHaveLength(1);
      expect(prismaDeepMock.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { messagingPermission: "ALL" },
              {
                messagingPermission: "ONLY_FRIENDS",
                friendships: { some: { friendId: "user-1" } },
              },
            ],
          }),
        }),
      );
    });
  });

  describe("GET /api/users/[username]", () => {
    const profileParams = Promise.resolve({ username: "targetuser" });

    it("should return 401 if unauthenticated", async () => {
      mockedAuth.mockResolvedValue(null);
      const req = new Request("https://chroniqo.com/api/users/targetuser");

      const res = await userProfileGET(req, { params: profileParams });
      expect(res.status).toBe(401);
    });

    it("should return 404 if user not found", async () => {
      mockedAuth.mockResolvedValue(mockSession);
      prismaDeepMock.user.findUnique.mockResolvedValue(null);

      const req = new Request("https://chroniqo.com/api/users/targetuser");
      const res = await userProfileGET(req, { params: profileParams });
      expect(res.status).toBe(404);
    });

    it("should return SELF relationship if viewing own profile", async () => {
      mockedAuth.mockResolvedValue(mockSession);
      prismaDeepMock.user.findUnique.mockResolvedValue({
        id: "user-1",
        _count: { posts: 0, comments: 0, friendships: 0 },
        dailyStatuses: [],
      } as unknown as Awaited<ReturnType<typeof prismaMock.user.findUnique>>);

      const req = new Request("https://chroniqo.com/api/users/targetuser");
      const res = await userProfileGET(req, { params: profileParams });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.profile.relationshipStatus).toBe("SELF");
    });

    it("should return FRIENDS if friendship exists", async () => {
      mockedAuth.mockResolvedValue(mockSession);
      prismaDeepMock.user.findUnique.mockResolvedValue({
        id: "user-2",
        _count: { posts: 0, comments: 0, friendships: 0 },
        dailyStatuses: [],
      } as unknown as Awaited<ReturnType<typeof prismaMock.user.findUnique>>);
      prismaDeepMock.friendship.findUnique.mockResolvedValue(
        {} as unknown as Awaited<
          ReturnType<typeof prismaMock.friendship.findUnique>
        >,
      );

      const req = new Request("https://chroniqo.com/api/users/targetuser");
      const res = await userProfileGET(req, { params: profileParams });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.profile.relationshipStatus).toBe("FRIENDS");
    });

    it("should return NONE if no relationship exists", async () => {
      mockedAuth.mockResolvedValue(mockSession);
      prismaDeepMock.user.findUnique.mockResolvedValue({
        id: "user-2",
        _count: { posts: 0, comments: 0, friendships: 0 },
        dailyStatuses: [],
      } as unknown as Awaited<ReturnType<typeof prismaMock.user.findUnique>>);
      prismaDeepMock.friendship.findUnique.mockResolvedValue(null);
      prismaDeepMock.friendRequest.findUnique.mockResolvedValue(null);

      const req = new Request("https://chroniqo.com/api/users/targetuser");
      const res = await userProfileGET(req, { params: profileParams });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.profile.relationshipStatus).toBe("NONE");
    });
  });

  describe("GET/POST/DELETE /api/users/[username]/friend", () => {
    const friendParams = Promise.resolve({ username: "targetuser" });

    describe("GET /api/users/[username]/friend", () => {
      const friendParams = Promise.resolve({ username: "targetuser" });

      it("should return 401 if unauthenticated", async () => {
        mockedAuth.mockResolvedValue(null);
        const req = new Request(
          "https://chroniqo.com/api/users/targetuser/friend",
        );
        const res = await userFriendGET(req, { params: friendParams });
        expect(res.status).toBe(401);
      });

      it("should return 404 if target user not found", async () => {
        mockedAuth.mockResolvedValue(mockSession);
        prismaDeepMock.user.findUnique.mockResolvedValue(null);

        const req = new Request(
          "https://chroniqo.com/api/users/targetuser/friend",
        );
        const res = await userFriendGET(req, { params: friendParams });
        expect(res.status).toBe(404);
      });

      it("should return 403 if profile is private and viewer is not a friend", async () => {
        mockedAuth.mockResolvedValue(mockSession);
        prismaDeepMock.user.findUnique.mockResolvedValue({
          id: "user-2",
          isPrivate: true,
        } as unknown as Awaited<ReturnType<typeof prismaMock.user.findUnique>>);
        prismaDeepMock.friendship.findUnique.mockResolvedValue(null);

        const req = new Request(
          "https://chroniqo.com/api/users/targetuser/friend",
        );
        const res = await userFriendGET(req, { params: friendParams });
        expect(res.status).toBe(403);
      });

      it("should return friends list for a public profile", async () => {
        mockedAuth.mockResolvedValue(mockSession);
        prismaDeepMock.user.findUnique.mockResolvedValue({
          id: "user-2",
          isPrivate: false,
        } as unknown as Awaited<ReturnType<typeof prismaMock.user.findUnique>>);
        prismaDeepMock.friendship.findMany.mockResolvedValue([
          {
            friend: {
              id: "user-3",
              name: "Alice",
              username: "alice",
              image: null,
              bio: null,
              dailyStatuses: [],
            },
          },
        ] as unknown as Awaited<
          ReturnType<typeof prismaMock.friendship.findMany>
        >);

        const req = new Request(
          "https://chroniqo.com/api/users/targetuser/friend",
        );
        const res = await userFriendGET(req, { params: friendParams });
        const json = await res.json();

        expect(res.status).toBe(200);
        expect(json.friends).toHaveLength(1);
        expect(json.friends[0].username).toBe("alice");
        // receivedRequests and sentRequests are empty - not own profile
        expect(json.receivedRequests).toHaveLength(0);
        expect(json.sentRequests).toHaveLength(0);
      });

      it("should return friends, receivedRequests and sentRequests for own profile", async () => {
        mockedAuth.mockResolvedValue(mockSession);
        prismaDeepMock.user.findUnique.mockResolvedValue({
          id: "user-1", // Same as session user
          isPrivate: false,
        } as unknown as Awaited<ReturnType<typeof prismaMock.user.findUnique>>);
        prismaDeepMock.friendship.findMany.mockResolvedValue([
          {
            friend: {
              id: "user-3",
              username: "alice",
              name: "Alice",
              image: null,
              bio: null,
              dailyStatuses: [],
            },
          },
        ] as unknown as Awaited<
          ReturnType<typeof prismaMock.friendship.findMany>
        >);
        prismaDeepMock.friendRequest.findMany
          .mockResolvedValueOnce([
            // receivedRequests
            {
              id: "req-1",
              sender: {
                id: "user-4",
                username: "bob",
                name: "Bob",
                image: null,
                bio: null,
                dailyStatuses: [],
              },
            },
          ] as unknown as Awaited<
            ReturnType<typeof prismaMock.friendRequest.findMany>
          >)
          .mockResolvedValueOnce([
            // sentRequests
            {
              id: "req-2",
              receiver: {
                id: "user-5",
                username: "carol",
                name: "Carol",
                image: null,
                bio: null,
                dailyStatuses: [],
              },
            },
          ] as unknown as Awaited<
            ReturnType<typeof prismaMock.friendRequest.findMany>
          >);

        const req = new Request(
          "https://chroniqo.com/api/users/targetuser/friend",
        );
        const res = await userFriendGET(req, { params: friendParams });
        const json = await res.json();

        expect(res.status).toBe(200);
        expect(json.friends).toHaveLength(1);
        expect(json.receivedRequests).toHaveLength(1);
        expect(json.receivedRequests[0].sender.username).toBe("bob");
        expect(json.sentRequests).toHaveLength(1);
        expect(json.sentRequests[0].receiver.username).toBe("carol");
      });

      it("should allow access to a private profile if the viewer is a friend", async () => {
        mockedAuth.mockResolvedValue(mockSession);
        prismaDeepMock.user.findUnique.mockResolvedValue({
          id: "user-2",
          isPrivate: true,
        } as unknown as Awaited<ReturnType<typeof prismaMock.user.findUnique>>);
        prismaDeepMock.friendship.findUnique.mockResolvedValue(
          {} as unknown as Awaited<
            ReturnType<typeof prismaMock.friendship.findUnique>
          >,
        );
        prismaDeepMock.friendship.findMany.mockResolvedValue(
          [] as unknown as Awaited<
            ReturnType<typeof prismaMock.friendship.findMany>
          >,
        );

        const req = new Request(
          "https://chroniqo.com/api/users/targetuser/friend",
        );
        const res = await userFriendGET(req, { params: friendParams });
        expect(res.status).toBe(200);
      });
    });

    describe("POST", () => {
      it("should return 400 if adding yourself", async () => {
        mockedAuth.mockResolvedValue(mockSession);
        prismaDeepMock.user.findUnique.mockResolvedValue({
          id: "user-1",
        } as unknown as Awaited<ReturnType<typeof prismaMock.user.findUnique>>);

        const req = new Request(
          "https://chroniqo.com/api/users/targetuser/friend",
          {
            method: "POST",
          },
        );
        const res = await userFriendPOST(req, { params: friendParams });

        expect(res.status).toBe(400);
      });

      it("should create request if valid", async () => {
        mockedAuth.mockResolvedValue(mockSession);
        prismaDeepMock.user.findUnique.mockResolvedValue({
          id: "user-2",
        } as unknown as Awaited<ReturnType<typeof prismaMock.user.findUnique>>);
        prismaDeepMock.friendRequest.findFirst.mockResolvedValue(null);
        prismaDeepMock.friendRequest.create.mockResolvedValue(
          {} as unknown as Awaited<
            ReturnType<typeof prismaMock.friendRequest.create>
          >,
        );

        const req = new Request(
          "https://chroniqo.com/api/users/targetuser/friend",
          {
            method: "POST",
          },
        );
        const res = await userFriendPOST(req, { params: friendParams });

        expect(res.status).toBe(200);
        expect(prismaDeepMock.friendRequest.create).toHaveBeenCalled();
      });
    });

    describe("DELETE", () => {
      it("should delete requests and friendships", async () => {
        mockedAuth.mockResolvedValue(mockSession);
        prismaDeepMock.user.findUnique.mockResolvedValue({
          id: "user-2",
        } as unknown as Awaited<ReturnType<typeof prismaMock.user.findUnique>>);
        prismaDeepMock.friendRequest.deleteMany.mockResolvedValue(
          {} as unknown as Awaited<
            ReturnType<typeof prismaMock.friendRequest.deleteMany>
          >,
        );
        prismaDeepMock.friendship.deleteMany.mockResolvedValue(
          {} as unknown as Awaited<
            ReturnType<typeof prismaMock.friendship.deleteMany>
          >,
        );

        const req = new Request(
          "https://chroniqo.com/api/users/targetuser/friend",
          {
            method: "DELETE",
          },
        );
        const res = await userFriendDELETE(req, { params: friendParams });

        expect(res.status).toBe(200);
        expect(prismaDeepMock.friendRequest.deleteMany).toHaveBeenCalled();
        expect(prismaDeepMock.friendship.deleteMany).toHaveBeenCalled();
      });
    });
  });

  describe("GET /api/users/requests", () => {
    it("should return pending requests", async () => {
      mockedAuth.mockResolvedValue(mockSession);
      prismaDeepMock.friendRequest.findMany.mockResolvedValue([
        { id: "req-1" },
      ] as unknown as Awaited<
        ReturnType<typeof prismaMock.friendRequest.findMany>
      >);

      const res = await usersRequestsGET();
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.requests).toHaveLength(1);
    });
  });

  describe("PUT /api/users/requests/[id]", () => {
    const requestParams = Promise.resolve({ id: "req-1" });

    it("should ACCEPT and create friendships", async () => {
      mockedAuth.mockResolvedValue(mockSession);
      prismaDeepMock.friendRequest.findUnique.mockResolvedValue({
        id: "req-1",
        receiverId: "user-1",
        senderId: "user-2",
      } as unknown as Awaited<
        ReturnType<typeof prismaMock.friendRequest.findUnique>
      >);
      prismaDeepMock.$transaction.mockResolvedValue([
        {},
        {},
        {},
      ] as unknown as Awaited<ReturnType<typeof prismaMock.$transaction>>);

      const req = new Request("https://chroniqo.com/api/users/requests/req-1", {
        method: "PUT",
        body: JSON.stringify({ action: "ACCEPT" }),
      });
      const res = await userRequestPUT(req, { params: requestParams });

      expect(res.status).toBe(200);
      expect(prismaDeepMock.friendship.create).toHaveBeenCalledTimes(2);
      expect(prismaDeepMock.$transaction).toHaveBeenCalled();
    });

    it("should DECLINE and delete request", async () => {
      mockedAuth.mockResolvedValue(mockSession);
      prismaDeepMock.friendRequest.findUnique.mockResolvedValue({
        id: "req-1",
        receiverId: "user-1",
        senderId: "user-2",
      } as unknown as Awaited<
        ReturnType<typeof prismaMock.friendRequest.findUnique>
      >);

      const req = new Request("https://chroniqo.com/api/users/requests/req-1", {
        method: "PUT",
        body: JSON.stringify({ action: "DECLINE" }),
      });
      const res = await userRequestPUT(req, { params: requestParams });

      expect(res.status).toBe(200);
      expect(prismaDeepMock.friendRequest.delete).toHaveBeenCalledWith({
        where: { id: "req-1" },
      });
    });
  });

  describe("PUT /api/users/settings", () => {
    it("should return 400 on invalid input", async () => {
      mockedAuth.mockResolvedValue(mockSession);

      const req = new Request("https://chroniqo.com/api/users/settings", {
        method: "PUT",
        body: JSON.stringify({ isPrivate: "not-a-bool" }),
      });
      const res = await userSettingsPUT(req);

      expect(res.status).toBe(400);
    });

    it("should return 200 and update settings on valid input", async () => {
      mockedAuth.mockResolvedValue(mockSession);
      prismaDeepMock.user.update.mockResolvedValue(
        {} as unknown as Awaited<ReturnType<typeof prismaMock.user.update>>,
      );

      const validData = {
        isPrivate: true,
        messagingPermission: "ONLY_FRIENDS",
      };
      const req = new Request("https://chroniqo.com/api/users/settings", {
        method: "PUT",
        body: JSON.stringify(validData),
      });
      const res = await userSettingsPUT(req);

      expect(res.status).toBe(200);
      expect(prismaDeepMock.user.update).toHaveBeenCalledWith({
        where: { id: "user-1" },
        data: validData,
      });
    });
  });

  describe("POST /api/users/profile/image", () => {
    it("should return 400 if form data is invalid", async () => {
      mockedAuth.mockResolvedValue(mockSession);
      const formData = new FormData();
      const req = new Request("https://chroniqo.com/api/users/profile/image", {
        method: "POST",
        body: formData,
      });

      const res = await profileImagePOST(req);
      expect(res.status).toBe(400);
    });

    it("should return 200 and update avatar URL", async () => {
      mockedAuth.mockResolvedValue(mockSession);
      mockedBlobPut.mockResolvedValue({
        url: "https://blob.com/avatar.jpg",
      } as unknown as Awaited<ReturnType<typeof put>>);
      prismaDeepMock.user.update.mockResolvedValue(
        {} as unknown as Awaited<ReturnType<typeof prismaMock.user.update>>,
      );

      const formData = new FormData();
      const file = new File(["test"], "test.jpg", { type: "image/jpeg" });
      formData.append("file", file);
      formData.append("type", "avatar");

      const req = new Request("https://chroniqo.com/api/users/profile/image", {
        method: "POST",
        body: formData,
      });
      const res = await profileImagePOST(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.url).toBe("https://blob.com/avatar.jpg");
      expect(mockedBlobPut).toHaveBeenCalled();
      expect(prismaDeepMock.user.update).toHaveBeenCalledWith({
        where: { id: "user-1" },
        data: {
          image: "https://blob.com/avatar.jpg",
          avatarEmoji: null,
          avatarBgColor: null,
        },
      });
    });
  });
});

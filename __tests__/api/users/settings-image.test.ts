/**
 * @jest-environment node
 */

/*
 * This file tests the API routes for user settings and profile image uploads.
 * It ensures that unauthenticated requests are blocked, invalid payloads
 * are rejected by Zod, and valid requests successfully call the service.
 */

import { POST as profileImagePOST } from "@/app/api/users/profile/image/route";
import { PUT as userSettingsPUT } from "@/app/api/users/settings/route";
import { auth } from "@/auth";
import { prisma as prismaMock } from "@/lib/prisma";
import type { PrismaClient } from "@prisma/client";
import { put } from "@vercel/blob";
import type { DeepMockProxy } from "jest-mock-extended";
import type { Session } from "next-auth";

jest.mock("@/auth", () => ({ auth: jest.fn() }));
jest.mock("@/lib/prisma");
jest.mock("@vercel/blob", () => ({ put: jest.fn() }));

describe("Users Settings and Profile Image API", () => {
  const mockedAuth = auth as jest.Mock;
  const prismaDeepMock = prismaMock as unknown as DeepMockProxy<PrismaClient>;
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

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("settings PUT should return 400 on invalid payload", async () => {
    mockedAuth.mockResolvedValue(mockSession);
    const req = new Request("https://chroniqo.com/api/users/settings", {
      method: "PUT",
      body: JSON.stringify({ isPrivate: "not-a-bool" }),
    });

    const res = await userSettingsPUT(req);
    expect(res.status).toBe(400);
  });

  it("settings PUT should return 401 if unauthenticated", async () => {
    mockedAuth.mockResolvedValue(null);

    const req = new Request("https://chroniqo.com/api/users/settings", {
      method: "PUT",
      body: JSON.stringify({ isPrivate: true, messagingPermission: "ALL" }),
    });

    const res = await userSettingsPUT(req);
    expect(res.status).toBe(401);
  });

  it("settings PUT should update and return 200 on valid payload", async () => {
    mockedAuth.mockResolvedValue(mockSession);
    prismaDeepMock.user.update.mockResolvedValue(
      {} as unknown as Awaited<ReturnType<typeof prismaMock.user.update>>,
    );

    const validData = { isPrivate: true, messagingPermission: "ONLY_FRIENDS" };
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

  it("settings PUT should return 500 when prisma update fails", async () => {
    mockedAuth.mockResolvedValue(mockSession);
    prismaDeepMock.user.update.mockRejectedValue(new Error("DB fail"));

    const validData = { isPrivate: true, messagingPermission: "ONLY_FRIENDS" };
    const req = new Request("https://chroniqo.com/api/users/settings", {
      method: "PUT",
      body: JSON.stringify(validData),
    });

    const res = await userSettingsPUT(req);
    expect(res.status).toBe(500);
  });

  it("profile image POST should return 400 if form data is invalid", async () => {
    mockedAuth.mockResolvedValue(mockSession);
    const formData = new FormData();
    const req = new Request("https://chroniqo.com/api/users/profile/image", {
      method: "POST",
      body: formData,
    });

    const res = await profileImagePOST(req);
    expect(res.status).toBe(400);
  });

  it("profile image POST should return 401 if unauthenticated", async () => {
    mockedAuth.mockResolvedValue(null);

    const formData = new FormData();
    const req = new Request("https://chroniqo.com/api/users/profile/image", {
      method: "POST",
      body: formData,
    });

    const res = await profileImagePOST(req);
    expect(res.status).toBe(401);
  });

  it("profile image POST should upload and update avatar", async () => {
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
    expect(prismaDeepMock.user.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: {
        image: "https://blob.com/avatar.jpg",
        avatarEmoji: null,
        avatarBgColor: null,
      },
    });
  });

  it("profile image POST should upload and update header image", async () => {
    mockedAuth.mockResolvedValue(mockSession);
    mockedBlobPut.mockResolvedValue({
      url: "https://blob.com/header.jpg",
    } as unknown as Awaited<ReturnType<typeof put>>);
    prismaDeepMock.user.update.mockResolvedValue(
      {} as unknown as Awaited<ReturnType<typeof prismaMock.user.update>>,
    );

    const formData = new FormData();
    const file = new File(["test"], "test.jpg", { type: "image/jpeg" });
    formData.append("file", file);
    formData.append("type", "header");

    const req = new Request("https://chroniqo.com/api/users/profile/image", {
      method: "POST",
      body: formData,
    });
    const res = await profileImagePOST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.url).toBe("https://blob.com/header.jpg");
    expect(prismaDeepMock.user.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: {
        headerImage: "https://blob.com/header.jpg",
        headerEmoji: null,
        headerBgColor: null,
      },
    });
  });

  it("profile image POST should return 500 when upload fails", async () => {
    mockedAuth.mockResolvedValue(mockSession);
    mockedBlobPut.mockRejectedValue(new Error("Blob fail"));

    const formData = new FormData();
    const file = new File(["test"], "test.jpg", { type: "image/jpeg" });
    formData.append("file", file);
    formData.append("type", "avatar");

    const req = new Request("https://chroniqo.com/api/users/profile/image", {
      method: "POST",
      body: formData,
    });

    const res = await profileImagePOST(req);
    expect(res.status).toBe(500);
  });

  it("profile image POST should save avatar icon when type is avatar-icon", async () => {
    mockedAuth.mockResolvedValue(mockSession);
    prismaDeepMock.user.update.mockResolvedValue(
      {} as unknown as Awaited<ReturnType<typeof prismaMock.user.update>>,
    );

    const req = new Request("https://chroniqo.com/api/users/profile/image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "avatar-icon",
        emoji: "😊",
        bgColor: "#f4b8c1",
      }),
    });

    const res = await profileImagePOST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(prismaDeepMock.user.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { avatarEmoji: "😊", avatarBgColor: "#f4b8c1", image: null },
    });
  });

  it("profile image POST should save header icon when type is header-icon", async () => {
    mockedAuth.mockResolvedValue(mockSession);
    prismaDeepMock.user.update.mockResolvedValue(
      {} as unknown as Awaited<ReturnType<typeof prismaMock.user.update>>,
    );

    const req = new Request("https://chroniqo.com/api/users/profile/image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "header-icon",
        emoji: "🌿",
        bgColor: "#a8ddc8",
      }),
    });

    const res = await profileImagePOST(req);

    expect(res.status).toBe(200);
    expect(prismaDeepMock.user.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { headerEmoji: "🌿", headerBgColor: "#a8ddc8", headerImage: null },
    });
  });

  it("profile image POST should remove avatar when type is remove-avatar", async () => {
    mockedAuth.mockResolvedValue(mockSession);
    prismaDeepMock.user.update.mockResolvedValue(
      {} as unknown as Awaited<ReturnType<typeof prismaMock.user.update>>,
    );

    const req = new Request("https://chroniqo.com/api/users/profile/image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "remove-avatar" }),
    });

    const res = await profileImagePOST(req);

    expect(res.status).toBe(200);
    expect(prismaDeepMock.user.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { image: null, avatarEmoji: null, avatarBgColor: null },
    });
  });

  it("profile image POST should remove header when type is remove-header", async () => {
    mockedAuth.mockResolvedValue(mockSession);
    prismaDeepMock.user.update.mockResolvedValue(
      {} as unknown as Awaited<ReturnType<typeof prismaMock.user.update>>,
    );

    const req = new Request("https://chroniqo.com/api/users/profile/image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "remove-header" }),
    });

    const res = await profileImagePOST(req);

    expect(res.status).toBe(200);
    expect(prismaDeepMock.user.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { headerImage: null, headerEmoji: null, headerBgColor: null },
    });
  });

  it("profile image POST should return 400 for invalid hex color in avatar-icon", async () => {
    mockedAuth.mockResolvedValue(mockSession);

    const req = new Request("https://chroniqo.com/api/users/profile/image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "avatar-icon",
        emoji: "😊",
        bgColor: "not-a-color",
      }),
    });

    const res = await profileImagePOST(req);
    expect(res.status).toBe(400);
  });

  it("profile image POST should allow null emoji with valid bgColor for avatar-icon", async () => {
    mockedAuth.mockResolvedValue(mockSession);
    prismaDeepMock.user.update.mockResolvedValue(
      {} as unknown as Awaited<ReturnType<typeof prismaMock.user.update>>,
    );

    const req = new Request("https://chroniqo.com/api/users/profile/image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "avatar-icon",
        emoji: null,
        bgColor: "#f4b8c1",
      }),
    });

    const res = await profileImagePOST(req);

    expect(res.status).toBe(200);
    expect(prismaDeepMock.user.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { avatarEmoji: null, avatarBgColor: "#f4b8c1", image: null },
    });
  });
});

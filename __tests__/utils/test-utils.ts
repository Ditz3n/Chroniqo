// __tests__/utils/test-utils.ts

/*
 * Factory functions to create mock data for tests.
 * These functions return objects that conform to the expected types used in the application,
 * with sensible default values that can be overridden as needed for specific test cases.
 * By using these factories, tests can easily generate consistent and realistic mock data,
 * while keeping test files clean and focused on the specific scenarios being tested.
 */

import { User } from "@prisma/client";
import { Session } from "next-auth";

import { TEST_EMAILS, TEST_IDS } from "./test-constants";

export function createMockUser(overrides: Partial<User> = {}): User {
  return {
    isDummy: false,
    id: TEST_IDS.user,
    name: null,
    username: null,
    email: TEST_EMAILS.default,
    emailVerified: null,
    image: null,
    hashedPassword: null,
    firstName: null,
    lastName: null,
    gender: null,
    age: null,
    weight: null,
    weightUnit: null,
    height: null,
    heightUnit: null,
    medications: [],
    bio: null,
    conditions: [],
    quickReactions: ["❤️", "😂", "😮", "😢", "😡", "👍"],
    onboarded: false,
    onboardingStep: 1,
    role: "USER",
    isPrivate: false,
    messagingPermission: "ALL",
    headerImage: null,
    avatarEmoji: null,
    avatarBgColor: null,
    headerEmoji: null,
    headerBgColor: null,
    socialLinks: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    locale: "da",
    showConditions: true,
    showMedications: false,
    showAge: true,
    showHeight: false,
    showWeight: false,
    birthDate: null,
    autoUpdateAge: false,
    usernameChangedAt: null,
    pinnedPostId: null,
    signupVerified: null,
    ...overrides,
  };
}

export function createMockSession(
  userOverrides: Partial<NonNullable<Session["user"]>> = {},
): Session {
  return {
    user: {
      id: TEST_IDS.user,
      onboarded: true,
      hasPassword: true,
      role: "USER",
      email: TEST_EMAILS.default,
      ...userOverrides,
    },
    expires: new Date(Date.now() + 86400000).toISOString(),
  };
}

// src/services/dummy/dummy-users.service.ts
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { DUMMY_PROFILES, MOOD_NOTES } from "./data";
import { uploadDummyMedia } from "./dummy-media.service";

export async function generateDummyUsers() {
  console.log("[Dummy Generator] Generating users...");
  const hashedPassword = await bcrypt.hash("DummyPassword123!", 10);
  const createdUsers = [];

  for (const [index, profile] of DUMMY_PROFILES.entries()) {
    const username = `${profile.firstName.toLowerCase()}_${profile.lastName.toLowerCase().replace(/\s+/g, "_")}`;
    const email = `${username}@dummy.chroniqo.com`;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      createdUsers.push(existing);
      continue;
    }

    let avatarUrl: string | null = null;
    let headerUrl: string | null = null;

    if (profile.avatarEmoji && profile.avatarBgColor) {
      avatarUrl = null;
    } else {
      avatarUrl = await uploadDummyMedia(
        `https://picsum.photos/seed/avatar${index}/200/200`,
        `${username}-avatar.jpg`,
      );
    }

    if (profile.headerEmoji && profile.headerBgColor) {
      headerUrl = null;
    } else {
      headerUrl = await uploadDummyMedia(
        `https://picsum.photos/seed/header${index}/800/300`,
        `${username}-header.jpg`,
      );
    }

    const user = await prisma.user.create({
      data: {
        name: `${profile.firstName} ${profile.lastName}`,
        firstName: profile.firstName,
        lastName: profile.lastName,
        username,
        email,
        hashedPassword,
        image: avatarUrl,
        headerImage: headerUrl,
        avatarEmoji: profile.avatarEmoji ?? null,
        avatarBgColor: profile.avatarBgColor ?? null,
        headerEmoji: profile.headerEmoji ?? null,
        headerBgColor: profile.headerBgColor ?? null,
        bio: `Hi, I'm ${profile.firstName}. This is a generated dummy profile to test health attributes.`,
        gender: profile.gender,
        age: profile.age,
        weight: profile.weight,
        weightUnit: profile.weightUnit,
        height: profile.height,
        heightUnit: profile.heightUnit,
        medications: profile.medications,
        conditions: profile.conditions,
        quickReactions: profile.quickReactions,
        isDummy: true,
        onboarded: true,
        onboardingStep: 11,
        role: profile.role,
      },
    });

    // Generate moods for today + 7 future days
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const statuses = [];
    for (let i = 0; i <= 14; i++) {
      const targetDate = new Date(today.getTime() + i * 86400000);
      const randomMood = Math.floor(Math.random() * 5);
      let note = null;
      if (Math.random() > 0.2) {
        note = MOOD_NOTES[randomMood];
        if (Math.random() > 0.7) {
          note +=
            " " +
            [
              "Trying a new routine.",
              "Weather is affecting me today.",
              "Had a good talk with a friend.",
              "Doctor appointment coming up.",
              "Feeling hopeful.",
              "Need to rest more.",
              "Energy is better than usual.",
            ][Math.floor(Math.random() * 7)];
        }
      }
      statuses.push({
        userId: user.id,
        value: randomMood,
        note,
        date: targetDate,
      });
    }

    await prisma.dailyStatus.createMany({
      data: statuses,
      skipDuplicates: true,
    });

    createdUsers.push(user);
  }

  return createdUsers;
}

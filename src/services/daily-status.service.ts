// src/services/daily-status.service.ts
import { DailyStatusDTO } from "@/lib/dtos/daily-status.dto";
import { prisma } from "@/lib/prisma";

// Parses YYYY-MM-DD securely into UTC midnight to avoid timezone shifts
function getNormalizedDate(dateStr?: string) {
  if (dateStr) {
    return new Date(`${dateStr}T00:00:00Z`);
  }
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
}

export async function getTodayStatus(userId: string) {
  const today = getNormalizedDate();
  const status = await prisma.dailyStatus.findUnique({
    where: { userId_date: { userId, date: today } },
  });
  return status;
}

export async function upsertDailyStatus(userId: string, data: DailyStatusDTO) {
  const targetDate = getNormalizedDate(data.date);

  const status = await prisma.dailyStatus.upsert({
    where: { userId_date: { userId, date: targetDate } },
    update: { value: data.value, note: data.note || null },
    create: {
      userId,
      value: data.value,
      note: data.note || null,
      date: targetDate,
    },
  });
  return status;
}

export async function getMonthStatuses(
  userId: string,
  year: number,
  month: number,
) {
  // Queries from the first to the last day of the given month
  const startDate = new Date(Date.UTC(year, month, 1));
  const endDate = new Date(Date.UTC(year, month + 1, 0));

  const statuses = await prisma.dailyStatus.findMany({
    where: {
      userId,
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
    orderBy: { date: "asc" },
  });

  return statuses;
}

// Delete a daily status for a user and date
export async function deleteDailyStatus(userId: string, date: string) {
  const utcDate = new Date(date + "T00:00:00.000Z");
  await prisma.dailyStatus.delete({
    where: { userId_date: { userId, date: utcDate } },
  });
}

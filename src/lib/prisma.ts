// src/lib/prisma.ts
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

// Create a singleton Prisma Client instance to be used across the app
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// Initialize Prisma Client with the PostgreSQL adapter and connection string from environment variables
const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

// If a Prisma Client instance already exists (in development), reuse it. Otherwise, create a new one.
export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

// In development, attach the Prisma Client instance to the global object
// to enable hot-reloading without creating multiple instances
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

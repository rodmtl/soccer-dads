import { PrismaClient } from "@prisma/client";

// Reuse a single PrismaClient instance across hot reloads in development so
// `next dev` doesn't exhaust the database connection limit by creating a new
// client on every file change.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

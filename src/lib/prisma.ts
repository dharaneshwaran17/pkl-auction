import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export function createPrismaClient(dbUrl?: string): PrismaClient {
  const url = dbUrl ?? process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/postgres";
  const isLocalhost = url.includes("localhost") || url.includes("127.0.0.1");

  const pool = new Pool({
    connectionString: url,
    ssl: isLocalhost ? undefined : { rejectUnauthorized: false },
  });
  const adapter = new PrismaPg(pool);

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

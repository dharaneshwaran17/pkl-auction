import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import path from "node:path";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export function createPrismaClient(dbUrl?: string): PrismaClient {
  const url = dbUrl ?? process.env.DATABASE_URL ?? `file:${path.join(process.cwd(), "dev.db")}`;

  if (url.startsWith("postgres://") || url.startsWith("postgresql://")) {
    const pool = new Pool({
      connectionString: url,
      ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : undefined,
    });
    const adapter = new PrismaPg(pool);
    return new PrismaClient({
      adapter,
      log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    });
  }

  const adapter = new PrismaLibSql({ url });
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

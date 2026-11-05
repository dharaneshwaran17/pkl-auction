import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

export function prepareDatabase() {
  const schemaPath = path.join(process.cwd(), "prisma", "schema.prisma");
  let schema = fs.readFileSync(schemaPath, "utf8");

  const dbUrl = process.env.DATABASE_URL || "";
  const isPostgres = dbUrl.startsWith("postgres://") || dbUrl.startsWith("postgresql://");

  if (isPostgres) {
    console.log("[prepare-db] Detected PostgreSQL DATABASE_URL.");
    if (!schema.includes('provider = "postgresql"')) {
      schema = schema.replace(/provider\s*=\s*"sqlite"/, 'provider = "postgresql"');
      fs.writeFileSync(schemaPath, schema, "utf8");
      console.log("[prepare-db] Updated schema.prisma provider to 'postgresql'.");
    }

    console.log("[prepare-db] Generating Prisma client for PostgreSQL...");
    execSync("npx prisma generate", { stdio: "inherit" });

    console.log("[prepare-db] Applying schema updates to PostgreSQL safely (without data wipe)...");
    execSync("npx prisma db push", { stdio: "inherit" });
  } else {
    console.log("[prepare-db] Using local SQLite database.");
    if (!schema.includes('provider = "sqlite"')) {
      schema = schema.replace(/provider\s*=\s*"postgresql"/, 'provider = "sqlite"');
      fs.writeFileSync(schemaPath, schema, "utf8");
      console.log("[prepare-db] Updated schema.prisma provider to 'sqlite'.");
    }
    console.log("[prepare-db] Generating Prisma client for SQLite...");
    execSync("npx prisma generate", { stdio: "inherit" });
  }
}

prepareDatabase();

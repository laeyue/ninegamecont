// docker-migrate.mjs — Runs migration SQL directly via pg client
// Bypasses prisma migrate deploy (which breaks in Docker due to prisma.config.ts import issues)

import { readFileSync } from "fs";
import pg from "pg";
const { Client } = pg;

const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://postgres:postgres@db:5432/ninegame?schema=public";

async function migrate() {
  const client = new Client({ connectionString });
  await client.connect();

  // Check if migration has already been applied by looking for the teams table
  const tableCheck = await client.query(`
    SELECT EXISTS (
      SELECT FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'teams'
    ) AS "exists"
  `);

  if (tableCheck.rows[0].exists) {
    console.log("Migration already applied (teams table exists). Skipping.");
    await client.end();
    return;
  }

  // Read and execute the migration SQL
  const sql = readFileSync(
    "prisma/migrations/20260228132005_init/migration.sql",
    "utf-8"
  );

  console.log("Applying migration...");
  await client.query(sql);
  console.log("Migration applied successfully.");

  await client.end();
}

migrate().catch((e) => {
  console.error("Migration error:", e);
  process.exit(1);
});

// docker-seed.mjs — Standalone seed script for Docker runtime
// Uses raw pg to avoid Prisma v7 adapter complexity in standalone build

import pg from "pg";
const { Client } = pg;

const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://postgres:postgres@db:5432/ninegame?schema=public";

const TEAMS = [
  { name: "Group 1", tier: "CORE", wealth: 500, rawMaterials: 0, techLevel: 3 },
  { name: "Group 2", tier: "CORE", wealth: 500, rawMaterials: 0, techLevel: 3 },
  { name: "Group 3", tier: "SEMI_PERIPHERY", wealth: 200, rawMaterials: 10, techLevel: 1 },
  { name: "Group 4", tier: "SEMI_PERIPHERY", wealth: 200, rawMaterials: 10, techLevel: 1 },
  { name: "Group 5", tier: "SEMI_PERIPHERY", wealth: 200, rawMaterials: 10, techLevel: 1 },
  { name: "Group 6", tier: "PERIPHERY", wealth: 50, rawMaterials: 30, techLevel: 0 },
  { name: "Group 7", tier: "PERIPHERY", wealth: 50, rawMaterials: 30, techLevel: 0 },
  { name: "Group 8", tier: "PERIPHERY", wealth: 50, rawMaterials: 30, techLevel: 0 },
  { name: "Group 9", tier: "PERIPHERY", wealth: 50, rawMaterials: 30, techLevel: 0 },
  { name: "Group 10", tier: "PERIPHERY", wealth: 50, rawMaterials: 30, techLevel: 0 },
];

async function seed() {
  const client = new Client({ connectionString });
  await client.connect();

  // Check if teams already exist
  const res = await client.query("SELECT COUNT(*) FROM teams");
  const count = parseInt(res.rows[0].count, 10);

  if (count === 0) {
    for (const t of TEAMS) {
      await client.query(
        `INSERT INTO teams (id, name, tier, wealth, raw_materials, tech_level)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5)`,
        [t.name, t.tier, t.wealth, t.rawMaterials, t.techLevel]
      );
    }

    await client.query(
      `INSERT INTO game_state (id, timer_seconds, timer_running, game_frozen)
       VALUES ('singleton', 1200, false, false)
       ON CONFLICT (id) DO NOTHING`
    );

    console.log("Seeded 10 teams and game state.");
  } else {
    console.log("Database already seeded (" + count + " teams found).");
  }

  await client.end();
}

seed().catch((e) => {
  console.error("Seed error:", e);
  process.exit(1);
});

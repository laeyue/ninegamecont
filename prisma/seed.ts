import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, Tier } from "@prisma/client";

const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://postgres:postgres@localhost:5432/ninegame?schema=public";
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

interface TeamSeed {
  name: string;
  tier: Tier;
  wealth: number;
  rawMaterials: number;
  techLevel: number;
}

const teams: TeamSeed[] = [
  // CORE - 2 groups
  { name: "Group 1", tier: Tier.CORE, wealth: 500, rawMaterials: 0, techLevel: 3 },
  { name: "Group 2", tier: Tier.CORE, wealth: 500, rawMaterials: 0, techLevel: 3 },
  // SEMI_PERIPHERY - 3 groups
  { name: "Group 3", tier: Tier.SEMI_PERIPHERY, wealth: 200, rawMaterials: 10, techLevel: 1 },
  { name: "Group 4", tier: Tier.SEMI_PERIPHERY, wealth: 200, rawMaterials: 10, techLevel: 1 },
  { name: "Group 5", tier: Tier.SEMI_PERIPHERY, wealth: 200, rawMaterials: 10, techLevel: 1 },
  // PERIPHERY - 5 groups
  { name: "Group 6", tier: Tier.PERIPHERY, wealth: 50, rawMaterials: 30, techLevel: 0 },
  { name: "Group 7", tier: Tier.PERIPHERY, wealth: 50, rawMaterials: 30, techLevel: 0 },
  { name: "Group 8", tier: Tier.PERIPHERY, wealth: 50, rawMaterials: 30, techLevel: 0 },
  { name: "Group 9", tier: Tier.PERIPHERY, wealth: 50, rawMaterials: 30, techLevel: 0 },
  { name: "Group 10", tier: Tier.PERIPHERY, wealth: 50, rawMaterials: 30, techLevel: 0 },
];

async function main() {
  console.log("Seeding database...");

  // Clear existing data
  await prisma.marketOrder.deleteMany();
  await prisma.gameEventLog.deleteMany();
  await prisma.team.deleteMany();
  await prisma.gameState.deleteMany();

  // Seed teams
  for (const team of teams) {
    await prisma.team.create({ data: team });
  }

  // Seed game state singleton
  await prisma.gameState.create({
    data: {
      id: "singleton",
      timerSeconds: 1200, // 20 minutes
      timerRunning: false,
      gameFrozen: false,
    },
  });

  console.log("Seeded 10 teams and game state.");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });

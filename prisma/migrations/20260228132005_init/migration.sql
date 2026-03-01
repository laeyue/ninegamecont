-- CreateEnum
CREATE TYPE "Tier" AS ENUM ('CORE', 'SEMI_PERIPHERY', 'PERIPHERY');

-- CreateEnum
CREATE TYPE "ItemType" AS ENUM ('RAW_MATERIAL', 'TECHNOLOGY');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('OPEN', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "teams" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tier" "Tier" NOT NULL,
    "wealth" INTEGER NOT NULL,
    "raw_materials" INTEGER NOT NULL,
    "tech_level" INTEGER NOT NULL,
    "fdi_investor_id" TEXT,

    CONSTRAINT "teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "market_orders" (
    "id" TEXT NOT NULL,
    "seller_id" TEXT NOT NULL,
    "buyer_id" TEXT,
    "item_type" "ItemType" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "price_per_unit" INTEGER NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'OPEN',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "market_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "game_event_logs" (
    "id" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "game_event_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "game_state" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "timer_seconds" INTEGER NOT NULL DEFAULT 1200,
    "timer_running" BOOLEAN NOT NULL DEFAULT false,
    "timer_ends_at" TIMESTAMP(3),
    "game_frozen" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "game_state_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "teams_name_key" ON "teams"("name");

-- AddForeignKey
ALTER TABLE "teams" ADD CONSTRAINT "teams_fdi_investor_id_fkey" FOREIGN KEY ("fdi_investor_id") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "market_orders" ADD CONSTRAINT "market_orders_seller_id_fkey" FOREIGN KEY ("seller_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "market_orders" ADD CONSTRAINT "market_orders_buyer_id_fkey" FOREIGN KEY ("buyer_id") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

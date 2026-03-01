import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sseBroadcaster, SSE_EVENTS } from "@/lib/sse";
import { sabotageState } from "@/lib/sabotage-state";
import type { CreateOrderRequest } from "@/types";

export const dynamic = 'force-dynamic';

// GET all open market orders
export async function GET() {
  try {
    const orders = await prisma.marketOrder.findMany({
      where: { status: "OPEN" },
      include: {
        seller: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    const data = orders.map((o) => ({
      id: o.id,
      sellerId: o.sellerId,
      sellerName: o.seller.name,
      buyerId: o.buyerId,
      itemType: o.itemType,
      quantity: o.quantity,
      pricePerUnit: o.pricePerUnit,
      status: o.status,
      createdAt: o.createdAt.toISOString(),
    }));

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("GET /api/market error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch orders" },
      { status: 500 }
    );
  }
}

// POST create a sell order
export async function POST(request: NextRequest) {
  try {
    const body: CreateOrderRequest = await request.json();
    const { sellerId, itemType, quantity, pricePerUnit } = body;

    if (!sellerId || !itemType || !quantity || !pricePerUnit) {
      return NextResponse.json(
        { success: false, error: "All fields are required" },
        { status: 400 }
      );
    }

    if (quantity < 1 || pricePerUnit < 1) {
      return NextResponse.json(
        { success: false, error: "Quantity and price must be positive" },
        { status: 400 }
      );
    }

    // Check game state
    const gameState = await prisma.gameState.findUnique({
      where: { id: "singleton" },
    });
    if (gameState?.gameFrozen) {
      return NextResponse.json(
        { success: false, error: "Game is frozen" },
        { status: 403 }
      );
    }

    // Use transaction: deduct materials (escrow) and create order
    const result = await prisma.$transaction(async (tx) => {
      const seller = await tx.team.findUnique({ where: { id: sellerId } });
      if (!seller) throw new Error("Seller not found");

      // Check embargo
      const embargo = sabotageState.isEmbargoed(sellerId);
      if (embargo) {
        const remaining = Math.ceil((embargo.until - Date.now()) / 1000);
        throw new Error(`Trade embargo by ${embargo.imposedByName} (${remaining}s remaining)`);
      }

      if (itemType === "RAW_MATERIAL" && seller.rawMaterials < quantity) {
        throw new Error("Not enough raw materials");
      }

      // Deduct materials (escrow)
      if (itemType === "RAW_MATERIAL") {
        await tx.team.update({
          where: { id: sellerId },
          data: { rawMaterials: { decrement: quantity } },
        });
      }

      const order = await tx.marketOrder.create({
        data: {
          sellerId,
          itemType,
          quantity,
          pricePerUnit,
          status: "OPEN",
        },
        include: { seller: { select: { name: true } } },
      });

      const updatedSeller = await tx.team.findUnique({ where: { id: sellerId } });

      return { order, updatedSeller };
    });

    const orderData = {
      id: result.order.id,
      sellerId: result.order.sellerId,
      sellerName: result.order.seller.name,
      buyerId: result.order.buyerId,
      itemType: result.order.itemType,
      quantity: result.order.quantity,
      pricePerUnit: result.order.pricePerUnit,
      status: result.order.status,
      createdAt: result.order.createdAt.toISOString(),
    };

    sseBroadcaster.emit(SSE_EVENTS.ORDER_UPDATE, { order: orderData });
    if (result.updatedSeller) {
      sseBroadcaster.emit(SSE_EVENTS.TEAM_UPDATE, { team: result.updatedSeller });
    }

    return NextResponse.json({ success: true, data: orderData });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create order";
    console.error("POST /api/market error:", message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 400 }
    );
  }
}

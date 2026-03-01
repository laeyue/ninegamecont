import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sseBroadcaster, SSE_EVENTS } from "@/lib/sse";
import { sabotageState } from "@/lib/sabotage-state";
import type { BuyOrderRequest } from "@/types";

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body: BuyOrderRequest = await request.json();
    const { buyerId } = body;
    const orderId = params.id;

    if (!buyerId) {
      return NextResponse.json(
        { success: false, error: "buyerId is required" },
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

    // Transactional buy — prevents double-buy race conditions
    const result = await prisma.$transaction(async (tx) => {
      // Lock the order row by reading it
      const order = await tx.marketOrder.findUnique({
        where: { id: orderId },
        include: { seller: { select: { name: true } } },
      });

      if (!order) throw new Error("Order not found");
      if (order.status !== "OPEN") throw new Error("Order is no longer available");
      if (order.sellerId === buyerId) throw new Error("Cannot buy your own order");

      // Check embargo on buyer
      const embargo = sabotageState.isEmbargoed(buyerId);
      if (embargo) {
        const remaining = Math.ceil((embargo.until - Date.now()) / 1000);
        throw new Error(`Trade embargo by ${embargo.imposedByName} (${remaining}s remaining)`);
      }

      const totalCost = order.quantity * order.pricePerUnit;

      // Verify buyer has enough wealth
      const buyer = await tx.team.findUnique({ where: { id: buyerId } });
      if (!buyer) throw new Error("Buyer not found");
      if (buyer.wealth < totalCost) {
        throw new Error(`Not enough wealth. Need $${totalCost}, have $${buyer.wealth}`);
      }

      // Deduct wealth from buyer
      const updatedBuyer = await tx.team.update({
        where: { id: buyerId },
        data: {
          wealth: { decrement: totalCost },
          ...(order.itemType === "RAW_MATERIAL"
            ? { rawMaterials: { increment: order.quantity } }
            : {}),
        },
      });

      // Credit wealth to seller
      const updatedSeller = await tx.team.update({
        where: { id: order.sellerId },
        data: { wealth: { increment: totalCost } },
      });

      // Mark order completed
      const completedOrder = await tx.marketOrder.update({
        where: { id: orderId },
        data: { status: "COMPLETED", buyerId },
        include: {
          seller: { select: { name: true } },
          buyer: { select: { name: true } },
        },
      });

      // Log the trade
      const log = await tx.gameEventLog.create({
        data: {
          message: `${buyer.name} bought ${order.quantity} ${order.itemType === "RAW_MATERIAL" ? "Raw Materials" : "Technology"} from ${order.seller.name} for $${totalCost}`,
        },
      });

      return { completedOrder, updatedBuyer, updatedSeller, log };
    });

    const orderData = {
      id: result.completedOrder.id,
      sellerId: result.completedOrder.sellerId,
      sellerName: result.completedOrder.seller.name,
      buyerId: result.completedOrder.buyerId,
      buyerName: result.completedOrder.buyer?.name,
      itemType: result.completedOrder.itemType,
      quantity: result.completedOrder.quantity,
      pricePerUnit: result.completedOrder.pricePerUnit,
      status: result.completedOrder.status,
      createdAt: result.completedOrder.createdAt.toISOString(),
    };

    // Broadcast all updates
    sseBroadcaster.emit(SSE_EVENTS.TRADE_COMPLETE, {
      order: orderData,
      buyer: result.updatedBuyer,
      seller: result.updatedSeller,
    });
    sseBroadcaster.emit(SSE_EVENTS.TEAM_UPDATE, { team: result.updatedBuyer });
    sseBroadcaster.emit(SSE_EVENTS.TEAM_UPDATE, { team: result.updatedSeller });
    sseBroadcaster.emit(SSE_EVENTS.ORDER_UPDATE, { order: orderData });
    sseBroadcaster.emit(SSE_EVENTS.EVENT_LOG, { log: result.log });

    return NextResponse.json({ success: true, data: orderData });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to buy";
    console.error("POST /api/market/[id]/buy error:", message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 400 }
    );
  }
}

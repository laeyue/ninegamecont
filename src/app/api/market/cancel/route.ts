import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sseBroadcaster, SSE_EVENTS } from "@/lib/sse";
import { checkGameActive } from "@/lib/game-guards";
import type { CancelOrderRequest } from "@/types";

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body: CancelOrderRequest = await request.json();
    const { orderId, sellerId } = body;

    if (!orderId || !sellerId) {
      return NextResponse.json(
        { success: false, error: "orderId and sellerId are required" },
        { status: 400 }
      );
    }

    // Check game is active (not frozen, not pre-game)
    const gameCheck = await checkGameActive();
    if (gameCheck) return gameCheck;

    const result = await prisma.$transaction(async (tx) => {
      const order = await tx.marketOrder.findUnique({ where: { id: orderId } });
      if (!order) throw new Error("Order not found");
      if (order.status !== "OPEN") throw new Error("Order is not open");
      if (order.sellerId !== sellerId) throw new Error("Not your order");

      // Return escrowed materials
      if (order.itemType === "RAW_MATERIAL") {
        await tx.team.update({
          where: { id: sellerId },
          data: { rawMaterials: { increment: order.quantity } },
        });
      }

      // Cancel order
      const cancelled = await tx.marketOrder.update({
        where: { id: orderId },
        data: { status: "CANCELLED" },
        include: { seller: { select: { name: true } } },
      });

      const updatedSeller = await tx.team.findUnique({ where: { id: sellerId } });

      return { cancelled, updatedSeller };
    });

    const orderData = {
      id: result.cancelled.id,
      sellerId: result.cancelled.sellerId,
      sellerName: result.cancelled.seller.name,
      buyerId: result.cancelled.buyerId,
      itemType: result.cancelled.itemType,
      quantity: result.cancelled.quantity,
      pricePerUnit: result.cancelled.pricePerUnit,
      status: result.cancelled.status,
      createdAt: result.cancelled.createdAt.toISOString(),
    };

    sseBroadcaster.emit(SSE_EVENTS.ORDER_UPDATE, { order: orderData });
    if (result.updatedSeller) {
      sseBroadcaster.emit(SSE_EVENTS.TEAM_UPDATE, { team: result.updatedSeller });
    }

    return NextResponse.json({ success: true, data: orderData });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to cancel order";
    console.error("POST /api/market/cancel error:", message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 400 }
    );
  }
}

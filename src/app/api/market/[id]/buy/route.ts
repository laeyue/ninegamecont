import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sseBroadcaster, SSE_EVENTS } from "@/lib/sse";
import { sabotageState } from "@/lib/sabotage-state";
import { checkGameActive, checkMemberRole } from "@/lib/game-guards";
import type { BuyOrderRequest } from "@/types";

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body: BuyOrderRequest = await request.json();
    const { buyerId, memberId } = body;
    const orderId = params.id;

    if (!buyerId) {
      return NextResponse.json(
        { success: false, error: "buyerId is required" },
        { status: 400 }
      );
    }

    // Check game is active (not frozen, not pre-game)
    const gameCheck = await checkGameActive();
    if (gameCheck) return gameCheck;

    // Check role (only MANUFACTURER can buy)
    if (memberId) {
      const roleCheck = checkMemberRole(memberId, "MANUFACTURER");
      if (roleCheck) return roleCheck;
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

      // Check if seller has an active tariff — if so, seller only receives a fraction
      const tariff = sabotageState.getTariff(order.sellerId);
      const sellerReceives = tariff
        ? Math.floor(totalCost * (1 - tariff.rate))
        : totalCost;
      const tariffTaken = totalCost - sellerReceives;

      // Deduct wealth from buyer (buyer always pays full price)
      const updatedBuyer = await tx.team.update({
        where: { id: buyerId },
        data: {
          wealth: { decrement: totalCost },
          ...(order.itemType === "RAW_MATERIAL"
            ? { rawMaterials: { increment: order.quantity } }
            : {}),
        },
      });

      // Credit wealth to seller (reduced if tariff is active)
      const updatedSeller = await tx.team.update({
        where: { id: order.sellerId },
        data: { wealth: { increment: sellerReceives } },
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

      // Log the trade (include tariff info if applicable)
      const tariffNote = tariffTaken > 0
        ? ` (TARIFF: seller received $${sellerReceives}, $${tariffTaken} lost to tariff)`
        : "";
      const log = await tx.gameEventLog.create({
        data: {
          message: `${buyer.name} bought ${order.quantity} ${order.itemType === "RAW_MATERIAL" ? "Raw Materials" : "Technology"} from ${order.seller.name} for $${totalCost}${tariffNote}`,
        },
      });

      return { completedOrder, updatedBuyer, updatedSeller, log, tariffTaken };
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

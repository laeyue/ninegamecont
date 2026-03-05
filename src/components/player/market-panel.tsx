"use client";

import { useState } from "react";
import { ShoppingCart, Tag, X, Loader2 } from "lucide-react";
import type { TeamData, MarketOrderData, GameStateData } from "@/types";
import type { MemberRole } from "@/hooks/use-member";
import { getTierTheme, cn } from "@/lib/utils";

interface MarketPanelProps {
  team: TeamData;
  orders: MarketOrderData[];
  gameState: GameStateData | null;
  role: MemberRole;
  memberId: string;
}

export function MarketPanel({ team, orders, gameState, role, memberId }: MarketPanelProps) {
  const theme = getTierTheme(team.tier);
  const isFrozen = gameState?.gameFrozen ?? false;
  const [showSellForm, setShowSellForm] = useState(false);

  const canSell = role === "MINER" && !isFrozen && team.rawMaterials > 0;
  const canBuy = role === "MANUFACTURER";

  return (
    <div className={`${theme.bgCard} border ${theme.border} rounded-xl p-4`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h2 className={`text-sm font-semibold uppercase tracking-wider ${theme.accent}`}>
            Market
          </h2>
        </div>
        {canSell && (
          <button
            onClick={() => setShowSellForm(!showSellForm)}
            className={cn(
              "text-xs px-3 py-1.5 rounded-lg font-medium transition-all",
              showSellForm ? "bg-gray-600 text-gray-300" : theme.buttonSecondary
            )}
          >
            {showSellForm ? "Cancel" : "+ Sell Order"}
          </button>
        )}
      </div>

      {/* Sell Form */}
      {showSellForm && canSell && (
        <SellForm team={team} theme={theme} memberId={memberId} onClose={() => setShowSellForm(false)} />
      )}

      {/* Open Orders */}
      <div className="space-y-2 mt-3">
        {orders.length === 0 ? (
          <div className="text-center py-6 text-gray-600 text-sm">
            No open orders on the market
          </div>
        ) : (
          orders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              team={team}
              isFrozen={isFrozen}
              canBuy={canBuy}
              memberId={memberId}
            />
          ))
        )}
      </div>
    </div>
  );
}

function SellForm({
  team,
  theme,
  memberId,
  onClose,
}: {
  team: TeamData;
  theme: ReturnType<typeof getTierTheme>;
  memberId: string;
  onClose: () => void;
}) {
  const [quantityInput, setQuantityInput] = useState("1");
  const [priceInput, setPriceInput] = useState("10");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parsedQty = Math.max(1, Math.min(parseInt(quantityInput) || 1, team.rawMaterials));
  const parsedPrice = Math.max(1, parseInt(priceInput) || 1);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/market", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sellerId: team.id,
          memberId,
          itemType: "RAW_MATERIAL",
          quantity: parsedQty,
          pricePerUnit: parsedPrice,
        }),
      });
      const data = await res.json();
      if (data.success) {
        onClose();
      } else {
        setError(data.error || "Failed to create order");
      }
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={`border ${theme.border} rounded-lg p-3 mb-3 bg-black/20`}
    >
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <label className="text-xs text-gray-400 block mb-1">Quantity</label>
          <input
            type="number"
            min={1}
            max={team.rawMaterials}
            value={quantityInput}
            onChange={(e) => setQuantityInput(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-gray-500"
          />
        </div>
        <div>
          <label className="text-xs text-gray-400 block mb-1">Price/unit ($)</label>
          <input
            type="number"
            min={1}
            value={priceInput}
            onChange={(e) => setPriceInput(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-gray-500"
          />
        </div>
      </div>
      <div className="text-xs text-gray-400 mb-3">
        Total: ${parsedQty * parsedPrice} for {parsedQty} materials
      </div>
      {error && (
        <div className="text-red-400 text-xs mb-2">{error}</div>
      )}
      <button
        type="submit"
        disabled={loading}
        className={cn(
          "w-full rounded-lg py-2 font-medium text-sm transition-all",
          theme.button
        )}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin mx-auto" />
        ) : (
          `List ${parsedQty} Materials @ $${parsedPrice}/ea`
        )}
      </button>
    </form>
  );
}

function OrderCard({
  order,
  team,
  isFrozen,
  canBuy,
  memberId,
}: {
  order: MarketOrderData;
  team: TeamData;
  isFrozen: boolean;
  canBuy: boolean;
  memberId: string;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isOwn = order.sellerId === team.id;
  const totalCost = order.quantity * order.pricePerUnit;
  const canAfford = team.wealth >= totalCost;

  const handleBuy = async () => {
    if (loading || isFrozen || !canAfford || !canBuy) return;
    setError(null);
    setLoading(true);

    try {
      const res = await fetch(`/api/market/${order.id}/buy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ buyerId: team.id, memberId }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error || "Failed to buy");
      }
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (loading) return;
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/market/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: order.id, sellerId: team.id }),
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error || "Failed to cancel");
      }
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-between bg-black/20 rounded-lg p-3 border border-white/5">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <Tag className="h-3 w-3 text-gray-500 shrink-0" />
          <span className="text-sm font-medium text-gray-200 truncate">
            {order.sellerName || "Unknown"}
          </span>
          {isOwn && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-900/30 text-blue-400 border border-blue-800/30">
              You
            </span>
          )}
        </div>
        <div className="text-xs text-gray-500">
          {order.quantity}x Raw Materials @ ${order.pricePerUnit}/ea = ${totalCost}
        </div>
        {error && <div className="text-red-400 text-xs mt-1">{error}</div>}
      </div>

      <div className="shrink-0 ml-3">
        {isOwn ? (
          <button
            onClick={handleCancel}
            disabled={loading || isFrozen}
            className="p-2 rounded-lg bg-red-900/30 text-red-400 hover:bg-red-900/50 transition-colors disabled:opacity-50"
            title="Cancel order"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <X className="h-4 w-4" />
            )}
          </button>
        ) : (
          canBuy ? (
            <button
              onClick={handleBuy}
              disabled={loading || isFrozen || !canAfford}
              className={cn(
                "px-3 py-2 rounded-lg text-xs font-medium transition-all",
                !canAfford || isFrozen
                  ? "bg-gray-700 text-gray-500 cursor-not-allowed"
                  : "bg-green-600 hover:bg-green-500 text-white"
              )}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <div className="flex items-center gap-1.5">
                  <ShoppingCart className="h-3 w-3" />
                  <span>Buy ${totalCost}</span>
                </div>
              )}
            </button>
          ) : (
            <div className="text-xs text-gray-600 px-2">
              ${totalCost}
            </div>
          )
        )}
      </div>
    </div>
  );
}

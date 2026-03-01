"use client";

import { useState, useEffect, useCallback } from "react";
import type { TeamData, GameStateData, MarketOrderData, GameEventLogData, ApiResponse } from "@/types";
import { useSSE } from "./use-sse";

export function useTeam(teamId: string | null) {
  const [team, setTeam] = useState<TeamData | null>(null);
  const [allTeams, setAllTeams] = useState<TeamData[]>([]);
  const [orders, setOrders] = useState<MarketOrderData[]>([]);
  const [gameState, setGameState] = useState<GameStateData | null>(null);
  const [logs, setLogs] = useState<GameEventLogData[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch initial data
  const fetchAll = useCallback(async () => {
    try {
      const [teamsRes, ordersRes, stateRes, logsRes] = await Promise.all([
        fetch("/api/teams"),
        fetch("/api/market"),
        fetch("/api/game/state"),
        fetch("/api/log"),
      ]);
      const teamsData: ApiResponse<TeamData[]> = await teamsRes.json();
      const ordersData: ApiResponse<MarketOrderData[]> = await ordersRes.json();
      const stateData: ApiResponse<GameStateData> = await stateRes.json();
      const logsData: ApiResponse<GameEventLogData[]> = await logsRes.json();

      if (teamsData.data) {
        setAllTeams(teamsData.data);
        if (teamId) {
          const myTeam = teamsData.data.find((t) => t.id === teamId);
          if (myTeam) setTeam(myTeam);
        }
      }
      if (ordersData.data) setOrders(ordersData.data);
      if (stateData.data) setGameState(stateData.data);
      if (logsData.data) setLogs(logsData.data);
    } catch (err) {
      console.error("Failed to fetch initial data:", err);
    } finally {
      setLoading(false);
    }
  }, [teamId]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // SSE handlers
  useSSE({
    "team-update": (data: unknown) => {
      const { team: updatedTeam } = data as { team: TeamData };
      setAllTeams((prev) =>
        prev.map((t) => (t.id === updatedTeam.id ? updatedTeam : t))
      );
      if (teamId && updatedTeam.id === teamId) {
        setTeam(updatedTeam);
      }
    },
    "order-update": (data: unknown) => {
      const { order } = data as { order: MarketOrderData };
      setOrders((prev) => {
        const existing = prev.findIndex((o) => o.id === order.id);
        if (existing >= 0) {
          // Update or remove completed/cancelled orders
          if (order.status !== "OPEN") {
            return prev.filter((o) => o.id !== order.id);
          }
          return prev.map((o) => (o.id === order.id ? order : o));
        }
        if (order.status === "OPEN") {
          return [order, ...prev];
        }
        return prev;
      });
    },
    "trade-complete": (data: unknown) => {
      const { order, buyer, seller } = data as {
        order: MarketOrderData;
        buyer: TeamData;
        seller: TeamData;
      };
      // Remove completed order from list
      setOrders((prev) => prev.filter((o) => o.id !== order.id));
      // Update both teams
      setAllTeams((prev) =>
        prev.map((t) => {
          if (t.id === buyer.id) return buyer;
          if (t.id === seller.id) return seller;
          return t;
        })
      );
      if (teamId === buyer.id) setTeam(buyer);
      if (teamId === seller.id) setTeam(seller);
    },
    "event-log": (data: unknown) => {
      const { log } = data as { log: GameEventLogData };
      setLogs((prev) => [log, ...prev].slice(0, 100));
    },
    "game-state-update": (data: unknown) => {
      const { state } = data as { state: GameStateData };
      setGameState(state);
    },
    "game-reset": () => {
      fetchAll();
    },
  });

  return {
    team,
    allTeams,
    orders,
    gameState,
    logs,
    loading,
    refresh: fetchAll,
  };
}

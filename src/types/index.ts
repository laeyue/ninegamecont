import { Tier, ItemType, OrderStatus } from "@prisma/client";

export type { Tier, ItemType, OrderStatus };

// Re-export enums for client usage
export { Tier as TierEnum, ItemType as ItemTypeEnum, OrderStatus as OrderStatusEnum } from "@prisma/client";

// ---------- API types ----------

export interface TeamData {
  id: string;
  name: string;
  tier: Tier;
  wealth: number;
  rawMaterials: number;
  techLevel: number;
  fdiInvestorId: string | null;
}

export interface MarketOrderData {
  id: string;
  sellerId: string;
  sellerName?: string;
  buyerId: string | null;
  buyerName?: string;
  itemType: ItemType;
  quantity: number;
  pricePerUnit: number;
  status: OrderStatus;
  createdAt: string;
}

export interface GameStateData {
  timerSeconds: number;
  timerRunning: boolean;
  timerEndsAt: string | null;
  gameFrozen: boolean;
}

export interface GameEventLogData {
  id: string;
  message: string;
  timestamp: string;
}

// ---------- API request bodies ----------

export interface MineRequest {
  teamId: string;
  memberId: string;
}

export interface ManufactureRequest {
  teamId: string;
  memberId: string;
}

export interface CreateOrderRequest {
  sellerId: string;
  memberId?: string;
  itemType: ItemType;
  quantity: number;
  pricePerUnit: number;
}

export interface BuyOrderRequest {
  buyerId: string;
  memberId?: string;
}

export interface CancelOrderRequest {
  orderId: string;
  sellerId: string;
}

export type DebtCrisisRequest = Record<string, never>;

export interface FdiRequest {
  investorId: string;
  recipientId: string;
}

export interface UpdateGameStateRequest {
  timerSeconds?: number;
  timerRunning?: boolean;
  gameFrozen?: boolean;
}

// ---------- API response ----------

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// ---------- SSE event payloads ----------

export interface SSETeamUpdate {
  team: TeamData;
}

export interface SSEOrderUpdate {
  order: MarketOrderData;
}

export interface SSETradeComplete {
  order: MarketOrderData;
  buyer: TeamData;
  seller: TeamData;
}

export interface SSEEventLog {
  log: GameEventLogData;
}

export interface SSEGameStateUpdate {
  state: GameStateData;
}

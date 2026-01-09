import Dexie, { type Table } from "dexie";

export const DEFAULT_LOCAL_WORKSPACE_ID = "local" as const;

export type WorkspaceId = string;
export type TradeDirection = "BUY" | "SELL";
export type PsychPhase = "BEFORE" | "DURING" | "AFTER";

export interface MetaKV {
  key: string;
  value: string;
}

export interface Trade {
  id: string;

  workspaceId: WorkspaceId;

  instrument: string;
  strategy?: string;
  direction: TradeDirection;

  openTime: string; // ISO UTC
  closeTime: string; // ISO UTC

  entryPrice: number;
  exitPrice: number;
  stopLoss?: number;
  takeProfit?: number;

  tags?: string[];
  notes?: string;

  pips?: number;
  rMultiple?: number;

  createdAt: string;
  updatedAt: string;

  deletedAt?: string | null;
}

export interface PsychSnapshot {
  id: string;

  workspaceId: WorkspaceId;

  tradeId: string;
  phase: PsychPhase;

  confidence: number;
  stress: number;
  fomo: number;
  revenge: number;
  discipline: number;

  note?: string;

  createdAt: string;
  updatedAt: string;

  deletedAt?: string | null;
}

function isoNow() {
  return new Date().toISOString();
}

export class FXJournalDB extends Dexie {
  trades!: Table<Trade, string>;
  psychSnapshots!: Table<PsychSnapshot, string>;
  meta!: Table<MetaKV, string>;

  constructor() {
    // Keep DB name stable. If you previously used a different name, you can change this string.
    super("fx-journal");

    // Use a high version to ensure upgrades run cleanly.
    this.version(11)
      .stores({
        trades:
          "id, workspaceId, updatedAt, deletedAt, instrument, strategy, direction, openTime, closeTime, createdAt",
        psychSnapshots:
          "id, [tradeId+phase], workspaceId, updatedAt, deletedAt, tradeId, phase, createdAt",
        meta: "&key",
      })
      .upgrade(async (tx) => {
        const ws = DEFAULT_LOCAL_WORKSPACE_ID;

        // Backfill trades
        await tx.table("trades").toCollection().modify((t: any) => {
          if (!t.workspaceId) t.workspaceId = ws;
          if (t.deletedAt === undefined) t.deletedAt = null;
          if (!t.createdAt) t.createdAt = isoNow();
          if (!t.updatedAt) t.updatedAt = t.createdAt ?? isoNow();
        });

        // Backfill psych snapshots
        await tx.table("psychSnapshots").toCollection().modify((p: any) => {
          if (!p.workspaceId) p.workspaceId = ws;
          if (p.deletedAt === undefined) p.deletedAt = null;
          if (!p.createdAt) p.createdAt = isoNow();
          if (!p.updatedAt) p.updatedAt = p.createdAt ?? isoNow();
        });

        // Ensure active workspace key exists
        const meta = tx.table("meta");
        const existing = await meta.get("activeWorkspaceId");
        if (!existing) {
          await meta.put({ key: "activeWorkspaceId", value: ws });
        }
      });
  }
}

export const db = new FXJournalDB();
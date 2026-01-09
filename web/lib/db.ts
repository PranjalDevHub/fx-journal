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

  openTime: string;
  closeTime: string;

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
    // IMPORTANT: if your previous db name was different, keep it the same.
    super("fx-journal");

    // Bump version so Dexie upgrades cleanly.
    this.version(11)
      .stores({
        trades:
          "id, workspaceId, updatedAt, deletedAt, instrument, strategy, direction, openTime, closeTime, createdAt",
        psychSnapshots:
          "id, [tradeId+phase], workspaceId, updatedAt, deletedAt, tradeId, phase, createdAt",
        meta: "&key",
      })
      .upgrade(async (tx) => {
        const defaultWs = DEFAULT_LOCAL_WORKSPACE_ID;

        await tx.table("trades").toCollection().modify((t: any) => {
          if (!t.workspaceId) t.workspaceId = defaultWs;
          if (t.deletedAt === undefined) t.deletedAt = null;

          if (!t.createdAt) t.createdAt = isoNow();
          if (!t.updatedAt) t.updatedAt = t.createdAt ?? isoNow();
        });

        await tx.table("psychSnapshots").toCollection().modify((p: any) => {
          if (!p.workspaceId) p.workspaceId = defaultWs;
          if (p.deletedAt === undefined) p.deletedAt = null;

          if (!p.createdAt) p.createdAt = isoNow();
          if (!p.updatedAt) p.updatedAt = p.createdAt ?? isoNow();
        });

        const metaTable = tx.table("meta");
        const existingActive = await metaTable.get("activeWorkspaceId");
        if (!existingActive) {
          await metaTable.put({ key: "activeWorkspaceId", value: defaultWs });
        }
      });

    // ---- Hooks: auto-fill required fields on create/update ----

    this.trades.hook("creating", async (_pk, obj: any, tx) => {
      // Fill workspaceId from meta.activeWorkspaceId if missing
      if (!obj.workspaceId) {
        const meta = await tx.table("meta").get("activeWorkspaceId");
        obj.workspaceId = meta?.value ?? DEFAULT_LOCAL_WORKSPACE_ID;
      }

      if (obj.deletedAt === undefined) obj.deletedAt = null;

      if (!obj.createdAt) obj.createdAt = isoNow();
      if (!obj.updatedAt) obj.updatedAt = obj.createdAt ?? isoNow();
    });

    this.trades.hook("updating", async (mods: any, _pk, obj: any, tx) => {
      // Always bump updatedAt unless caller already set it
      if (mods.updatedAt === undefined) mods.updatedAt = isoNow();

      // Keep deletedAt as null unless explicitly set
      if (mods.deletedAt === undefined && obj.deletedAt === undefined) mods.deletedAt = null;

      // If workspaceId is missing, fill from meta
      if (mods.workspaceId === undefined && !obj.workspaceId) {
        const meta = await tx.table("meta").get("activeWorkspaceId");
        mods.workspaceId = meta?.value ?? DEFAULT_LOCAL_WORKSPACE_ID;
      }

      return mods;
    });

    this.psychSnapshots.hook("creating", async (_pk, obj: any, tx) => {
      if (!obj.workspaceId) {
        const meta = await tx.table("meta").get("activeWorkspaceId");
        obj.workspaceId = meta?.value ?? DEFAULT_LOCAL_WORKSPACE_ID;
      }

      if (obj.deletedAt === undefined) obj.deletedAt = null;

      if (!obj.createdAt) obj.createdAt = isoNow();
      if (!obj.updatedAt) obj.updatedAt = obj.createdAt ?? isoNow();
    });

    this.psychSnapshots.hook("updating", async (mods: any, _pk, obj: any, tx) => {
      if (mods.updatedAt === undefined) mods.updatedAt = isoNow();
      if (mods.deletedAt === undefined && obj.deletedAt === undefined) mods.deletedAt = null;

      if (mods.workspaceId === undefined && !obj.workspaceId) {
        const meta = await tx.table("meta").get("activeWorkspaceId");
        mods.workspaceId = meta?.value ?? DEFAULT_LOCAL_WORKSPACE_ID;
      }

      return mods;
    });
  }
}

export const db = new FXJournalDB();
import { supabase } from "@/lib/supabase/client";
import { db, type Trade, type PsychSnapshot } from "@/lib/db";

function nowIso() {
  return new Date().toISOString();
}

function lastSyncKey(workspaceId: string) {
  return `lastSyncAt:${workspaceId}`;
}

async function getLastSyncAt(workspaceId: string): Promise<string> {
  const row = await db.meta.get(lastSyncKey(workspaceId));
  return row?.value ?? new Date(0).toISOString();
}

async function setLastSyncAt(workspaceId: string, iso: string) {
  await db.meta.put({ key: lastSyncKey(workspaceId), value: iso });
}

/** Convert local Trade -> Supabase row */
function toRemoteTrade(t: Trade) {
  return {
    id: t.id,
    workspace_id: t.workspaceId,
    instrument: t.instrument,
    strategy: t.strategy ?? null,
    direction: t.direction,
    open_time: t.openTime,
    close_time: t.closeTime,
    entry_price: t.entryPrice,
    exit_price: t.exitPrice,
    stop_loss: t.stopLoss ?? null,
    take_profit: t.takeProfit ?? null,
    tags: t.tags ?? null,
    notes: t.notes ?? null,
    pips: t.pips ?? null,
    r_multiple: t.rMultiple ?? null,
    deleted_at: t.deletedAt ?? null,
  };
}

/** Convert Supabase row -> local Trade */
function fromRemoteTrade(r: any): Trade {
  return {
    id: r.id,
    workspaceId: r.workspace_id,
    instrument: r.instrument,
    strategy: r.strategy ?? undefined,
    direction: r.direction,
    openTime: r.open_time,
    closeTime: r.close_time,
    entryPrice: Number(r.entry_price),
    exitPrice: Number(r.exit_price),
    stopLoss: r.stop_loss == null ? undefined : Number(r.stop_loss),
    takeProfit: r.take_profit == null ? undefined : Number(r.take_profit),
    tags: r.tags ?? undefined,
    notes: r.notes ?? undefined,
    pips: r.pips == null ? undefined : Number(r.pips),
    rMultiple: r.r_multiple == null ? undefined : Number(r.r_multiple),
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    deletedAt: r.deleted_at,
  };
}

function toRemotePsych(p: PsychSnapshot) {
  return {
    id: p.id,
    workspace_id: p.workspaceId,
    trade_id: p.tradeId,
    phase: p.phase,
    confidence: p.confidence,
    stress: p.stress,
    fomo: p.fomo,
    revenge: p.revenge,
    discipline: p.discipline,
    note: p.note ?? null,
    deleted_at: p.deletedAt ?? null,
  };
}

function fromRemotePsych(r: any): PsychSnapshot {
  return {
    id: r.id,
    workspaceId: r.workspace_id,
    tradeId: r.trade_id,
    phase: r.phase,
    confidence: r.confidence,
    stress: r.stress,
    fomo: r.fomo,
    revenge: r.revenge,
    discipline: r.discipline,
    note: r.note ?? undefined,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    deletedAt: r.deleted_at,
  };
}

/**
 * Sync one workspace:
 * - push local changes to Supabase (upsert)
 * - pull remote changes back to Dexie
 */
export async function syncWorkspace(workspaceId: string) {
  // never sync local-only workspace
  if (workspaceId === "local") return;

  // if offline, skip (offline-first)
  if (typeof navigator !== "undefined" && !navigator.onLine) return;

  const lastSyncAt = await getLastSyncAt(workspaceId);

  // -------- PUSH (local -> cloud) --------
  const localTradesChanged = await db.trades
    .where("workspaceId")
    .equals(workspaceId)
    .filter((t) => (t.updatedAt ?? "") > lastSyncAt || (t.deletedAt ?? "") > lastSyncAt)
    .toArray();

  if (localTradesChanged.length > 0) {
    const { data, error } = await supabase
      .from("trades")
      .upsert(localTradesChanged.map(toRemoteTrade), { onConflict: "id" })
      .select("*");

    if (error) throw error;
    if (data?.length) await db.trades.bulkPut(data.map(fromRemoteTrade));
  }

  const localPsychChanged = await db.psychSnapshots
    .where("workspaceId")
    .equals(workspaceId)
    .filter((p) => (p.updatedAt ?? "") > lastSyncAt || (p.deletedAt ?? "") > lastSyncAt)
    .toArray();

  if (localPsychChanged.length > 0) {
    const { data, error } = await supabase
      .from("psych_snapshots")
      .upsert(localPsychChanged.map(toRemotePsych), { onConflict: "id" })
      .select("*");

    if (error) throw error;
    if (data?.length) await db.psychSnapshots.bulkPut(data.map(fromRemotePsych));
  }

  // -------- PULL (cloud -> local) --------
  const { data: remoteTrades, error: rtErr } = await supabase
    .from("trades")
    .select("*")
    .eq("workspace_id", workspaceId)
    .or(`updated_at.gt.${lastSyncAt},deleted_at.gt.${lastSyncAt}`);

  if (rtErr) throw rtErr;
  if (remoteTrades?.length) await db.trades.bulkPut(remoteTrades.map(fromRemoteTrade));

  const { data: remotePsych, error: rpErr } = await supabase
    .from("psych_snapshots")
    .select("*")
    .eq("workspace_id", workspaceId)
    .or(`updated_at.gt.${lastSyncAt},deleted_at.gt.${lastSyncAt}`);

  if (rpErr) throw rpErr;
  if (remotePsych?.length) await db.psychSnapshots.bulkPut(remotePsych.map(fromRemotePsych));

  await setLastSyncAt(workspaceId, nowIso());
}
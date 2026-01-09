"use client";

import React, { useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, type PsychSnapshot, type Trade } from "@/lib/db";
import { useWorkspace } from "@/components/workspace-provider";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function getR(t: Trade): number | null {
  return typeof t.rMultiple === "number" && Number.isFinite(t.rMultiple) ? t.rMultiple : null;
}

function snapshotScore(p: PsychSnapshot) {
  // simple “good mindset” score
  // higher confidence/discipline good; higher stress/fomo/revenge bad
  return p.confidence + p.discipline - p.stress - p.fomo - p.revenge;
}

export default function PsychologyPage() {
  const { activeWorkspaceId } = useWorkspace();

  const trades = useLiveQuery(async () => {
    const rows = await db.trades
      .where("workspaceId")
      .equals(activeWorkspaceId)
      .and((t) => !t.deletedAt)
      .toArray();
    return rows;
  }, [activeWorkspaceId]);

  const snapshots = useLiveQuery(async () => {
    const rows = await db.psychSnapshots
      .where("workspaceId")
      .equals(activeWorkspaceId)
      .and((p) => !p.deletedAt)
      .toArray();
    return rows;
  }, [activeWorkspaceId]);

  const safeTrades = trades ?? [];
  const safeSnapshots = snapshots ?? [];

  const summary = useMemo(() => {
    // Map tradeId -> avg snapshot score
    const byTrade = new Map<string, { sum: number; n: number }>();
    for (const p of safeSnapshots) {
      if (!byTrade.has(p.tradeId)) byTrade.set(p.tradeId, { sum: 0, n: 0 });
      const obj = byTrade.get(p.tradeId)!;
      obj.sum += snapshotScore(p);
      obj.n += 1;
    }

    const rows = safeTrades
      .map((t) => {
        const r = getR(t);
        if (r === null) return null;
        const s = byTrade.get(t.id);
        if (!s || s.n === 0) return null;
        return { tradeId: t.id, r, score: s.sum / s.n };
      })
      .filter(Boolean) as { tradeId: string; r: number; score: number }[];

    if (rows.length < 6) {
      return {
        n: rows.length,
        high: null,
        low: null,
      };
    }

    // Split by median score
    const sorted = [...rows].sort((a, b) => a.score - b.score);
    const mid = Math.floor(sorted.length / 2);
    const low = sorted.slice(0, mid);
    const high = sorted.slice(mid);

    const avg = (arr: { r: number }[]) => arr.reduce((a, b) => a + b.r, 0) / arr.length;

    return {
      n: rows.length,
      high: { n: high.length, avgR: avg(high) },
      low: { n: low.length, avgR: avg(low) },
    };
  }, [safeTrades, safeSnapshots]);

  const phaseCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of safeSnapshots) map.set(p.phase, (map.get(p.phase) ?? 0) + 1);
    return {
      BEFORE: map.get("BEFORE") ?? 0,
      DURING: map.get("DURING") ?? 0,
      AFTER: map.get("AFTER") ?? 0,
    };
  }, [safeSnapshots]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Psychology analysis</h1>
        <p className="text-sm text-muted-foreground">
          Workspace-aware psychology impact (uses your saved snapshots + R).
        </p>
      </div>

      <div className="rounded-xl border p-4 space-y-2">
        <div className="text-sm font-medium">Snapshot coverage</div>
        <div className="text-sm text-muted-foreground">
          BEFORE: {phaseCounts.BEFORE} • DURING: {phaseCounts.DURING} • AFTER: {phaseCounts.AFTER}
        </div>
      </div>

      <div className="rounded-xl border">
        <div className="p-4 text-sm font-medium">High vs Low mindset score (Avg R)</div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Group</TableHead>
              <TableHead className="text-right">Trades used</TableHead>
              <TableHead className="text-right">Avg R</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {summary.high && summary.low ? (
              <>
                <TableRow>
                  <TableCell className="font-medium">High score</TableCell>
                  <TableCell className="text-right">{summary.high.n}</TableCell>
                  <TableCell className="text-right">{summary.high.avgR.toFixed(2)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">Low score</TableCell>
                  <TableCell className="text-right">{summary.low.n}</TableCell>
                  <TableCell className="text-right">{summary.low.avgR.toFixed(2)}</TableCell>
                </TableRow>
              </>
            ) : (
              <TableRow>
                <TableCell colSpan={3} className="py-10 text-center text-sm text-muted-foreground">
                  Not enough data yet (need psychology snapshots + Stop Loss so R exists).
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
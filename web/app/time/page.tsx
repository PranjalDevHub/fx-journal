"use client";

import React, { useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, type Trade } from "@/lib/db";
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

function hourUtc(iso: string) {
  const d = new Date(iso);
  return d.getUTCHours(); // 0..23
}

function weekdayUtc(iso: string) {
  const d = new Date(iso);
  return d.getUTCDay(); // 0=Sun..6=Sat
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function sessionNameByHour(h: number) {
  // simple UTC sessions
  if (h >= 0 && h < 7) return "Asia";
  if (h >= 7 && h < 12) return "London";
  if (h >= 12 && h < 17) return "New York";
  return "After-hours";
}

export default function TimePage() {
  const { activeWorkspaceId } = useWorkspace();

  const trades = useLiveQuery(async () => {
    const rows = await db.trades
      .where("workspaceId")
      .equals(activeWorkspaceId)
      .and((t) => !t.deletedAt)
      .toArray();
    return rows;
  }, [activeWorkspaceId]);

  const safeTrades = trades ?? [];

  const sessionStats = useMemo(() => {
    const map = new Map<string, { n: number; wins: number; sumR: number }>();

    for (const t of safeTrades) {
      const r = getR(t);
      if (r === null) continue;
      const s = sessionNameByHour(hourUtc(t.openTime));
      if (!map.has(s)) map.set(s, { n: 0, wins: 0, sumR: 0 });
      const obj = map.get(s)!;
      obj.n += 1;
      obj.sumR += r;
      if (r > 0) obj.wins += 1;
    }

    const out = Array.from(map.entries()).map(([session, v]) => ({
      session,
      trades: v.n,
      winRate: v.n ? (v.wins / v.n) * 100 : 0,
      avgR: v.n ? v.sumR / v.n : 0,
    }));

    out.sort((a, b) => b.avgR - a.avgR);
    return out;
  }, [safeTrades]);

  const heatmap = useMemo(() => {
    // [weekday][hour] -> {sumR, n}
    const grid = Array.from({ length: 7 }, () =>
      Array.from({ length: 24 }, () => ({ sumR: 0, n: 0 }))
    );

    for (const t of safeTrades) {
      const r = getR(t);
      if (r === null) continue;
      const wd = weekdayUtc(t.openTime);
      const hr = hourUtc(t.openTime);
      grid[wd][hr].sumR += r;
      grid[wd][hr].n += 1;
    }

    return grid.map((row) =>
      row.map((cell) => (cell.n ? Math.round((cell.sumR / cell.n) * 100) / 100 : null))
    );
  }, [safeTrades]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Time analysis</h1>
        <p className="text-sm text-muted-foreground">Grouped by UTC. Workspace-aware.</p>
      </div>

      <div className="rounded-xl border">
        <div className="p-4 text-sm font-medium">Session stats (UTC)</div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Session</TableHead>
              <TableHead className="text-right">Trades</TableHead>
              <TableHead className="text-right">Win rate</TableHead>
              <TableHead className="text-right">Avg R</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sessionStats.map((s) => (
              <TableRow key={s.session}>
                <TableCell className="font-medium">{s.session}</TableCell>
                <TableCell className="text-right">{s.trades}</TableCell>
                <TableCell className="text-right">{s.winRate.toFixed(1)}%</TableCell>
                <TableCell className="text-right">{s.avgR.toFixed(2)}</TableCell>
              </TableRow>
            ))}

            {sessionStats.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="py-10 text-center text-sm text-muted-foreground">
                  Not enough data (need trades with Stop Loss so R can be calculated).
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>

      <div className="rounded-xl border p-4 space-y-3">
        <div className="text-sm font-medium">Hour × Weekday heatmap (Avg R)</div>
        <div className="overflow-auto">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr>
                <th className="border p-2 text-left">UTC</th>
                {Array.from({ length: 24 }, (_, h) => (
                  <th key={h} className="border p-2 text-center">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {WEEKDAYS.map((wd, i) => (
                <tr key={wd}>
                  <td className="border p-2 font-medium">{wd}</td>
                  {heatmap[i].map((v, h) => (
                    <td key={h} className="border p-2 text-center">
                      {v === null ? "-" : v.toFixed(2)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="text-xs text-muted-foreground">
          Cells show Avg R for trades opened at that UTC hour.
        </div>
      </div>
    </div>
  );
}
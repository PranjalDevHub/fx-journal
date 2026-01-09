"use client";

import React, { useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";

import { db, type Trade } from "@/lib/db";
import { useWorkspace } from "@/components/workspace-provider";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

import { TradeFormDialog } from "@/components/trade-form-dialog";
import { TradeActions } from "@/components/trade-actions";

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function num(n: unknown) {
  const x = Number(n);
  return Number.isFinite(x) ? x : 0;
}

export default function TradesPage() {
  const { activeWorkspaceId } = useWorkspace();

  const [addOpen, setAddOpen] = useState(false);

  // Filters
  const [instrumentFilter, setInstrumentFilter] = useState("");
  const [strategyFilter, setStrategyFilter] = useState("");
  const [directionFilter, setDirectionFilter] = useState<"ALL" | "BUY" | "SELL">("ALL");
  const [tagContains, setTagContains] = useState("");

  const trades = useLiveQuery(async () => {
    const rows = await db.trades
      .where("workspaceId")
      .equals(activeWorkspaceId)
      .and((t) => !t.deletedAt)
      .toArray();

    // newest first
    rows.sort((a, b) => b.closeTime.localeCompare(a.closeTime));
    return rows;
  }, [activeWorkspaceId]);

  const filtered = useMemo(() => {
    const rows = trades ?? [];

    const inst = instrumentFilter.trim().toLowerCase();
    const strat = strategyFilter.trim().toLowerCase();
    const tag = tagContains.trim().toLowerCase();

    return rows.filter((t) => {
      if (inst && !t.instrument.toLowerCase().includes(inst)) return false;
      if (strat && !(t.strategy ?? "").toLowerCase().includes(strat)) return false;
      if (directionFilter !== "ALL" && t.direction !== directionFilter) return false;
      if (tag) {
        const tags = t.tags ?? [];
        const ok = tags.some((x) => String(x).toLowerCase().includes(tag));
        if (!ok) return false;
      }
      return true;
    });
  }, [trades, instrumentFilter, strategyFilter, directionFilter, tagContains]);

  function clearFilters() {
    setInstrumentFilter("");
    setStrategyFilter("");
    setDirectionFilter("ALL");
    setTagContains("");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Trades</h1>
          <p className="text-sm text-muted-foreground">
            Workspace: {activeWorkspaceId === "local" ? "Local (offline)" : "Cloud"}
          </p>
        </div>

        <Button onClick={() => setAddOpen(true)}>Add trade</Button>
      </div>

      <div className="rounded-xl border p-4 space-y-4">
        <div className="text-sm font-medium">Filters</div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Instrument</div>
            <Input
              value={instrumentFilter}
              onChange={(e) => setInstrumentFilter(e.target.value)}
              placeholder="EURUSD / XAUUSD..."
            />
          </div>

          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Strategy</div>
            <Input
              value={strategyFilter}
              onChange={(e) => setStrategyFilter(e.target.value)}
              placeholder="NY Breakout..."
            />
          </div>

          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Direction</div>
            <Select value={directionFilter} onValueChange={(v) => setDirectionFilter(v as any)}>
              <SelectTrigger>
                <SelectValue placeholder="ALL" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">ALL</SelectItem>
                <SelectItem value="BUY">BUY</SelectItem>
                <SelectItem value="SELL">SELL</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Tag contains</div>
            <Input
              value={tagContains}
              onChange={(e) => setTagContains(e.target.value)}
              placeholder="breakout..."
            />
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="text-sm text-muted-foreground">
            Showing <span className="font-medium text-foreground">{filtered.length}</span> of{" "}
            <span className="font-medium text-foreground">{(trades ?? []).length}</span> trades
          </div>

          <Button variant="secondary" onClick={clearFilters}>
            Clear filters
          </Button>
        </div>
      </div>

      <div className="rounded-xl border">
        <div className="p-4 text-sm font-medium">Trade list</div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Close time</TableHead>
              <TableHead>Instrument</TableHead>
              <TableHead>Strategy</TableHead>
              <TableHead>Dir</TableHead>
              <TableHead className="text-right">Entry</TableHead>
              <TableHead className="text-right">Exit</TableHead>
              <TableHead className="text-right">Pips</TableHead>
              <TableHead className="text-right">R</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {filtered.map((t: Trade) => (
              <TableRow key={t.id}>
                <TableCell>{formatDate(t.closeTime)}</TableCell>
                <TableCell className="font-medium">{t.instrument}</TableCell>
                <TableCell>
                  {t.strategy ? <Badge variant="secondary">{t.strategy}</Badge> : null}
                </TableCell>
                <TableCell>
                  <Badge variant={t.direction === "BUY" ? "default" : "outline"}>
                    {t.direction}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">{num(t.entryPrice).toFixed(2)}</TableCell>
                <TableCell className="text-right">{num(t.exitPrice).toFixed(2)}</TableCell>
                <TableCell className="text-right">{t.pips ?? "-"}</TableCell>
                <TableCell className="text-right">{t.rMultiple ?? "-"}</TableCell>
                <TableCell className="text-right">
                  <TradeActions trade={t} />
                </TableCell>
              </TableRow>
            ))}

            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-sm text-muted-foreground py-10">
                  No trades found for this workspace / filters.
                </TableCell>
              </TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>

      <TradeFormDialog open={addOpen} onOpenChange={setAddOpen} />
    </div>
  );
}

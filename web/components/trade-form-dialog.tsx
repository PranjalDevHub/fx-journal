"use client";

import React, { useEffect, useMemo, useState } from "react";
import { db, type Trade } from "@/lib/db";
import { useWorkspace } from "@/components/workspace-provider";

// IMPORTANT: bring back your searchable dropdown + favorites star
import * as InstrumentSelectMod from "@/components/instrument-select";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trade?: Trade; // edit if provided
};

function isoNow() {
  return new Date().toISOString();
}

// Convert ISO -> datetime-local input value
function toLocalInput(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    d.getFullYear() +
    "-" +
    pad(d.getMonth() + 1) +
    "-" +
    pad(d.getDate()) +
    "T" +
    pad(d.getHours()) +
    ":" +
    pad(d.getMinutes())
  );
}

// Convert datetime-local input -> ISO UTC
function fromLocalInput(v: string) {
  if (!v) return isoNow();
  return new Date(v).toISOString();
}

function parseTags(text: string): string[] {
  const parts = text
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
  return Array.from(new Set(parts));
}

/**
 * Minimal trade-math used in this dialog.
 * Your project also has /lib/trade-math.ts, but because exports may differ,
 * this stays self-contained and keeps the XAUUSD fix behavior.
 */
const FIAT = new Set([
  "USD","EUR","GBP","JPY","CHF","CAD","AUD","NZD","SEK","NOK","DKK","SGD","HKD","MXN","ZAR","TRY","PLN","HUF","CZK",
]);

function isFXPair(symbol: string) {
  const s = symbol.toUpperCase().trim();
  if (s.length !== 6) return false;
  const base = s.slice(0, 3);
  const quote = s.slice(3, 6);
  return FIAT.has(base) && FIAT.has(quote);
}

function pipSize(instrument: string) {
  const s = instrument.toUpperCase().trim();

  // Metals FIRST (prevents XAUUSD misclassification)
  if (s === "XAUUSD") return 0.1;
  if (s === "XAGUSD") return 0.01;

  if (isFXPair(s)) {
    const quote = s.slice(3, 6);
    return quote === "JPY" ? 0.01 : 0.0001;
  }

  return 0.0001;
}

function computePipsAndR(input: {
  instrument: string;
  direction: "BUY" | "SELL";
  entryPrice: number;
  exitPrice: number;
  stopLoss?: number;
}) {
  const ps = pipSize(input.instrument);

  const profitMove =
    input.direction === "BUY"
      ? input.exitPrice - input.entryPrice
      : input.entryPrice - input.exitPrice;

  const pips = profitMove / ps;

  let rMultiple: number | undefined = undefined;
  if (input.stopLoss !== undefined && input.stopLoss !== null && Number.isFinite(input.stopLoss)) {
    const riskMove = Math.abs(input.entryPrice - input.stopLoss);
    if (riskMove > 0) rMultiple = profitMove / riskMove;
  }

  const round2 = (x: number) => Math.round(x * 100) / 100;

  return {
    pips: Number.isFinite(pips) ? round2(pips) : undefined,
    rMultiple: rMultiple !== undefined && Number.isFinite(rMultiple) ? round2(rMultiple) : undefined,
  };
}

export function TradeFormDialog({ open, onOpenChange, trade }: Props) {
  const { activeWorkspaceId } = useWorkspace();
  const isEdit = !!trade;

  // Handle both named and default export for InstrumentSelect
  const InstrumentSelectAny: any =
    (InstrumentSelectMod as any).InstrumentSelect ?? (InstrumentSelectMod as any).default;

  const initial = useMemo(() => {
    return {
      instrument: trade?.instrument ?? "",
      strategy: trade?.strategy ?? "",
      direction: (trade?.direction ?? "BUY") as "BUY" | "SELL",
      openTime: toLocalInput(trade?.openTime ?? isoNow()),
      closeTime: toLocalInput(trade?.closeTime ?? isoNow()),
      entryPrice: trade?.entryPrice ?? 0,
      exitPrice: trade?.exitPrice ?? 0,
      stopLoss: trade?.stopLoss ?? undefined,
      takeProfit: trade?.takeProfit ?? undefined,
      tagsText: (trade?.tags ?? []).join(", "),
      notes: trade?.notes ?? "",
    };
  }, [trade]);

  const [instrument, setInstrument] = useState(initial.instrument);
  const [strategy, setStrategy] = useState(initial.strategy);
  const [direction, setDirection] = useState<"BUY" | "SELL">(initial.direction);
  const [openTime, setOpenTime] = useState(initial.openTime);
  const [closeTime, setCloseTime] = useState(initial.closeTime);
  const [entryPrice, setEntryPrice] = useState<number>(initial.entryPrice);
  const [exitPrice, setExitPrice] = useState<number>(initial.exitPrice);
  const [stopLoss, setStopLoss] = useState<number | undefined>(initial.stopLoss);
  const [takeProfit, setTakeProfit] = useState<number | undefined>(initial.takeProfit);
  const [tagsText, setTagsText] = useState(initial.tagsText);
  const [notes, setNotes] = useState(initial.notes);

  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setInstrument(initial.instrument);
    setStrategy(initial.strategy);
    setDirection(initial.direction);
    setOpenTime(initial.openTime);
    setCloseTime(initial.closeTime);
    setEntryPrice(initial.entryPrice);
    setExitPrice(initial.exitPrice);
    setStopLoss(initial.stopLoss);
    setTakeProfit(initial.takeProfit);
    setTagsText(initial.tagsText);
    setNotes(initial.notes);
    setErr(null);
  }, [open, initial]);

  async function onSave() {
    setSaving(true);
    setErr(null);

    try {
      const id = trade?.id ?? crypto.randomUUID();
      const createdAt = trade?.createdAt ?? isoNow();
      const updatedAt = isoNow();

      // NEW: workspace-aware save
      const wsId = trade?.workspaceId ?? activeWorkspaceId;

      const cleanInstrument = instrument.trim().toUpperCase();
      if (!cleanInstrument) {
        setErr("Instrument is required.");
        setSaving(false);
        return;
      }

      const { pips, rMultiple } = computePipsAndR({
        instrument: cleanInstrument,
        direction,
        entryPrice: Number(entryPrice),
        exitPrice: Number(exitPrice),
        stopLoss,
      });

      const toSave: Trade = {
        id,
        workspaceId: wsId,

        instrument: cleanInstrument,
        strategy: strategy.trim() ? strategy.trim() : undefined,
        direction,

        openTime: fromLocalInput(openTime),
        closeTime: fromLocalInput(closeTime),

        entryPrice: Number(entryPrice),
        exitPrice: Number(exitPrice),
        stopLoss: stopLoss === undefined ? undefined : Number(stopLoss),
        takeProfit: takeProfit === undefined ? undefined : Number(takeProfit),

        tags: parseTags(tagsText),
        notes: notes.trim() ? notes.trim() : undefined,

        pips,
        rMultiple,

        createdAt,
        updatedAt,

        // NEW: soft delete field (keep as null unless deleted)
        deletedAt: trade?.deletedAt ?? null,
      };

      await db.trades.put(toSave);
      onOpenChange(false);
    } catch (e: any) {
      console.warn(e);
      setErr(e?.message ?? "Failed to save trade.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit trade" : "Add trade"}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Instrument</div>

            {/* Bring back your dropdown+favorites.
                If for some reason the import fails, we fall back to an Input so the app doesn't crash. */}
            {InstrumentSelectAny ? (
              <InstrumentSelectAny
                value={instrument}
                onValueChange={(v: string) => setInstrument(v)}
                onChange={(v: string) => setInstrument(v)}
                onSelect={(v: string) => setInstrument(v)}
              />
            ) : (
              <Input
                value={instrument}
                onChange={(e) => setInstrument(e.target.value)}
                placeholder="XAUUSD"
              />
            )}
          </div>

          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Strategy</div>
            <Input
              value={strategy}
              onChange={(e) => setStrategy(e.target.value)}
              placeholder="NY Breakout"
            />
          </div>

          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Direction</div>
            <Select value={direction} onValueChange={(v) => setDirection(v as any)}>
              <SelectTrigger>
                <SelectValue placeholder="BUY" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="BUY">BUY</SelectItem>
                <SelectItem value="SELL">SELL</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Open time</div>
            <Input
              type="datetime-local"
              value={openTime}
              onChange={(e) => setOpenTime(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Close time</div>
            <Input
              type="datetime-local"
              value={closeTime}
              onChange={(e) => setCloseTime(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Entry price</div>
            <Input
              type="number"
              value={entryPrice}
              onChange={(e) => setEntryPrice(Number(e.target.value))}
            />
          </div>

          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Exit price</div>
            <Input
              type="number"
              value={exitPrice}
              onChange={(e) => setExitPrice(Number(e.target.value))}
            />
          </div>

          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Stop loss</div>
            <Input
              type="number"
              value={stopLoss ?? ""}
              onChange={(e) =>
                setStopLoss(e.target.value === "" ? undefined : Number(e.target.value))
              }
            />
          </div>

          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Take profit</div>
            <Input
              type="number"
              value={takeProfit ?? ""}
              onChange={(e) =>
                setTakeProfit(e.target.value === "" ? undefined : Number(e.target.value))
              }
            />
          </div>

          <div className="space-y-1 md:col-span-2">
            <div className="text-xs text-muted-foreground">Tags (comma separated)</div>
            <Input
              value={tagsText}
              onChange={(e) => setTagsText(e.target.value)}
              placeholder="breakout, london"
            />
          </div>

          <div className="space-y-1 md:col-span-2">
            <div className="text-xs text-muted-foreground">Notes</div>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="What happened?"
            />
          </div>
        </div>

        {err ? <div className="text-sm text-red-600">{err}</div> : null}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={() => void onSave()} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
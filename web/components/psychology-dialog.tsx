"use client";

import React, { useEffect, useMemo, useState } from "react";
import type { PsychSnapshot, Trade } from "@/lib/db";
import { db } from "@/lib/db";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";

type Phase = "BEFORE" | "DURING" | "AFTER";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trade: Trade;
};

function isoNow() {
  return new Date().toISOString();
}

type FormState = {
  confidence: number;
  stress: number;
  fomo: number;
  revenge: number;
  discipline: number;
  note: string;
};

const defaultState: FormState = {
  confidence: 2,
  stress: 2,
  fomo: 2,
  revenge: 0,
  discipline: 2,
  note: "",
};

async function loadSnapshot(tradeId: string, phase: Phase) {
  // Using the compound index [tradeId+phase]
  const row = await db.psychSnapshots.where("[tradeId+phase]").equals([tradeId, phase]).first();
  return row ?? null;
}

function sliderRow(
  label: string,
  value: number,
  setValue: (v: number) => void
) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <div>{label}</div>
        <div className="text-muted-foreground">{value}</div>
      </div>
      <Slider
        value={[value]}
        min={0}
        max={4}
        step={1}
        onValueChange={(v) => setValue(v[0] ?? 0)}
      />
    </div>
  );
}

export function PsychologyDialog({ open, onOpenChange, trade }: Props) {
  const phases: Phase[] = useMemo(() => ["BEFORE", "DURING", "AFTER"], []);

  const [phase, setPhase] = useState<Phase>("BEFORE");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [snapshotId, setSnapshotId] = useState<string | null>(null);
  const [state, setState] = useState<FormState>(defaultState);

  useEffect(() => {
    if (!open) return;

    setPhase("BEFORE");
    setSnapshotId(null);
    setState(defaultState);
  }, [open]);

  useEffect(() => {
    if (!open) return;

    (async () => {
      setLoading(true);
      const row = await loadSnapshot(trade.id, phase);

      if (row) {
        setSnapshotId(row.id);
        setState({
          confidence: row.confidence,
          stress: row.stress,
          fomo: row.fomo,
          revenge: row.revenge,
          discipline: row.discipline,
          note: row.note ?? "",
        });
      } else {
        setSnapshotId(null);
        setState(defaultState);
      }

      setLoading(false);
    })();
  }, [open, trade.id, phase]);

  async function save() {
    setSaving(true);

    try {
      const id = snapshotId ?? crypto.randomUUID();
      const stamp = isoNow();

      const existing = snapshotId
        ? await db.psychSnapshots.get(id)
        : null;

      const toSave: PsychSnapshot = {
        id,
        workspaceId: trade.workspaceId, // IMPORTANT: same workspace as trade
        tradeId: trade.id,
        phase,

        confidence: state.confidence,
        stress: state.stress,
        fomo: state.fomo,
        revenge: state.revenge,
        discipline: state.discipline,

        note: state.note.trim() ? state.note.trim() : undefined,

        createdAt: existing?.createdAt ?? stamp,
        updatedAt: stamp,
        deletedAt: existing?.deletedAt ?? null,
      };

      await db.psychSnapshots.put(toSave);
      setSnapshotId(id);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Psychology — {trade.instrument}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-wrap gap-2">
          {phases.map((p) => (
            <Button
              key={p}
              variant={phase === p ? "default" : "outline"}
              size="sm"
              onClick={() => setPhase(p)}
              disabled={loading || saving}
            >
              {p}
            </Button>
          ))}
        </div>

        <Separator />

        <div className="space-y-4">
          {sliderRow("Confidence", state.confidence, (v) => setState((s) => ({ ...s, confidence: v })))}
          {sliderRow("Stress", state.stress, (v) => setState((s) => ({ ...s, stress: v })))}
          {sliderRow("FOMO", state.fomo, (v) => setState((s) => ({ ...s, fomo: v })))}
          {sliderRow("Revenge", state.revenge, (v) => setState((s) => ({ ...s, revenge: v })))}
          {sliderRow("Discipline", state.discipline, (v) => setState((s) => ({ ...s, discipline: v })))}

          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">Note</div>
            <Textarea
              value={state.note}
              onChange={(e) => setState((s) => ({ ...s, note: e.target.value }))}
              placeholder="What were you feeling?"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={() => void save()} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
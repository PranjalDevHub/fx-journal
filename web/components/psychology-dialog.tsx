"use client"

import { useEffect, useMemo, useState } from "react"
import { useLiveQuery } from "dexie-react-hooks"
import { db, type PsychPhase, type PsychSnapshot, type Trade } from "@/lib/db"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Slider } from "@/components/ui/slider"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"

function defaultSnap(tradeId: string, phase: PsychPhase): PsychSnapshot {
  const now = new Date().toISOString()
  return {
    id: crypto.randomUUID(),
    tradeId,
    phase,
    confidence: 2,
    stress: 2,
    fomo: 0,
    revenge: 0,
    discipline: 2,
    note: "",
    createdAt: now,
    updatedAt: now,
  }
}

function SliderRow(props: {
  label: string
  value: number
  onChange: (v: number) => void
  hint?: string
}) {
  const { label, value, onChange, hint } = props
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        <div className="text-sm text-muted-foreground">{value}</div>
      </div>
      <Slider
        value={[value]}
        min={0}
        max={4}
        step={1}
        onValueChange={(arr) => onChange(arr[0] ?? 0)}
      />
      {hint ? <div className="text-xs text-muted-foreground">{hint}</div> : null}
    </div>
  )
}

export function PsychologyDialog(props: {
  trade: Trade
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { trade, open, onOpenChange } = props
  const tradeId = trade.id

  const snaps = useLiveQuery(
    () => db.psychSnapshots.where("tradeId").equals(tradeId).toArray(),
    [tradeId]
  )

  const snapMap = useMemo(() => {
    const m = new Map<PsychPhase, PsychSnapshot>()
    for (const s of snaps ?? []) m.set(s.phase, s)
    return m
  }, [snaps])

  const [activeTab, setActiveTab] = useState<PsychPhase>("BEFORE")

  const [before, setBefore] = useState<PsychSnapshot>(() => defaultSnap(tradeId, "BEFORE"))
  const [during, setDuring] = useState<PsychSnapshot>(() => defaultSnap(tradeId, "DURING"))
  const [after, setAfter] = useState<PsychSnapshot>(() => defaultSnap(tradeId, "AFTER"))

  const [saving, setSaving] = useState(false)

  // Load existing snapshots into state when dialog opens
  useEffect(() => {
    if (!open) return
    setActiveTab("BEFORE")

    const b = snapMap.get("BEFORE") ?? defaultSnap(tradeId, "BEFORE")
    const d = snapMap.get("DURING") ?? defaultSnap(tradeId, "DURING")
    const a = snapMap.get("AFTER") ?? defaultSnap(tradeId, "AFTER")

    setBefore(b)
    setDuring(d)
    setAfter(a)
  }, [open, snapMap, tradeId])

  async function saveAll() {
    setSaving(true)
    try {
      const now = new Date().toISOString()

      const b: PsychSnapshot = { ...before, updatedAt: now, note: before.note?.trim() || "" }
      const d: PsychSnapshot = { ...during, updatedAt: now, note: during.note?.trim() || "" }
      const a: PsychSnapshot = { ...after, updatedAt: now, note: after.note?.trim() || "" }

      // upsert by primary key (id)
      await db.psychSnapshots.put(b)
      await db.psychSnapshots.put(d)
      await db.psychSnapshots.put(a)

      onOpenChange(false)
    } finally {
      setSaving(false)
    }
  }

  const headerSubtitle = `${trade.instrument} • ${trade.direction} • ${typeof trade.rMultiple === "number" ? `${trade.rMultiple}R` : "R —"}`

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Psychology</DialogTitle>
          <div className="text-sm text-muted-foreground">{headerSubtitle}</div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as PsychPhase)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="BEFORE">Before</TabsTrigger>
            <TabsTrigger value="DURING">During</TabsTrigger>
            <TabsTrigger value="AFTER">After</TabsTrigger>
          </TabsList>

          <TabsContent value="BEFORE" className="mt-4 space-y-4">
            <SliderRow
              label="Confidence"
              value={before.confidence}
              onChange={(v) => setBefore((s) => ({ ...s, confidence: v }))}
              hint="0 = no confidence, 4 = very confident"
            />
            <SliderRow
              label="FOMO"
              value={before.fomo}
              onChange={(v) => setBefore((s) => ({ ...s, fomo: v }))}
              hint="0 = calm/neutral, 4 = very strong urge to chase"
            />
            <SliderRow
              label="Revenge"
              value={before.revenge}
              onChange={(v) => setBefore((s) => ({ ...s, revenge: v }))}
              hint="0 = none, 4 = trading to get money back"
            />
            <SliderRow
              label="Discipline"
              value={before.discipline}
              onChange={(v) => setBefore((s) => ({ ...s, discipline: v }))}
              hint="0 = impulsive, 4 = followed plan"
            />
            <div className="space-y-2">
              <Label>Note</Label>
              <Textarea
                value={before.note ?? ""}
                onChange={(e) => setBefore((s) => ({ ...s, note: e.target.value }))}
                placeholder="What was your mindset before entering?"
              />
            </div>
          </TabsContent>

          <TabsContent value="DURING" className="mt-4 space-y-4">
            <SliderRow
              label="Stress"
              value={during.stress}
              onChange={(v) => setDuring((s) => ({ ...s, stress: v }))}
              hint="0 = relaxed, 4 = highly stressed"
            />
            <SliderRow
              label="FOMO"
              value={during.fomo}
              onChange={(v) => setDuring((s) => ({ ...s, fomo: v }))}
            />
            <SliderRow
              label="Revenge"
              value={during.revenge}
              onChange={(v) => setDuring((s) => ({ ...s, revenge: v }))}
            />
            <SliderRow
              label="Discipline"
              value={during.discipline}
              onChange={(v) => setDuring((s) => ({ ...s, discipline: v }))}
            />
            <div className="space-y-2">
              <Label>Note</Label>
              <Textarea
                value={during.note ?? ""}
                onChange={(e) => setDuring((s) => ({ ...s, note: e.target.value }))}
                placeholder="Did you feel tempted to interfere? Move SL? Close early?"
              />
            </div>
          </TabsContent>

          <TabsContent value="AFTER" className="mt-4 space-y-4">
            <SliderRow
              label="Discipline"
              value={after.discipline}
              onChange={(v) => setAfter((s) => ({ ...s, discipline: v }))}
            />
            <SliderRow
              label="Stress"
              value={after.stress}
              onChange={(v) => setAfter((s) => ({ ...s, stress: v }))}
            />
            <div className="space-y-2">
              <Label>Reflection</Label>
              <Textarea
                value={after.note ?? ""}
                onChange={(e) => setAfter((s) => ({ ...s, note: e.target.value }))}
                placeholder="What went well? What would you do differently?"
              />
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button onClick={saveAll} disabled={saving}>
            {saving ? "Saving..." : "Save psychology"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
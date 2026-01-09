"use client"

import { useEffect, useMemo, useState } from "react"
import { db, type Trade, type TradeDirection } from "@/lib/db"
import { calcPips, calcPoints, calcRMultiple, getInstrumentSizes } from "@/lib/trade-math"
import { InstrumentSelect } from "@/components/instrument-select"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type Mode = "add" | "edit"

function nowLocalDatetimeValue() {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, "0")
  const yyyy = d.getFullYear()
  const mm = pad(d.getMonth() + 1)
  const dd = pad(d.getDate())
  const hh = pad(d.getHours())
  const min = pad(d.getMinutes())
  return `${yyyy}-${mm}-${dd}T${hh}:${min}`
}

function toIsoFromDatetimeLocal(value: string) {
  const d = new Date(value)
  return d.toISOString()
}

function toDatetimeLocalFromIso(iso: string) {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, "0")
  const yyyy = d.getFullYear()
  const mm = pad(d.getMonth() + 1)
  const dd = pad(d.getDate())
  const hh = pad(d.getHours())
  const min = pad(d.getMinutes())
  return `${yyyy}-${mm}-${dd}T${hh}:${min}`
}

export function TradeFormDialog(props: {
  mode: Mode
  open: boolean
  onOpenChange: (open: boolean) => void
  trade?: Trade
}) {
  const { mode, open, onOpenChange, trade } = props

  const [instrument, setInstrument] = useState("EURUSD")
  const [strategy, setStrategy] = useState("")
  const [direction, setDirection] = useState<TradeDirection>("BUY")
  const [openTime, setOpenTime] = useState(nowLocalDatetimeValue())
  const [closeTime, setCloseTime] = useState(nowLocalDatetimeValue())
  const [entryPrice, setEntryPrice] = useState("")
  const [exitPrice, setExitPrice] = useState("")
  const [stopLoss, setStopLoss] = useState("")
  const [takeProfit, setTakeProfit] = useState("")
  const [tags, setTags] = useState("")
  const [notes, setNotes] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setError(null)

    if (mode === "edit") {
      if (!trade) {
        setError("Missing trade to edit.")
        return
      }

      setInstrument(trade.instrument)
      setStrategy(trade.strategy ?? "")
      setDirection(trade.direction)
      setOpenTime(toDatetimeLocalFromIso(trade.openTime))
      setCloseTime(toDatetimeLocalFromIso(trade.closeTime))
      setEntryPrice(String(trade.entryPrice))
      setExitPrice(String(trade.exitPrice))
      setStopLoss(trade.stopLoss !== undefined ? String(trade.stopLoss) : "")
      setTakeProfit(trade.takeProfit !== undefined ? String(trade.takeProfit) : "")
      setTags((trade.tags ?? []).join(", "))
      setNotes(trade.notes ?? "")
    } else {
      setInstrument("EURUSD")
      setStrategy("")
      setDirection("BUY")
      setOpenTime(nowLocalDatetimeValue())
      setCloseTime(nowLocalDatetimeValue())
      setEntryPrice("")
      setExitPrice("")
      setStopLoss("")
      setTakeProfit("")
      setTags("")
      setNotes("")
    }
  }, [open, mode, trade])

  const preview = useMemo(() => {
    const entry = Number(entryPrice)
    const exit = Number(exitPrice)
    if (!Number.isFinite(entry) || !Number.isFinite(exit)) return null

    const inst = instrument.trim().toUpperCase()
    const sizes = getInstrumentSizes(inst)

    const pips = calcPips({ instrument: inst, direction, entry, exit })

    const points =
      sizes.kind === "METAL"
        ? calcPoints({ instrument: inst, direction, entry, exit })
        : null

    const slNum = stopLoss ? Number(stopLoss) : undefined
    const r = calcRMultiple({
      direction,
      entry,
      exit,
      stopLoss: stopLoss ? Number(stopLoss) : undefined,
    })

    let slWarning: string | null = null
    if (slNum !== undefined && Number.isFinite(slNum)) {
      if (direction === "BUY" && slNum >= entry) {
        slWarning = "For BUY, Stop Loss should be below Entry."
      }
      if (direction === "SELL" && slNum <= entry) {
        slWarning = "For SELL, Stop Loss should be above Entry."
      }
    }

    return { pips, points, r, slWarning, sizes }
  }, [instrument, direction, entryPrice, exitPrice, stopLoss])

  async function handleSave() {
    setError(null)

    const entry = Number(entryPrice)
    const exit = Number(exitPrice)
    const sl = stopLoss ? Number(stopLoss) : undefined
    const tp = takeProfit ? Number(takeProfit) : undefined

    if (!instrument.trim()) return setError("Instrument is required.")
    if (!Number.isFinite(entry) || !Number.isFinite(exit)) {
      return setError("Entry and Exit must be valid numbers.")
    }
    if (sl !== undefined && !Number.isFinite(sl)) return setError("Stop Loss must be a valid number.")
    if (tp !== undefined && !Number.isFinite(tp)) return setError("Take Profit must be a valid number.")

    setSaving(true)
    try {
      const nowIso = new Date().toISOString()
      const instrumentClean = instrument.trim().toUpperCase()
      const strategyClean = strategy.trim()

      const pips = calcPips({ instrument: instrumentClean, direction, entry, exit })
      const rMultiple = calcRMultiple({ direction, entry, exit, stopLoss: sl })

      const common = {
        instrument: instrumentClean,
        strategy: strategyClean ? strategyClean : undefined,
        direction,
        openTime: toIsoFromDatetimeLocal(openTime),
        closeTime: toIsoFromDatetimeLocal(closeTime),
        entryPrice: entry,
        exitPrice: exit,
        stopLoss: sl,
        takeProfit: tp,
        tags: tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        notes: notes.trim() || undefined,
        pips,
        rMultiple,
        updatedAt: nowIso,
      } as const

      if (mode === "add") {
        const id = crypto.randomUUID()
        const newTrade: Trade = { id, ...common, createdAt: nowIso }
        await db.trades.add(newTrade)
      } else {
        if (!trade) throw new Error("Missing trade in edit mode.")
        const updatedTrade: Trade = { ...trade, ...common }
        await db.trades.put(updatedTrade)
      }

      onOpenChange(false)
    } catch (e) {
      console.error(e)
      setError("Could not save trade. Check console for details.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{mode === "add" ? "Add trade" : "Edit trade"}</DialogTitle>
          <DialogDescription>
            Log quickly. You can refine later.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Instrument</Label>
            <InstrumentSelect value={instrument} onChange={setInstrument} />
          </div>

          <div className="space-y-2">
            <Label>Strategy (optional)</Label>
            <Input value={strategy} onChange={(e) => setStrategy(e.target.value)} placeholder="NY Breakout" />
          </div>

          <div className="space-y-2">
            <Label>Direction</Label>
            <Select value={direction} onValueChange={(v) => setDirection(v as TradeDirection)}>
              <SelectTrigger><SelectValue placeholder="Select direction" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="BUY">BUY</SelectItem>
                <SelectItem value="SELL">SELL</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Open time</Label>
            <Input type="datetime-local" value={openTime} onChange={(e) => setOpenTime(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Close time</Label>
            <Input type="datetime-local" value={closeTime} onChange={(e) => setCloseTime(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Entry</Label>
            <Input value={entryPrice} onChange={(e) => setEntryPrice(e.target.value)} placeholder="e.g., 1.08750 / 4007.75" />
          </div>

          <div className="space-y-2">
            <Label>Exit</Label>
            <Input value={exitPrice} onChange={(e) => setExitPrice(e.target.value)} placeholder="e.g., 1.08910 / 4006.77" />
          </div>

          <div className="space-y-2">
            <Label>Stop loss (optional)</Label>
            <Input value={stopLoss} onChange={(e) => setStopLoss(e.target.value)} placeholder="..." />
          </div>

          <div className="space-y-2">
            <Label>Take profit (optional)</Label>
            <Input value={takeProfit} onChange={(e) => setTakeProfit(e.target.value)} placeholder="..." />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label>Tags (comma separated)</Label>
            <Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="london, breakout, A+ setup" />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="What happened? What to improve?" />
          </div>
        </div>

        <div className="text-sm text-muted-foreground">
          Preview:{" "}
          {preview ? (
            <span className="font-medium text-foreground">
              {preview.pips} pips
              {preview.points !== null ? ` (${preview.points} points)` : ""}
              {preview.r !== undefined ? ` • ${preview.r}R` : ""}
            </span>
          ) : (
            <span>Enter Entry + Exit to see pips.</span>
          )}
        </div>

        {preview?.slWarning ? (
          <div className="text-sm text-amber-600">{preview.slWarning}</div>
        ) : null}

        {error ? <div className="text-sm text-red-600">{error}</div> : null}

        <DialogFooter>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
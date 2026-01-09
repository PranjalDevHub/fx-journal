"use client"

import { useEffect, useMemo, useState } from "react"
import { db, type Trade, type TradeDirection } from "@/lib/db"
import { calcPips, calcRMultiple } from "@/lib/trade-math"

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
  // Treat input as local time, store ISO UTC
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
  trade?: Trade // required for edit
}) {
  const { mode, open, onOpenChange, trade } = props

  const [instrument, setInstrument] = useState("EURUSD")
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

  // When dialog opens, preload values for edit, or reset for add
  useEffect(() => {
    if (!open) return
    setError(null)

    if (mode === "edit") {
      if (!trade) {
        setError("Missing trade to edit.")
        return
      }

      setInstrument(trade.instrument)
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
      // add mode reset
      setInstrument("EURUSD")
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
    const pips = calcPips({ instrument, direction, entry, exit })
    const r = calcRMultiple({
      direction,
      entry,
      exit,
      stopLoss: stopLoss ? Number(stopLoss) : undefined,
    })
    return { pips, r }
  }, [instrument, direction, entryPrice, exitPrice, stopLoss])

  async function handleSave() {
    setError(null)

    const entry = Number(entryPrice)
    const exit = Number(exitPrice)
    const sl = stopLoss ? Number(stopLoss) : undefined
    const tp = takeProfit ? Number(takeProfit) : undefined

    if (!instrument.trim()) return setError("Instrument is required (e.g., EURUSD).")
    if (!Number.isFinite(entry) || !Number.isFinite(exit)) {
      return setError("Entry and Exit must be valid numbers.")
    }

    // optional extra safety
    if (sl !== undefined && !Number.isFinite(sl)) return setError("Stop Loss must be a valid number.")
    if (tp !== undefined && !Number.isFinite(tp)) return setError("Take Profit must be a valid number.")

    setSaving(true)
    try {
      const nowIso = new Date().toISOString()
      const instrumentClean = instrument.trim().toUpperCase()

      const pips = calcPips({ instrument: instrumentClean, direction, entry, exit })
      const rMultiple = calcRMultiple({ direction, entry, exit, stopLoss: sl })

      if (mode === "add") {
        const id = crypto.randomUUID()

        const newTrade: Trade = {
          id,
          instrument: instrumentClean,
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
          createdAt: nowIso,
          updatedAt: nowIso,
        }

        await db.trades.add(newTrade)
      } else {
        if (!trade) throw new Error("Missing trade in edit mode.")

        const updatedTrade: Trade = {
          ...trade,
          instrument: instrumentClean,
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
        }

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
            {mode === "add"
              ? "Log quickly. You can refine later."
              : "Fix details to keep analytics accurate."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Instrument</Label>
            <Input
              value={instrument}
              onChange={(e) => setInstrument(e.target.value)}
              placeholder="EURUSD"
            />
          </div>

          <div className="space-y-2">
            <Label>Direction</Label>
            <Select value={direction} onValueChange={(v) => setDirection(v as TradeDirection)}>
              <SelectTrigger>
                <SelectValue placeholder="Select direction" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="BUY">BUY</SelectItem>
                <SelectItem value="SELL">SELL</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Open time</Label>
            <Input
              type="datetime-local"
              value={openTime}
              onChange={(e) => setOpenTime(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Close time</Label>
            <Input
              type="datetime-local"
              value={closeTime}
              onChange={(e) => setCloseTime(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Entry</Label>
            <Input
              value={entryPrice}
              onChange={(e) => setEntryPrice(e.target.value)}
              placeholder="1.08750"
            />
          </div>

          <div className="space-y-2">
            <Label>Exit</Label>
            <Input
              value={exitPrice}
              onChange={(e) => setExitPrice(e.target.value)}
              placeholder="1.08910"
            />
          </div>

          <div className="space-y-2">
            <Label>Stop loss (optional)</Label>
            <Input
              value={stopLoss}
              onChange={(e) => setStopLoss(e.target.value)}
              placeholder="1.08650"
            />
          </div>

          <div className="space-y-2">
            <Label>Take profit (optional)</Label>
            <Input
              value={takeProfit}
              onChange={(e) => setTakeProfit(e.target.value)}
              placeholder="1.09050"
            />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label>Tags (comma separated)</Label>
            <Input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="london, breakout, A+ setup"
            />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label>Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="What happened? What did you do well? What to improve?"
            />
          </div>
        </div>

        <div className="text-sm text-muted-foreground">
          Preview:{" "}
          {preview ? (
            <span className="font-medium text-foreground">
              {preview.pips} pips{preview.r !== undefined ? ` • ${preview.r}R` : ""}
            </span>
          ) : (
            <span>Enter Entry + Exit to see pips.</span>
          )}
        </div>

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
"use client"

import { useMemo, useState } from "react"
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
  DialogTrigger,
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

function nowLocalDatetimeValue() {
  // returns YYYY-MM-DDTHH:mm for datetime-local input
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
  // value like 2026-01-09T12:30
  // new Date(value) treats it as local time; we store ISO in UTC
  const d = new Date(value)
  return d.toISOString()
}

export function AddTradeDialog({ onAdded }: { onAdded?: () => void }) {
  const [open, setOpen] = useState(false)

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

    setSaving(true)
    try {
      const id = crypto.randomUUID()
      const createdAt = new Date().toISOString()
      const updatedAt = createdAt

      const pips = calcPips({ instrument, direction, entry, exit })
      const rMultiple = calcRMultiple({ direction, entry, exit, stopLoss: sl })

      const trade: Trade = {
        id,
        instrument: instrument.trim().toUpperCase(),
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
        createdAt,
        updatedAt,
      }

      await db.trades.add(trade)

      setOpen(false)
      onAdded?.()
    } catch (e) {
      console.error(e)
      setError("Could not save trade. Check console for details.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Add trade</Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Add trade</DialogTitle>
          <DialogDescription>
            Quick log now. We’ll make this smarter later (screenshot OCR, strategies, psychology).
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Instrument</Label>
            <Input value={instrument} onChange={(e) => setInstrument(e.target.value)} placeholder="EURUSD" />
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
            <Input type="datetime-local" value={openTime} onChange={(e) => setOpenTime(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Close time</Label>
            <Input type="datetime-local" value={closeTime} onChange={(e) => setCloseTime(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Entry</Label>
            <Input value={entryPrice} onChange={(e) => setEntryPrice(e.target.value)} placeholder="1.08750" />
          </div>

          <div className="space-y-2">
            <Label>Exit</Label>
            <Input value={exitPrice} onChange={(e) => setExitPrice(e.target.value)} placeholder="1.08910" />
          </div>

          <div className="space-y-2">
            <Label>Stop loss (optional)</Label>
            <Input value={stopLoss} onChange={(e) => setStopLoss(e.target.value)} placeholder="1.08650" />
          </div>

          <div className="space-y-2">
            <Label>Take profit (optional)</Label>
            <Input value={takeProfit} onChange={(e) => setTakeProfit(e.target.value)} placeholder="1.09050" />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label>Tags (comma separated)</Label>
            <Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="london, breakout, A+ setup" />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="What happened? What did you do well? What to improve?" />
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
            {saving ? "Saving..." : "Save trade"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
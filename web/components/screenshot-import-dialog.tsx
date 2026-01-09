"use client"

import { useMemo, useState } from "react"
import { db, type Trade, type TradeDirection } from "@/lib/db"
import { preprocessForOcr, runOcr } from "@/lib/ocr"
import { parseMtScreenshotOcr } from "@/lib/mt-screenshot-parser"
import { calcPips, calcRMultiple } from "@/lib/trade-math"

import { InstrumentSelect } from "@/components/instrument-select"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
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
import { Badge } from "@/components/ui/badge"

function nowIso() {
  return new Date().toISOString()
}

function confLabel(v?: number) {
  const x = v ?? 0
  if (x >= 0.85) return <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">High</Badge>
  if (x >= 0.45) return <Badge variant="secondary">Medium</Badge>
  if (x > 0) return <Badge variant="outline">Low</Badge>
  return <Badge variant="outline">—</Badge>
}

export function ScreenshotImportDialog(props: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { open, onOpenChange } = props

  const [file, setFile] = useState<File | null>(null)
  const [imageUrl, setImageUrl] = useState<string | null>(null)

  const [progress, setProgress] = useState<number>(0)
  const [status, setStatus] = useState<string>("")
  const [ocrText, setOcrText] = useState<string>("")
  const [parsingDebug, setParsingDebug] = useState<string>("")

  const [instrument, setInstrument] = useState("EURUSD")
  const [direction, setDirection] = useState<TradeDirection>("BUY")
  const [volumeLots, setVolumeLots] = useState("")
  const [entryPrice, setEntryPrice] = useState("")
  const [exitPrice, setExitPrice] = useState("")
  const [stopLoss, setStopLoss] = useState("")
  const [takeProfit, setTakeProfit] = useState("")
  const [notes, setNotes] = useState("Imported via screenshot OCR.")
  const [error, setError] = useState<string | null>(null)

  const [conf, setConf] = useState<Record<string, number>>({})

  const preview = useMemo(() => {
    const entry = Number(entryPrice)
    const exit = Number(exitPrice)
    if (!Number.isFinite(entry) || !Number.isFinite(exit)) return null

    const pips = calcPips({
      instrument,
      direction,
      entry,
      exit,
      entryRaw: entryPrice,
      exitRaw: exitPrice,
    })

    const r = calcRMultiple({
      direction,
      entry,
      exit,
      stopLoss: stopLoss ? Number(stopLoss) : undefined,
    })

    return { pips, r }
  }, [instrument, direction, entryPrice, exitPrice, stopLoss])

  function resetState() {
    setFile(null)
    setImageUrl(null)
    setProgress(0)
    setStatus("")
    setOcrText("")
    setParsingDebug("")
    setInstrument("EURUSD")
    setDirection("BUY")
    setVolumeLots("")
    setEntryPrice("")
    setExitPrice("")
    setStopLoss("")
    setTakeProfit("")
    setNotes("Imported via screenshot OCR.")
    setError(null)
    setConf({})
  }

  async function onPickFile(f: File | null) {
    setError(null)
    setOcrText("")
    setParsingDebug("")
    setConf({})
    setProgress(0)
    setStatus("")

    setFile(f)
    if (!f) {
      setImageUrl(null)
      return
    }
    const url = URL.createObjectURL(f)
    setImageUrl(url)
  }

  async function handleRunOcr() {
    setError(null)
    if (!file) return setError("Please choose an image first.")

    try {
      setStatus("Preprocessing image…")
      setProgress(0.02)

      const pre = await preprocessForOcr(file)

      setStatus("Running OCR… (first time may download language data)")
      const text = await runOcr(pre, (p) => {
        if (typeof p.progress === "number") setProgress(p.progress)
        if (p.status) setStatus(p.status)
      })

      setOcrText(text)

      setStatus("Parsing text…")
      const parsed = parseMtScreenshotOcr(text)

      setConf(parsed.confidence)
      setParsingDebug(`Rules: ${parsed.debug.usedRules.join(", ") || "—"}`)

      if (parsed.instrument) setInstrument(parsed.instrument)
      if (parsed.direction) setDirection(parsed.direction)
      if (typeof parsed.volumeLots === "number") setVolumeLots(String(parsed.volumeLots))
      if (typeof parsed.entryPrice === "number") setEntryPrice(String(parsed.entryPrice))
      if (typeof parsed.exitPrice === "number") setExitPrice(String(parsed.exitPrice))
      if (typeof parsed.stopLoss === "number") setStopLoss(String(parsed.stopLoss))
      if (typeof parsed.takeProfit === "number") setTakeProfit(String(parsed.takeProfit))

      setStatus("Done")
      setProgress(1)
    } catch (e) {
      console.error(e)
      setError("OCR failed. Try a clearer/cropped screenshot or enter manually.")
      setStatus("")
    }
  }

  async function handleSaveTrade() {
    setError(null)

    const entry = Number(entryPrice)
    const exit = Number(exitPrice)
    const sl = stopLoss ? Number(stopLoss) : undefined
    const tp = takeProfit ? Number(takeProfit) : undefined
    const vol = volumeLots ? Number(volumeLots) : undefined

    if (!instrument.trim()) return setError("Instrument is required.")
    if (!Number.isFinite(entry) || !Number.isFinite(exit)) return setError("Entry and Exit are required and must be numbers.")
    if (sl !== undefined && !Number.isFinite(sl)) return setError("Stop Loss must be a number.")
    if (tp !== undefined && !Number.isFinite(tp)) return setError("Take Profit must be a number.")
    if (vol !== undefined && !Number.isFinite(vol)) return setError("Volume must be a number.")

    const createdAt = nowIso()

    let screenshotId: string | undefined = undefined
    if (file && ocrText) {
      screenshotId = crypto.randomUUID()
      await db.screenshots.add({
        id: screenshotId,
        image: file,
        mimeType: file.type || "image/png",
        ocrText,
        extracted: {
          instrument,
          direction,
          volumeLots: vol,
          entryPrice: entry,
          exitPrice: exit,
          stopLoss: sl,
          takeProfit: tp,
          confidence: conf,
        },
        createdAt,
      })
    }

    const pips = calcPips({
      instrument,
      direction,
      entry,
      exit,
      entryRaw: entryPrice,
      exitRaw: exitPrice,
    })

    const rMultiple = calcRMultiple({ direction, entry, exit, stopLoss: sl })

    const t: Trade = {
      id: crypto.randomUUID(),
      instrument: instrument.trim().toUpperCase(),
      direction,
      openTime: createdAt,
      closeTime: createdAt,
      entryPrice: entry,
      exitPrice: exit,
      stopLoss: sl,
      takeProfit: tp,
      tags: ["ocr"],
      notes: notes.trim() || undefined,
      pips,
      rMultiple,
      screenshotId,
      createdAt,
      updatedAt: createdAt,
      // We don’t store volume in Trade yet (next step) — but it’s saved in screenshot.extracted for now.
      // If you want volume in every trade row, we’ll add Trade.volumeLots in the next change.
    }

    await db.trades.add(t)

    onOpenChange(false)
    resetState()
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v)
        if (!v) resetState()
      }}
    >
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Import from screenshot</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Upload MT4/MT5 screenshot</Label>
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
              />
              <div className="text-xs text-muted-foreground">
                Tip: Crop the screenshot so the trade details text is large and clear.
              </div>
            </div>

            {imageUrl ? (
              <div className="rounded-lg border p-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imageUrl} alt="Screenshot preview" className="max-h-[320px] w-full object-contain" />
              </div>
            ) : (
              <div className="rounded-lg border bg-muted/30 p-6 text-sm text-muted-foreground">
                No image selected.
              </div>
            )}

            <div className="flex items-center gap-3">
              <Button type="button" onClick={handleRunOcr} disabled={!file}>
                Run OCR
              </Button>
              <div className="text-sm text-muted-foreground">
                {status ? `${status} (${Math.round(progress * 100)}%)` : ""}
              </div>
            </div>

            {parsingDebug ? (
              <div className="text-xs text-muted-foreground">{parsingDebug}</div>
            ) : null}
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <div className="flex items-center justify-between">
                  <Label>Instrument</Label>
                  {confLabel(conf.instrument)}
                </div>
                <InstrumentSelect value={instrument} onChange={setInstrument} />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Direction</Label>
                  {confLabel(conf.direction)}
                </div>
                <Select value={direction} onValueChange={(v) => setDirection(v as TradeDirection)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Direction" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BUY">BUY</SelectItem>
                    <SelectItem value="SELL">SELL</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Volume (lots)</Label>
                  {confLabel(conf.volumeLots)}
                </div>
                <Input value={volumeLots} onChange={(e) => setVolumeLots(e.target.value)} placeholder="0.12" />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Entry</Label>
                  {confLabel(conf.entryPrice)}
                </div>
                <Input value={entryPrice} onChange={(e) => setEntryPrice(e.target.value)} placeholder="e.g., 4007.75" />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Exit</Label>
                  {confLabel(conf.exitPrice)}
                </div>
                <Input value={exitPrice} onChange={(e) => setExitPrice(e.target.value)} placeholder="e.g., 4006.77" />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Stop loss</Label>
                  {confLabel(conf.stopLoss)}
                </div>
                <Input value={stopLoss} onChange={(e) => setStopLoss(e.target.value)} placeholder="optional" />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Take profit</Label>
                  {confLabel(conf.takeProfit)}
                </div>
                <Input value={takeProfit} onChange={(e) => setTakeProfit(e.target.value)} placeholder="optional" />
              </div>
            </div>

            <div className="text-sm text-muted-foreground">
              Preview:{" "}
              {preview ? (
                <span className="font-medium text-foreground">
                  {preview.pips} pips{preview.r !== undefined ? ` • ${preview.r}R` : ""}
                </span>
              ) : (
                <span>Enter Entry + Exit to compute pips.</span>
              )}
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>

            <details className="rounded-lg border p-3">
              <summary className="cursor-pointer text-sm font-medium">
                OCR raw text (for debugging)
              </summary>
              <pre className="mt-2 max-h-[200px] overflow-auto whitespace-pre-wrap text-xs text-muted-foreground">
                {ocrText || "—"}
              </pre>
            </details>

            {error ? <div className="text-sm text-red-600">{error}</div> : null}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="secondary" type="button" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button type="button" onClick={handleSaveTrade}>
            Save trade
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
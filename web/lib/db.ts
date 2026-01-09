import Dexie, { type Table } from "dexie"

export type TradeDirection = "BUY" | "SELL"

export type Trade = {
  id: string
  instrument: string
  strategy?: string
  direction: TradeDirection

  openTime: string // ISO UTC
  closeTime: string // ISO UTC

  entryPrice: number
  exitPrice: number
  stopLoss?: number
  takeProfit?: number

  notes?: string
  tags?: string[]

  pips?: number
  rMultiple?: number

  screenshotId?: string // NEW: link to screenshot import

  createdAt: string
  updatedAt: string
}

export type PsychPhase = "BEFORE" | "DURING" | "AFTER"

export type PsychSnapshot = {
  id: string
  tradeId: string
  phase: PsychPhase

  confidence: number // 0..4
  stress: number // 0..4
  fomo: number // 0..4
  revenge: number // 0..4
  discipline: number // 0..4

  note?: string

  createdAt: string
  updatedAt: string
}

export type ScreenshotImport = {
  id: string
  image: Blob
  mimeType: string
  ocrText: string
  extracted: Record<string, unknown>
  createdAt: string
}

class FxJournalDB extends Dexie {
  trades!: Table<Trade, string>
  psychSnapshots!: Table<PsychSnapshot, string>
  screenshots!: Table<ScreenshotImport, string>

  constructor() {
    super("fx-journal")

    // v1 (original)
    this.version(1).stores({
      trades: "id, instrument, direction, openTime, closeTime, createdAt",
    })

    // v2 added strategy
    this.version(2).stores({
      trades: "id, instrument, direction, strategy, openTime, closeTime, createdAt",
    })

    // v3 added psychology
    this.version(3).stores({
      trades: "id, instrument, direction, strategy, openTime, closeTime, createdAt",
      psychSnapshots: "id, tradeId, phase, [tradeId+phase], createdAt",
    })

    // v4 adds screenshots table + screenshotId on trade
    this.version(4).stores({
      trades:
        "id, instrument, direction, strategy, screenshotId, openTime, closeTime, createdAt",
      psychSnapshots: "id, tradeId, phase, [tradeId+phase], createdAt",
      screenshots: "id, createdAt",
    })
  }
}

export const db = new FxJournalDB()
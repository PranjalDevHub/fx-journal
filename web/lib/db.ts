import Dexie, { type Table } from "dexie"

export type TradeDirection = "BUY" | "SELL"

export type Trade = {
  id: string
  instrument: string // e.g., EURUSD
  strategy?: string // e.g., "NY Breakout"
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

  createdAt: string
  updatedAt: string
}

export type PsychPhase = "BEFORE" | "DURING" | "AFTER"

export type PsychSnapshot = {
  id: string
  tradeId: string
  phase: PsychPhase

  // 0..4
  confidence: number
  stress: number
  fomo: number
  revenge: number
  discipline: number

  note?: string

  createdAt: string
  updatedAt: string
}

class FxJournalDB extends Dexie {
  trades!: Table<Trade, string>
  psychSnapshots!: Table<PsychSnapshot, string>

  constructor() {
    super("fx-journal")

    // v1 (original)
    this.version(1).stores({
      trades: "id, instrument, direction, openTime, closeTime, createdAt",
    })

    // v2 added strategy index
    this.version(2).stores({
      trades: "id, instrument, direction, strategy, openTime, closeTime, createdAt",
    })

    // v3 adds psychology snapshots table
    this.version(3).stores({
      trades: "id, instrument, direction, strategy, openTime, closeTime, createdAt",
      psychSnapshots: "id, tradeId, phase, [tradeId+phase], createdAt",
    })
  }
}

export const db = new FxJournalDB()
import Dexie, { type Table } from "dexie"

export type TradeDirection = "BUY" | "SELL"

export type Trade = {
  id: string
  instrument: string // e.g., EURUSD
  strategy?: string // e.g., "NY Breakout"
  direction: TradeDirection

  openTime: string // ISO string (UTC)
  closeTime: string // ISO string (UTC)

  entryPrice: number
  exitPrice: number
  stopLoss?: number
  takeProfit?: number

  notes?: string
  tags?: string[] // simple for now

  // computed at save time
  pips?: number
  rMultiple?: number

  createdAt: string
  updatedAt: string
}

class FxJournalDB extends Dexie {
  trades!: Table<Trade, string>

  constructor() {
    super("fx-journal")

    // v1 (original)
    this.version(1).stores({
      trades: "id, instrument, direction, openTime, closeTime, createdAt",
    })

    // v2 adds "strategy" as an indexed field
    this.version(2).stores({
      trades: "id, instrument, direction, strategy, openTime, closeTime, createdAt",
    })
  }
}

export const db = new FxJournalDB()
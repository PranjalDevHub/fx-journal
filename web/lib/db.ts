import Dexie, { type Table } from "dexie"

export type TradeDirection = "BUY" | "SELL"

export type Trade = {
  id: string
  instrument: string // e.g., EURUSD
  direction: TradeDirection

  openTime: string // ISO string
  closeTime: string // ISO string

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
    this.version(1).stores({
      // indexes: id is primary key, plus a few searchable fields
      trades: "id, instrument, direction, openTime, closeTime, createdAt",
    })
  }
}

export const db = new FxJournalDB()
import type { TradeDirection } from "./db"

export function guessPipSize(instrumentRaw: string): number {
  const instrument = instrumentRaw.trim().toUpperCase()

  // Very simple MVP rules (customize later in Settings)
  if (instrument.endsWith("JPY")) return 0.01
  if (instrument === "XAUUSD") return 0.1 // gold "points" vary by broker; this is a common approximation
  if (instrument === "XAGUSD") return 0.01

  // Default for most major FX pairs
  return 0.0001
}

export function calcPips(params: {
  instrument: string
  direction: TradeDirection
  entry: number
  exit: number
}): number {
  const pip = guessPipSize(params.instrument)
  const raw =
    params.direction === "BUY"
      ? (params.exit - params.entry) / pip
      : (params.entry - params.exit) / pip

  // round to 1 decimal pip for cleanliness
  return Math.round(raw * 10) / 10
}

export function calcRMultiple(params: {
  direction: TradeDirection
  entry: number
  exit: number
  stopLoss?: number
}): number | undefined {
  const { direction, entry, exit, stopLoss } = params
  if (stopLoss === undefined || stopLoss === null) return undefined

  const risk =
    direction === "BUY" ? entry - stopLoss : stopLoss - entry

  if (!Number.isFinite(risk) || risk === 0) return undefined

  const reward =
    direction === "BUY" ? exit - entry : entry - exit

  const r = reward / risk
  // round to 2 decimals
  return Math.round(r * 100) / 100
}
import type { TradeDirection } from "./db"

function normalizeInstrument(instrumentRaw: string) {
  return (instrumentRaw ?? "").trim().toUpperCase()
}

/**
 * Only treat it as an FX pair if BOTH base and quote are fiat currencies.
 * This prevents XAUUSD, XAGUSD, BTCUSD, etc. from being misclassified as "FX".
 */
function isFxPair(symbolRaw: string): boolean {
  const s = normalizeInstrument(symbolRaw)
  if (s.length !== 6) return false

  const base = s.slice(0, 3)
  const quote = s.slice(3, 6)

  const fiat = new Set([
    "USD", "EUR", "JPY", "GBP", "AUD", "NZD", "CHF", "CAD",
    "SEK", "NOK", "DKK", "PLN", "TRY", "ZAR", "MXN", "SGD", "HKD",
  ])

  return fiat.has(base) && fiat.has(quote)
}

/**
 * Definitions we’ll use in this app:
 * - FX majors: pip = 0.0001 (JPY pairs pip = 0.01), point = pip/10
 * - XAUUSD: pip = 0.1, point = 0.01   (matches your expectation: 82 pips instead of 822 points)
 * - XAGUSD: pip = 0.01, point = 0.001
 * - Unknown: treated as points (pip=1)
 */
export function getInstrumentSizes(instrumentRaw: string) {
  const instrument = normalizeInstrument(instrumentRaw)

  // Metals FIRST (so they don't get caught by 6-letter logic)
  if (instrument === "XAUUSD") {
    return { pipSize: 0.1, pointSize: 0.01, kind: "METAL" as const }
  }
  if (instrument === "XAGUSD") {
    return { pipSize: 0.01, pointSize: 0.001, kind: "METAL" as const }
  }

  // Forex
  if (isFxPair(instrument)) {
    const pipSize = instrument.endsWith("JPY") ? 0.01 : 0.0001
    const pointSize = pipSize / 10
    return { pipSize, pointSize, kind: "FX" as const }
  }

  // Default: treat as points
  return { pipSize: 1, pointSize: 1, kind: "OTHER" as const }
}

export function calcPips(params: {
  instrument: string
  direction: TradeDirection
  entry: number
  exit: number
}): number {
  const { pipSize } = getInstrumentSizes(params.instrument)

  const raw =
    params.direction === "BUY"
      ? (params.exit - params.entry) / pipSize
      : (params.entry - params.exit) / pipSize

  return Math.round(raw * 10) / 10
}

export function calcPoints(params: {
  instrument: string
  direction: TradeDirection
  entry: number
  exit: number
}): number {
  const { pointSize } = getInstrumentSizes(params.instrument)

  const raw =
    params.direction === "BUY"
      ? (params.exit - params.entry) / pointSize
      : (params.entry - params.exit) / pointSize

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

  // SL must be on correct side
  if (direction === "BUY" && stopLoss >= entry) return undefined
  if (direction === "SELL" && stopLoss <= entry) return undefined

  const risk = direction === "BUY" ? entry - stopLoss : stopLoss - entry
  if (!Number.isFinite(risk) || risk === 0) return undefined

  const reward = direction === "BUY" ? exit - entry : entry - exit
  const r = reward / risk

  return Math.round(r * 100) / 100
}
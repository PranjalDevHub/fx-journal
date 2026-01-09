import type { TradeDirection } from "./db"

function countDecimalsFromText(v?: string): number {
  if (!v) return 0
  const s = v.trim().replace(",", ".")
  const parts = s.split(".")
  if (parts.length !== 2) return 0
  return parts[1]?.length ?? 0
}

function isFxPair(symbolRaw: string): boolean {
  const s = symbolRaw.trim().toUpperCase()
  if (s.length !== 6) return false
  const base = s.slice(0, 3)
  const quote = s.slice(3, 6)

  // include majors + common minors/exotics (expand later)
  const ccys = new Set([
    "USD", "EUR", "JPY", "GBP", "AUD", "NZD", "CHF", "CAD",
    "ZAR", "TRY", "SEK", "NOK", "MXN", "SGD", "HKD", "PLN",
  ])

  return ccys.has(base) && ccys.has(quote)
}

export function guessPipSize(params: {
  instrument: string
  entryRaw?: string
  exitRaw?: string
}): number {
  const instrument = params.instrument.trim().toUpperCase()

  // Forex pairs
  if (isFxPair(instrument)) {
    if (instrument.endsWith("JPY")) return 0.01
    return 0.0001
  }

  // Metals (simple MVP defaults; brokers differ)
  // If user enters 2 decimals, treat minimum move as 0.01, else 0.1
  if (instrument === "XAUUSD") {
    const decimals = Math.max(
      countDecimalsFromText(params.entryRaw),
      countDecimalsFromText(params.exitRaw)
    )
    return decimals >= 2 ? 0.01 : 0.1
  }

  if (instrument === "XAGUSD") {
    const decimals = Math.max(
      countDecimalsFromText(params.entryRaw),
      countDecimalsFromText(params.exitRaw)
    )
    return decimals >= 3 ? 0.001 : 0.01
  }

  // Indices / crypto / unknown: treat as "points"
  // (Later we’ll add instrument settings to control this precisely.)
  return 1
}

export function calcPips(params: {
  instrument: string
  direction: TradeDirection
  entry: number
  exit: number
  entryRaw?: string
  exitRaw?: string
}): number {
  const pip = guessPipSize({
    instrument: params.instrument,
    entryRaw: params.entryRaw,
    exitRaw: params.exitRaw,
  })

  const raw =
    params.direction === "BUY"
      ? (params.exit - params.entry) / pip
      : (params.entry - params.exit) / pip

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

  const risk = direction === "BUY" ? entry - stopLoss : stopLoss - entry
  if (!Number.isFinite(risk) || risk === 0) return undefined

  const reward = direction === "BUY" ? exit - entry : entry - exit
  const r = reward / risk

  return Math.round(r * 100) / 100
}
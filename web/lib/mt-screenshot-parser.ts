import { INSTRUMENTS, normalizeSymbol } from "./instruments"
import type { TradeDirection } from "./db"

export type ParsedOcrTrade = {
  instrument?: string
  direction?: TradeDirection
  entryPrice?: number
  exitPrice?: number
  stopLoss?: number
  takeProfit?: number
  volumeLots?: number
  profitMoney?: number
  confidence: Record<string, number> // 0..1
  debug: { usedRules: string[] }
}

function cleanText(t: string) {
  return (t ?? "")
    .replace(/\u00A0/g, " ")
    .replace(/[|]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function normalizeNumberString(raw: string) {
  let s = raw.trim().replace(/\s+/g, "")
  const hasDot = s.includes(".")
  const hasComma = s.includes(",")

  if (hasDot && hasComma) {
    const lastDot = s.lastIndexOf(".")
    const lastComma = s.lastIndexOf(",")
    if (lastComma > lastDot) {
      s = s.replace(/\./g, "")
      s = s.replace(/,/g, ".")
    } else {
      s = s.replace(/,/g, "")
    }
  } else if (hasComma && !hasDot) {
    const parts = s.split(",")
    if (parts.length === 2 && parts[1].length <= 3) s = parts[0] + "." + parts[1]
    else s = s.replace(/,/g, "")
  } else {
    s = s.replace(/,/g, "")
  }

  return s
}

function parseNum(raw?: string): number | undefined {
  if (!raw) return undefined
  const s = normalizeNumberString(raw)
  const n = Number(s)
  return Number.isFinite(n) ? n : undefined
}

function findInstrument(textUpper: string): { value?: string; conf: number; rule?: string } {
  for (const item of INSTRUMENTS) {
    if (textUpper.includes(item.symbol)) {
      return { value: item.symbol, conf: 0.95, rule: "known_symbol_match" }
    }
  }

  const m = textUpper.match(/\b[A-Z]{6}\b/)
  if (m?.[0]) return { value: normalizeSymbol(m[0]), conf: 0.6, rule: "generic_6letters" }

  return { conf: 0 }
}

function findDirection(textLower: string): { value?: TradeDirection; conf: number; rule?: string } {
  const buyIdx = textLower.indexOf("buy")
  const sellIdx = textLower.indexOf("sell")
  if (buyIdx === -1 && sellIdx === -1) return { conf: 0 }

  if (buyIdx !== -1 && (sellIdx === -1 || buyIdx < sellIdx)) {
    return { value: "BUY", conf: 0.85, rule: "keyword_buy" }
  }
  return { value: "SELL", conf: 0.85, rule: "keyword_sell" }
}

function extractByLabel(text: string, labelRegex: RegExp): { value?: number; conf: number; rule?: string } {
  const m = text.match(labelRegex)
  if (!m) return { conf: 0 }
  const n = parseNum(m[1])
  if (n === undefined) return { conf: 0 }
  return { value: n, conf: 0.9, rule: `label_${labelRegex.source}` }
}

function extractArrowPrices(text: string): { entry?: number; exit?: number; conf: number; rule?: string } {
  // Matches: "4 007.75 → 4 006.77" or "4007.75 -> 4006.77"
  const m = text.match(
    /([0-9][0-9\s.,]{0,14}[0-9])\s*(?:→|->|=>|—>|➡|➜|›|>)\s*([0-9][0-9\s.,]{0,14}[0-9])/i
  )
  if (!m) return { conf: 0 }
  const a = parseNum(m[1])
  const b = parseNum(m[2])
  if (a === undefined || b === undefined) return { conf: 0 }
  return { entry: a, exit: b, conf: 0.92, rule: "arrow_price_line" }
}

function extractLotsFromBuySell(text: string): { value?: number; conf: number; rule?: string } {
  // Matches: "sell 0.12" or "buy 1.00"
  const m = text.match(/\b(?:buy|sell)\b\s*([0-9]+(?:[.,][0-9]+)?)/i)
  if (!m?.[1]) return { conf: 0 }
  const v = parseNum(m[1])
  if (v === undefined || v <= 0 || v > 1000) return { conf: 0 }
  return { value: v, conf: 0.85, rule: "lots_after_buy_sell" }
}

function extractDecimalCandidates(text: string): { raw: string; value?: number }[] {
  // Only “price-like” decimals. Avoids time fragments like "7 12".
  const matches = Array.from(text.matchAll(/\b[0-9][0-9\s,]*[.,][0-9]{1,3}\b/g))
  return matches.map((m) => ({ raw: m[0], value: parseNum(m[0]) }))
}

function plausiblePriceFilter(instrument?: string) {
  const inst = (instrument ?? "").toUpperCase()
  // rough ranges only for fallback
  if (inst === "XAUUSD") return (n: number) => n > 100 && n < 10000
  if (inst === "XAGUSD") return (n: number) => n > 1 && n < 1000
  if (inst.length === 6) return (n: number) => n > 0.00001 && n < 10000 // FX-ish
  return (n: number) => n > 0 && n < 1000000
}

export function parseMtScreenshotOcr(ocrText: string): ParsedOcrTrade {
  const usedRules: string[] = []
  const confidence: Record<string, number> = {}

  const text = cleanText(ocrText)
  const textUpper = text.toUpperCase()
  const textLower = text.toLowerCase()

  const instrumentRes = findInstrument(textUpper)
  if (instrumentRes.rule) usedRules.push(instrumentRes.rule)
  confidence.instrument = instrumentRes.conf

  const directionRes = findDirection(textLower)
  if (directionRes.rule) usedRules.push(directionRes.rule)
  confidence.direction = directionRes.conf

  // SL / TP (your screenshot has clear S/L and T/P labels)
  const slRes = extractByLabel(text, /(?:s\/l|sl|stop\s*loss)\s*[:\-]?\s*([0-9][0-9\., ]*)/i)
  if (slRes.rule) usedRules.push(slRes.rule)
  confidence.stopLoss = slRes.conf

  const tpRes = extractByLabel(text, /(?:t\/p|tp|take\s*profit)\s*[:\-]?\s*([0-9][0-9\., ]*)/i)
  if (tpRes.rule) usedRules.push(tpRes.rule)
  confidence.takeProfit = tpRes.conf

  // LOTS from "sell 0.12"
  const lotsRes = extractLotsFromBuySell(text)
  if (lotsRes.rule) usedRules.push(lotsRes.rule)
  confidence.volumeLots = lotsRes.conf

  // ENTRY/EXIT from arrow line "4007.75 → 4006.77" (high priority)
  const arrow = extractArrowPrices(text)
  if (arrow.rule) usedRules.push(arrow.rule)

  let entryPrice = arrow.entry
  let exitPrice = arrow.exit
  if (entryPrice !== undefined) confidence.entryPrice = arrow.conf
  if (exitPrice !== undefined) confidence.exitPrice = arrow.conf

  // If arrow line wasn’t found, fallback to first two plausible decimal prices
  if (entryPrice === undefined || exitPrice === undefined) {
    const cand = extractDecimalCandidates(text)
      .map((x) => x.value)
      .filter((n): n is number => typeof n === "number" && Number.isFinite(n))
      .filter(plausiblePriceFilter(instrumentRes.value))

    if (cand.length >= 2) {
      entryPrice = entryPrice ?? cand[0]
      exitPrice = exitPrice ?? cand[1]
      confidence.entryPrice = Math.max(confidence.entryPrice ?? 0, 0.35)
      confidence.exitPrice = Math.max(confidence.exitPrice ?? 0, 0.35)
      usedRules.push("fallback_decimal_candidates")
    }
  }

  return {
    instrument: instrumentRes.value,
    direction: directionRes.value,
    entryPrice,
    exitPrice,
    stopLoss: slRes.value,
    takeProfit: tpRes.value,
    volumeLots: lotsRes.value,
    profitMoney: undefined,
    confidence,
    debug: { usedRules },
  }
}
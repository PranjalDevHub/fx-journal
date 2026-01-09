import type { Trade } from "./db"
import {
  getSessionFromUtcHour,
  getUtcHour,
  getUtcWeekdayMonFirstIndex,
  type Session,
  WEEKDAYS_MON_FIRST,
} from "./time-buckets"

function round(n: number, decimals: number) {
  const p = Math.pow(10, decimals)
  return Math.round(n * p) / p
}

export type SessionStats = {
  session: Session
  n: number
  winRatePct: number | null
  expectancyR: number | null
  totalR: number
}

export function calcSessionStats(trades: Trade[], minTradesPerSession = 5): SessionStats[] {
  const rTrades = trades.filter((t) => typeof t.rMultiple === "number" && Number.isFinite(t.rMultiple))

  const sessions: Session[] = ["Asia", "London", "Overlap", "New York"]
  const map = new Map<Session, Trade[]>()
  sessions.forEach((s) => map.set(s, []))

  for (const t of rTrades) {
    const h = getUtcHour(t.closeTime)
    const s = getSessionFromUtcHour(h)
    map.get(s)!.push(t)
  }

  const out: SessionStats[] = []
  for (const s of sessions) {
    const arr = map.get(s) ?? []
    if (arr.length < minTradesPerSession) continue

    const n = arr.length
    const totalR = arr.reduce((acc, t) => acc + (t.rMultiple as number), 0)
    const wins = arr.filter((t) => (t.rMultiple as number) > 0).length
    const winRatePct = n ? round((wins / n) * 100, 1) : null
    const expectancyR = n ? round(totalR / n, 2) : null

    out.push({
      session: s,
      n,
      winRatePct,
      expectancyR,
      totalR: round(totalR, 2),
    })
  }

  out.sort((a, b) => (b.expectancyR ?? -999999) - (a.expectancyR ?? -999999))
  return out
}

export type HeatmapCell = {
  avgR: number | null
  n: number
  sumR: number
}

export type HeatmapResult = {
  // rows: Mon..Sun (7), cols: 0..23 (24)
  cells: HeatmapCell[][]
  bestHourUtc: { hour: number; avgR: number; n: number } | null
  bestWeekday: { weekday: (typeof WEEKDAYS_MON_FIRST)[number]; avgR: number; n: number } | null
}

export function buildHourWeekdayHeatmap(trades: Trade[], minTradesPerCell = 2): HeatmapResult {
  const cells: HeatmapCell[][] = Array.from({ length: 7 }, () =>
    Array.from({ length: 24 }, () => ({ avgR: null, n: 0, sumR: 0 }))
  )

  const rTrades = trades.filter((t) => typeof t.rMultiple === "number" && Number.isFinite(t.rMultiple))

  for (const t of rTrades) {
    const hour = getUtcHour(t.closeTime)
    const dayIdx = getUtcWeekdayMonFirstIndex(t.closeTime)
    const r = t.rMultiple as number

    const cell = cells[dayIdx][hour]
    cell.n += 1
    cell.sumR += r
  }

  // finalize avgR
  for (let d = 0; d < 7; d++) {
    for (let h = 0; h < 24; h++) {
      const c = cells[d][h]
      c.avgR = c.n >= minTradesPerCell ? round(c.sumR / c.n, 2) : null
    }
  }

  // best hour (across all weekdays)
  let bestHour: HeatmapResult["bestHourUtc"] = null
  for (let h = 0; h < 24; h++) {
    let sum = 0
    let n = 0
    for (let d = 0; d < 7; d++) {
      const c = cells[d][h]
      sum += c.sumR
      n += c.n
    }
    if (n < minTradesPerCell) continue
    const avg = sum / n
    if (!bestHour || avg > bestHour.avgR) bestHour = { hour: h, avgR: round(avg, 2), n }
  }

  // best weekday (across all hours)
  let bestDay: HeatmapResult["bestWeekday"] = null
  for (let d = 0; d < 7; d++) {
    let sum = 0
    let n = 0
    for (let h = 0; h < 24; h++) {
      const c = cells[d][h]
      sum += c.sumR
      n += c.n
    }
    if (n < minTradesPerCell) continue
    const avg = sum / n
    const weekday = WEEKDAYS_MON_FIRST[d]
    if (!bestDay || avg > bestDay.avgR) bestDay = { weekday, avgR: round(avg, 2), n }
  }

  return { cells, bestHourUtc: bestHour, bestWeekday: bestDay }
}
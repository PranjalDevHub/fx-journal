import type { PsychSnapshot, Trade } from "./db"

export type InsightSeverity = "good" | "warn" | "info"

export type Insight = {
  id: string
  severity: InsightSeverity
  title: string
  evidence: string
  suggestion: string
}

function round(n: number, decimals: number) {
  const p = Math.pow(10, decimals)
  return Math.round(n * p) / p
}

function avg(nums: number[]) {
  if (nums.length === 0) return null
  const s = nums.reduce((a, b) => a + b, 0)
  return s / nums.length
}

function isValidR(t: Trade) {
  return typeof t.rMultiple === "number" && Number.isFinite(t.rMultiple)
}

function withinLookback(iso: string, lookbackDays: number, nowMs: number) {
  const t = new Date(iso).getTime()
  const ms = lookbackDays * 24 * 60 * 60 * 1000
  return nowMs - t <= ms
}

function dayKeyUtcFromIso(iso: string) {
  // YYYY-MM-DD in UTC
  const d = new Date(iso)
  const yyyy = d.getUTCFullYear()
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0")
  const dd = String(d.getUTCDate()).padStart(2, "0")
  return `${yyyy}-${mm}-${dd}`
}

function getBeforeSnapshotMap(snaps: PsychSnapshot[]) {
  const map = new Map<string, PsychSnapshot>()
  for (const s of snaps) {
    if (s.phase === "BEFORE") map.set(s.tradeId, s)
  }
  return map
}

/**
 * Generates explainable, offline insights. No signals.
 * Uses only trades with valid R for most comparisons.
 */
export function generateBehaviorInsights(params: {
  trades: Trade[]
  snapshots: PsychSnapshot[]
  lookbackDays?: number
  nowMs?: number
}) {
  const lookbackDays = params.lookbackDays ?? 30
  const nowMs = params.nowMs ?? Date.now()

  const tradesAll = params.trades.slice()
  const snapsAll = params.snapshots.slice()

  // Trades with R (overall and recent)
  const tradesWithRAll = tradesAll.filter(isValidR)
  const tradesWithRRecent = tradesWithRAll.filter((t) =>
    withinLookback(t.closeTime, lookbackDays, nowMs)
  )

  const baselineAvgAll = avg(tradesWithRAll.map((t) => t.rMultiple as number))
  const baselineAvgRecent = avg(tradesWithRRecent.map((t) => t.rMultiple as number))

  const insights: Insight[] = []

  // Data quality insight: missing R
  const missingR = tradesAll.length - tradesWithRAll.length
  if (tradesAll.length > 0) {
    const pctMissing = round((missingR / tradesAll.length) * 100, 1)
    if (missingR > 0) {
      insights.push({
        id: "data-quality-r-missing",
        severity: "info",
        title: "Some trades don’t contribute to R-based analytics",
        evidence: `${missingR} of ${tradesAll.length} trades (${pctMissing}%) have no R (usually missing Stop Loss).`,
        suggestion:
          "If possible, always log Stop Loss. R-based metrics (expectancy, drawdown, time/psychology insights) become much more accurate.",
      })
    }
  }

  // --- Detector 1: Revenge trading after a loss (quick re-entry) ---
  // Definition (MVP): a trade opened within 30 minutes after the most recent closed losing trade.
  const thresholdMinutes = 30
  const thresholdMs = thresholdMinutes * 60 * 1000

  const byOpen = tradesWithRAll
    .slice()
    .sort((a, b) => new Date(a.openTime).getTime() - new Date(b.openTime).getTime())

  const byClose = tradesWithRAll
    .slice()
    .sort((a, b) => new Date(a.closeTime).getTime() - new Date(b.closeTime).getTime())

  let j = 0
  let lastClosed: Trade | undefined

  const revengeAfterLoss: Trade[] = []

  for (const t of byOpen) {
    const openMs = new Date(t.openTime).getTime()
    while (j < byClose.length && new Date(byClose[j].closeTime).getTime() <= openMs) {
      lastClosed = byClose[j]
      j++
    }

    if (!lastClosed) continue
    if ((lastClosed.rMultiple as number) >= 0) continue

    const delta = openMs - new Date(lastClosed.closeTime).getTime()
    if (delta >= 0 && delta <= thresholdMs) {
      revengeAfterLoss.push(t)
    }
  }

  if (revengeAfterLoss.length >= 5 && baselineAvgAll !== null) {
    const avgR = avg(revengeAfterLoss.map((t) => t.rMultiple as number))
    if (avgR !== null) {
      const avgRRound = round(avgR, 2)
      const base = round(baselineAvgAll, 2)

      const severity: InsightSeverity =
        avgRRound < base ? "warn" : "info"

      insights.push({
        id: "revenge-after-loss",
        severity,
        title: `Trades taken soon after a loss (≤${thresholdMinutes} min)`,
        evidence: `Avg result: ${avgRRound}R (n=${revengeAfterLoss.length}) vs your baseline ${base}R.`,
        suggestion:
          "Consider a rule: after a losing trade, take a short cooldown (e.g., 15–30 min) and re-check your setup criteria before entering again.",
      })
    }
  }

  // --- Detector 2: Overtrading days ---
  // Definition (MVP): day with >= 6 trades (UTC day).
  const overtradeThreshold = 6

  const tradesRecent = tradesWithRAll.filter((t) =>
    withinLookback(t.closeTime, lookbackDays, nowMs)
  )

  const byDay = new Map<string, Trade[]>()
  for (const t of tradesRecent) {
    const day = dayKeyUtcFromIso(t.openTime)
    const arr = byDay.get(day) ?? []
    arr.push(t)
    byDay.set(day, arr)
  }

  const overDays: Trade[] = []
  const normalDays: Trade[] = []

  for (const arr of byDay.values()) {
    if (arr.length >= overtradeThreshold) overDays.push(...arr)
    else normalDays.push(...arr)
  }

  if (overDays.length >= 10 && normalDays.length >= 10) {
    const overAvg = avg(overDays.map((t) => t.rMultiple as number))
    const normalAvg = avg(normalDays.map((t) => t.rMultiple as number))

    if (overAvg !== null && normalAvg !== null) {
      const overA = round(overAvg, 2)
      const normA = round(normalAvg, 2)

      const severity: InsightSeverity =
        overA < normA ? "warn" : "info"

      insights.push({
        id: "overtrading-days",
        severity,
        title: `Overtrading days (≥${overtradeThreshold} trades/day)`,
        evidence: `Avg: ${overA}R (n=${overDays.length}) vs normal days ${normA}R (n=${normalDays.length}) over last ${lookbackDays} days.`,
        suggestion:
          "If performance drops on high-volume days, consider a daily trade limit or a rule: stop after 2 consecutive losses or after hitting daily goal/loss.",
      })
    }
  }

  // --- Detector 3: Within-day performance decay (early vs late trades) ---
  // For days with >= 4 trades, compare first 2 trades vs the rest.
  const early: number[] = []
  const late: number[] = []

  for (const arr of byDay.values()) {
    if (arr.length < 4) continue
    const sorted = arr
      .slice()
      .sort((a, b) => new Date(a.openTime).getTime() - new Date(b.openTime).getTime())

    const firstTwo = sorted.slice(0, 2)
    const rest = sorted.slice(2)

    for (const t of firstTwo) early.push(t.rMultiple as number)
    for (const t of rest) late.push(t.rMultiple as number)
  }

  if (early.length >= 10 && late.length >= 10) {
    const e = avg(early)
    const l = avg(late)
    if (e !== null && l !== null) {
      const er = round(e, 2)
      const lr = round(l, 2)

      if (lr < er) {
        insights.push({
          id: "late-trades-decay",
          severity: "warn",
          title: "Later trades tend to perform worse than early trades",
          evidence: `First 2 trades/day: ${er}R (n=${early.length}) vs later trades: ${lr}R (n=${late.length}) over last ${lookbackDays} days.`,
          suggestion:
            "If you see performance decay, consider stopping after your best 1–2 setups, or taking a scheduled break after the first trades.",
        })
      }
    }
  }

  // --- Psychology-linked insights (FOMO / Discipline / Revenge) ---
  const beforeMap = getBeforeSnapshotMap(snapsAll)

  function psychCompare(field: "fomo" | "revenge" | "discipline", label: string) {
    const high: number[] = []
    const low: number[] = []

    for (const t of tradesWithRRecent) {
      const snap = beforeMap.get(t.id)
      if (!snap) continue
      const v = snap[field]
      const r = t.rMultiple as number
      if (v >= 3) high.push(r)
      if (v <= 1) low.push(r)
    }

    if (high.length >= 8 && low.length >= 8) {
      const h = avg(high)
      const l = avg(low)
      if (h === null || l === null) return

      const hr = round(h, 2)
      const lr = round(l, 2)

      // For discipline, higher is good; for fomo/revenge, higher is usually bad
      const isNegativeFactor = field === "fomo" || field === "revenge"
      const severity: InsightSeverity =
        isNegativeFactor ? (hr < lr ? "warn" : "info") : (hr > lr ? "good" : "info")

      const title =
        field === "discipline"
          ? `${label} is linked with better outcomes`
          : `${label} is linked with worse outcomes`

      insights.push({
        id: `psych-${field}`,
        severity,
        title,
        evidence: `High (≥3): ${hr}R (n=${high.length}) vs Low (≤1): ${lr}R (n=${low.length}) over last ${lookbackDays} days.`,
        suggestion:
          field === "discipline"
            ? "Before entering, run a quick checklist: setup valid, risk defined, SL placed, entry reason written. Make “discipline ≥3” the goal."
            : "When this feeling is high, pause and re-validate the setup. Consider a rule: if score ≥3, wait 5 minutes and re-check criteria before executing.",
      })
    }
  }

  psychCompare("fomo", "FOMO (Before)")
  psychCompare("revenge", "Revenge (Before)")
  psychCompare("discipline", "Discipline (Before)")

  // If we have too few insights, add a friendly info note
  if (insights.length === 0) {
    insights.push({
      id: "not-enough-data",
      severity: "info",
      title: "Not enough data for behavior insights yet",
      evidence: "Add more trades with Stop Loss (to compute R) and fill psychology sliders for a few weeks.",
      suggestion: "Aim for 30–50 trades with R. Patterns become much clearer with more sample size.",
    })
  }

  // Small “overall baseline” context as info
  if (baselineAvgRecent !== null && tradesWithRRecent.length >= 10) {
    insights.push({
      id: "baseline-recent",
      severity: "info",
      title: `Baseline over last ${lookbackDays} days`,
      evidence: `Avg R: ${round(baselineAvgRecent, 2)}R (n=${tradesWithRRecent.length}).`,
      suggestion: "Use this as your reference when comparing sessions, strategies, and psychology.",
    })
  }

  return insights
}
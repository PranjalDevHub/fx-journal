import type { PsychSnapshot, PsychPhase, Trade } from "./db"

function round(n: number, decimals: number) {
  const p = Math.pow(10, decimals)
  return Math.round(n * p) / p
}

type GroupStats = {
  label: string
  n: number
  avgR: number | null
}

function avg(arr: number[]) {
  if (arr.length === 0) return null
  const s = arr.reduce((a, b) => a + b, 0)
  return s / arr.length
}

export function buildTradeRMap(trades: Trade[]) {
  const map = new Map<string, number>()
  for (const t of trades) {
    if (typeof t.rMultiple === "number" && Number.isFinite(t.rMultiple)) {
      map.set(t.id, t.rMultiple)
    }
  }
  return map
}

export function groupAvgRBySnapshotLevel(params: {
  trades: Trade[]
  snapshots: PsychSnapshot[]
  phase: PsychPhase
  field: keyof Pick<PsychSnapshot, "confidence" | "stress" | "fomo" | "revenge" | "discipline">
  highThreshold?: number // default 3
  lowThreshold?: number // default 1
}) {
  const { trades, snapshots, phase, field } = params
  const highT = params.highThreshold ?? 3
  const lowT = params.lowThreshold ?? 1

  const rMap = buildTradeRMap(trades)

  const relevant = snapshots.filter((s) => s.phase === phase && rMap.has(s.tradeId))

  const high: number[] = []
  const low: number[] = []

  for (const s of relevant) {
    const r = rMap.get(s.tradeId)!
    const v = s[field]
    if (v >= highT) high.push(r)
    if (v <= lowT) low.push(r)
  }

  const highAvg = avg(high)
  const lowAvg = avg(low)

  const highOut: GroupStats = { label: `High (≥${highT})`, n: high.length, avgR: highAvg === null ? null : round(highAvg, 2) }
  const lowOut: GroupStats = { label: `Low (≤${lowT})`, n: low.length, avgR: lowAvg === null ? null : round(lowAvg, 2) }

  return { high: highOut, low: lowOut, totalSnapshots: relevant.length }
}
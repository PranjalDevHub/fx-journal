import type { Trade } from "./db"

function round(n: number, decimals: number) {
  const p = Math.pow(10, decimals)
  return Math.round(n * p) / p
}

export function getTradesWithR(trades: Trade[]) {
  return trades.filter((t) => typeof t.rMultiple === "number" && Number.isFinite(t.rMultiple))
}

export function calcWinRateR(trades: Trade[]) {
  const rTrades = getTradesWithR(trades)
  const total = rTrades.length
  if (total === 0) return null

  const wins = rTrades.filter((t) => (t.rMultiple as number) > 0).length
  return round((wins / total) * 100, 1) // %
}

export function calcExpectancyR(trades: Trade[]) {
  const rTrades = getTradesWithR(trades)
  const total = rTrades.length
  if (total === 0) return null

  const sumR = rTrades.reduce((acc, t) => acc + (t.rMultiple as number), 0)
  return round(sumR / total, 2)
}

export function calcProfitFactorR(trades: Trade[]) {
  const rTrades = getTradesWithR(trades)
  if (rTrades.length === 0) return null

  const grossWin = rTrades
    .filter((t) => (t.rMultiple as number) > 0)
    .reduce((acc, t) => acc + (t.rMultiple as number), 0)

  const grossLossAbs = Math.abs(
    rTrades
      .filter((t) => (t.rMultiple as number) < 0)
      .reduce((acc, t) => acc + (t.rMultiple as number), 0)
  )

  if (grossLossAbs === 0) return grossWin > 0 ? Infinity : null
  return round(grossWin / grossLossAbs, 2)
}

export function calcMaxDrawdownR(trades: Trade[]) {
  const rTrades = getTradesWithR(trades)
    .slice()
    .sort((a, b) => new Date(a.closeTime).getTime() - new Date(b.closeTime).getTime())

  if (rTrades.length === 0) return null

  let equity = 0
  let peak = 0
  let maxDD = 0

  for (const t of rTrades) {
    equity += t.rMultiple as number
    if (equity > peak) peak = equity
    const dd = peak - equity
    if (dd > maxDD) maxDD = dd
  }

  return round(maxDD, 2) // in R
}
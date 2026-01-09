import type { Trade } from "./db"

export type StrategyStats = {
  strategy: string
  n: number
  winRatePct: number | null
  expectancyR: number | null
  profitFactor: number | null // Infinity possible
  totalR: number
}

function round(n: number, decimals: number) {
  const p = Math.pow(10, decimals)
  return Math.round(n * p) / p
}

export function calcStrategyStats(trades: Trade[], minTrades = 5): StrategyStats[] {
  // only trades with valid R are used for these stats
  const rTrades = trades.filter(
    (t) => typeof t.rMultiple === "number" && Number.isFinite(t.rMultiple)
  )

  const map = new Map<string, Trade[]>()

  for (const t of rTrades) {
    const key = (t.strategy?.trim() || "Unspecified")
    const arr = map.get(key) ?? []
    arr.push(t)
    map.set(key, arr)
  }

  const out: StrategyStats[] = []

  for (const [strategy, arr] of map.entries()) {
    const n = arr.length
    if (n < minTrades) continue

    const totalR = arr.reduce((acc, t) => acc + (t.rMultiple as number), 0)

    const wins = arr.filter((t) => (t.rMultiple as number) > 0).length
    const winRatePct = n > 0 ? round((wins / n) * 100, 1) : null

    const expectancyR = n > 0 ? round(totalR / n, 2) : null

    const grossWin = arr
      .filter((t) => (t.rMultiple as number) > 0)
      .reduce((acc, t) => acc + (t.rMultiple as number), 0)

    const grossLossAbs = Math.abs(
      arr
        .filter((t) => (t.rMultiple as number) < 0)
        .reduce((acc, t) => acc + (t.rMultiple as number), 0)
    )

    let profitFactor: number | null = null
    if (grossLossAbs === 0) {
      profitFactor = grossWin > 0 ? Infinity : null
    } else {
      profitFactor = round(grossWin / grossLossAbs, 2)
    }

    out.push({
      strategy,
      n,
      winRatePct,
      expectancyR,
      profitFactor,
      totalR: round(totalR, 2),
    })
  }

  // Sort by expectancy desc, then by n desc
  out.sort((a, b) => {
    const ea = a.expectancyR ?? -999999
    const eb = b.expectancyR ?? -999999
    if (eb !== ea) return eb - ea
    return b.n - a.n
  })

  return out
}
"use client"

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts"
import type { Trade } from "@/lib/db"

type Point = { x: string; equityR: number }

function buildEquityCurvePoints(trades: Trade[]): Point[] {
  // Use only trades that have rMultiple
  const rTrades = trades
    .filter((t) => typeof t.rMultiple === "number" && Number.isFinite(t.rMultiple))
    .slice()
    .sort(
      (a, b) =>
        new Date(a.closeTime).getTime() - new Date(b.closeTime).getTime()
    )

  let equity = 0
  const points: Point[] = []

  for (const t of rTrades) {
    equity += t.rMultiple as number
    const d = new Date(t.closeTime)
    // nice short label
    const label = `${d.toLocaleDateString()} ${d.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })}`
    points.push({ x: label, equityR: Math.round(equity * 100) / 100 })
  }

  return points
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  const v = payload[0].value
  return (
    <div className="rounded-lg border bg-card px-3 py-2 text-sm shadow-sm">
      <div className="text-muted-foreground">{label}</div>
      <div className="font-medium">Equity: {v}R</div>
    </div>
  )
}

export function EquityCurve({ trades }: { trades: Trade[] }) {
  const data = buildEquityCurvePoints(trades)

  if (data.length === 0) {
    return (
      <div className="text-sm text-muted-foreground">
        Add trades with Stop Loss (so R can be calculated) to see your equity curve.
      </div>
    )
  }

  return (
    <div className="h-[260px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
          <XAxis
            dataKey="x"
            tick={{ fontSize: 12 }}
            interval="preserveStartEnd"
            minTickGap={30}
          />
          <YAxis tick={{ fontSize: 12 }} />
          <Tooltip content={<CustomTooltip />} />
          <Line
            type="monotone"
            dataKey="equityR"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
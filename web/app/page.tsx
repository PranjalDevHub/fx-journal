"use client"

import { useLiveQuery } from "dexie-react-hooks"
import { db } from "@/lib/db"
import {
  calcExpectancyR,
  calcMaxDrawdownR,
  calcProfitFactorR,
  calcWinRateR,
} from "@/lib/metrics"

import { EquityCurve } from "@/components/equity-curve"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function DashboardPage() {
  const trades = useLiveQuery(() => db.trades.toArray(), [])

  const winRate = trades ? calcWinRateR(trades) : null
  const expectancy = trades ? calcExpectancyR(trades) : null
  const maxDD = trades ? calcMaxDrawdownR(trades) : null
  const profitFactor = trades ? calcProfitFactorR(trades) : null

  const tradesWithRCount = trades
    ? trades.filter((t) => typeof t.rMultiple === "number").length
    : null

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Core performance metrics based on your logged trades.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Win Rate</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {winRate === null ? "—" : `${winRate}%`}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Expectancy (R)</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {expectancy === null ? "—" : expectancy}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Profit Factor</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {profitFactor === null
              ? "—"
              : profitFactor === Infinity
                ? "∞"
                : profitFactor}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Max Drawdown (R)</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {maxDD === null ? "—" : maxDD}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Equity Curve (R)</CardTitle>
        </CardHeader>
        <CardContent>
          {trades ? (
            <EquityCurve trades={trades} />
          ) : (
            <div className="text-sm text-muted-foreground">Loading…</div>
          )}
        </CardContent>
      </Card>

      <div className="text-sm text-muted-foreground">
        Total trades:{" "}
        <span className="font-medium text-foreground">
          {trades?.length ?? "…"}
        </span>
        {" • "}
        Trades with R:{" "}
        <span className="font-medium text-foreground">
          {tradesWithRCount ?? "…"}
        </span>
      </div>
    </div>
  )
}
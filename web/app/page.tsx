"use client"

import { useMemo } from "react"
import { useLiveQuery } from "dexie-react-hooks"
import { db } from "@/lib/db"
import {
  calcExpectancyR,
  calcMaxDrawdownR,
  calcProfitFactorR,
  calcWinRateR,
} from "@/lib/metrics"
import { calcStrategyStats } from "@/lib/strategy-analytics"

import { EquityCurve } from "@/components/equity-curve"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

export default function DashboardPage() {
  const trades = useLiveQuery(() => db.trades.toArray(), [])

  const winRate = trades ? calcWinRateR(trades) : null
  const expectancy = trades ? calcExpectancyR(trades) : null
  const maxDD = trades ? calcMaxDrawdownR(trades) : null
  const profitFactor = trades ? calcProfitFactorR(trades) : null

  const tradesWithRCount = trades
    ? trades.filter((t) => typeof t.rMultiple === "number").length
    : null

  const strategyStats = useMemo(() => {
    if (!trades) return null
    return calcStrategyStats(trades, 5) // minimum 5 trades per strategy
  }, [trades])

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

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Strategy performance</CardTitle>
        </CardHeader>
        <CardContent>
          {!strategyStats ? (
            <div className="text-sm text-muted-foreground">Loading…</div>
          ) : strategyStats.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              Not enough data yet. Log at least <span className="font-medium text-foreground">5 trades with R</span> per
              strategy to see reliable stats.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Strategy</TableHead>
                  <TableHead className="text-right">Trades</TableHead>
                  <TableHead className="text-right">Win %</TableHead>
                  <TableHead className="text-right">Expectancy (R)</TableHead>
                  <TableHead className="text-right">Profit factor</TableHead>
                  <TableHead className="text-right">Total R</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {strategyStats.slice(0, 10).map((s) => (
                  <TableRow key={s.strategy}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{s.strategy}</Badge>
                        {s.expectancyR !== null && s.expectancyR > 0 ? (
                          <span className="text-xs text-emerald-700">good</span>
                        ) : null}
                      </div>
                    </TableCell>

                    <TableCell className="text-right">{s.n}</TableCell>
                    <TableCell className="text-right">
                      {s.winRatePct === null ? "—" : `${s.winRatePct}%`}
                    </TableCell>
                    <TableCell className="text-right">
                      {s.expectancyR === null ? "—" : s.expectancyR}
                    </TableCell>
                    <TableCell className="text-right">
                      {s.profitFactor === null
                        ? "—"
                        : s.profitFactor === Infinity
                          ? "∞"
                          : s.profitFactor}
                    </TableCell>
                    <TableCell className="text-right">{s.totalR}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          <div className="mt-3 text-xs text-muted-foreground">
            Note: Strategy stats use only trades with valid <span className="text-foreground font-medium">R</span>.
            Add Stop Loss to compute R reliably.
          </div>
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
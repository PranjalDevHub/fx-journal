"use client"

import { useMemo } from "react"
import { useLiveQuery } from "dexie-react-hooks"
import { db } from "@/lib/db"
import { buildHourWeekdayHeatmap, calcSessionStats } from "@/lib/time-analytics"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TimeHeatmap } from "@/components/time-heatmap"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export default function TimePage() {
  const trades = useLiveQuery(() => db.trades.toArray(), [])

  const sessionStats = useMemo(() => {
    if (!trades) return null
    return calcSessionStats(trades, 5)
  }, [trades])

  const heatmap = useMemo(() => {
    if (!trades) return null
    return buildHourWeekdayHeatmap(trades, 2)
  }, [trades])

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Time analysis</h1>
        <p className="text-sm text-muted-foreground">
          Discover your best sessions, hours, and days (based on R). Times are grouped by <span className="font-medium text-foreground">UTC</span>.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Best hour (UTC)</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {!heatmap?.bestHourUtc ? "—" : `${String(heatmap.bestHourUtc.hour).padStart(2, "0")}:00`}
            <div className="mt-1 text-sm font-normal text-muted-foreground">
              {!heatmap?.bestHourUtc
                ? "Need more trades."
                : `Avg ${heatmap.bestHourUtc.avgR}R • n=${heatmap.bestHourUtc.n}`}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Best weekday</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {!heatmap?.bestWeekday ? "—" : heatmap.bestWeekday.weekday}
            <div className="mt-1 text-sm font-normal text-muted-foreground">
              {!heatmap?.bestWeekday
                ? "Need more trades."
                : `Avg ${heatmap.bestWeekday.avgR}R • n=${heatmap.bestWeekday.n}`}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Trades with R</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {trades ? trades.filter((t) => typeof t.rMultiple === "number").length : "…"}
            <div className="mt-1 text-sm font-normal text-muted-foreground">
              Only trades with Stop Loss can compute R.
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Best sessions</CardTitle>
        </CardHeader>
        <CardContent>
          {!sessionStats ? (
            <div className="text-sm text-muted-foreground">Loading…</div>
          ) : sessionStats.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              Add at least <span className="font-medium text-foreground">5 trades with R</span> per session to see stats.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Session (UTC)</TableHead>
                  <TableHead className="text-right">Trades</TableHead>
                  <TableHead className="text-right">Win %</TableHead>
                  <TableHead className="text-right">Expectancy (R)</TableHead>
                  <TableHead className="text-right">Total R</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessionStats.map((s) => (
                  <TableRow key={s.session}>
                    <TableCell className="font-medium">{s.session}</TableCell>
                    <TableCell className="text-right">{s.n}</TableCell>
                    <TableCell className="text-right">
                      {s.winRatePct === null ? "—" : `${s.winRatePct}%`}
                    </TableCell>
                    <TableCell className="text-right">
                      {s.expectancyR === null ? "—" : s.expectancyR}
                    </TableCell>
                    <TableCell className="text-right">{s.totalR}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          <div className="mt-3 text-xs text-muted-foreground">
            Sessions are approximations (UTC): Asia (22–06), London (07–12), Overlap (13–16), New York (17–21).
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Hour × weekday heatmap (Avg R)</CardTitle>
        </CardHeader>
        <CardContent>
          {!heatmap ? (
            <div className="text-sm text-muted-foreground">Loading…</div>
          ) : (
            <TimeHeatmap cells={heatmap.cells} />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
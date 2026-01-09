"use client"

import { useMemo } from "react"
import { useLiveQuery } from "dexie-react-hooks"
import { db } from "@/lib/db"
import { groupAvgRBySnapshotLevel } from "@/lib/psych-analytics"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

function StatRow(props: {
  label: string
  phase: "BEFORE" | "DURING" | "AFTER"
  highN: number
  highAvg: number | null
  lowN: number
  lowAvg: number | null
}) {
  return (
    <TableRow>
      <TableCell className="font-medium">{props.label}</TableCell>
      <TableCell>
        <Badge variant="outline">{props.phase}</Badge>
      </TableCell>
      <TableCell className="text-right">
        {props.highAvg === null ? "—" : `${props.highAvg}R`}{" "}
        <span className="text-xs text-muted-foreground">(n={props.highN})</span>
      </TableCell>
      <TableCell className="text-right">
        {props.lowAvg === null ? "—" : `${props.lowAvg}R`}{" "}
        <span className="text-xs text-muted-foreground">(n={props.lowN})</span>
      </TableCell>
    </TableRow>
  )
}

export default function PsychologyPage() {
  const trades = useLiveQuery(() => db.trades.toArray(), [])
  const snaps = useLiveQuery(() => db.psychSnapshots.toArray(), [])

  const rows = useMemo(() => {
    if (!trades || !snaps) return null

    const revengeBefore = groupAvgRBySnapshotLevel({
      trades,
      snapshots: snaps,
      phase: "BEFORE",
      field: "revenge",
    })

    const fomoBefore = groupAvgRBySnapshotLevel({
      trades,
      snapshots: snaps,
      phase: "BEFORE",
      field: "fomo",
    })

    const disciplineBefore = groupAvgRBySnapshotLevel({
      trades,
      snapshots: snaps,
      phase: "BEFORE",
      field: "discipline",
    })

    const stressDuring = groupAvgRBySnapshotLevel({
      trades,
      snapshots: snaps,
      phase: "DURING",
      field: "stress",
    })

    return [
      { label: "Revenge impact", phase: "BEFORE" as const, data: revengeBefore },
      { label: "FOMO impact", phase: "BEFORE" as const, data: fomoBefore },
      { label: "Discipline impact", phase: "BEFORE" as const, data: disciplineBefore },
      { label: "Stress impact", phase: "DURING" as const, data: stressDuring },
    ]
  }, [trades, snaps])

  const tradesWithR = trades ? trades.filter((t) => typeof t.rMultiple === "number").length : null

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Psychology</h1>
        <p className="text-sm text-muted-foreground">
          How mindset correlates with results. Uses only trades with valid <span className="font-medium text-foreground">R</span>.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Trades with R</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {tradesWithR ?? "…"}
            <div className="mt-1 text-sm font-normal text-muted-foreground">
              Add Stop Loss to compute R.
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Psych snapshots</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">
            {snaps?.length ?? "…"}
            <div className="mt-1 text-sm font-normal text-muted-foreground">
              Each trade can have Before/During/After.
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm">How to use this</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Mark <span className="font-medium text-foreground">Revenge/FOMO</span> when you feel it.
            Over time you’ll see the real cost (Avg R).
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Impact summary (High vs Low)</CardTitle>
        </CardHeader>
        <CardContent>
          {!rows ? (
            <div className="text-sm text-muted-foreground">Loading…</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Factor</TableHead>
                  <TableHead>Phase</TableHead>
                  <TableHead className="text-right">High (≥3) Avg R</TableHead>
                  <TableHead className="text-right">Low (≤1) Avg R</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <StatRow
                    key={r.label}
                    label={r.label}
                    phase={r.phase}
                    highN={r.data.high.n}
                    highAvg={r.data.high.avgR}
                    lowN={r.data.low.n}
                    lowAvg={r.data.low.avgR}
                  />
                ))}
              </TableBody>
            </Table>
          )}

          <div className="mt-3 text-xs text-muted-foreground">
            This is correlation, not “cause”. Use it as a mirror to spot behavior patterns.
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
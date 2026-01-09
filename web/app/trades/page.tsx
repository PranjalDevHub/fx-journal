"use client"

import { useLiveQuery } from "dexie-react-hooks"
import { db } from "@/lib/db"

import { AddTradeDialog } from "@/components/add-trade-dialog"
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

function fmtDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleString()
}

export default function TradesPage() {
  const trades = useLiveQuery(
    () => db.trades.orderBy("closeTime").reverse().toArray(),
    []
  )

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Trades</h1>
          <p className="text-sm text-muted-foreground">
            Your journal is stored offline in this browser (IndexedDB).
          </p>
        </div>
        <AddTradeDialog />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">
            Trade list {trades ? `(${trades.length})` : ""}
          </CardTitle>
        </CardHeader>

        <CardContent>
          {!trades ? (
            <div className="text-sm text-muted-foreground">Loading…</div>
          ) : trades.length === 0 ? (
            <div className="text-sm text-muted-foreground">No trades yet.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Close time</TableHead>
                  <TableHead>Instrument</TableHead>
                  <TableHead>Dir</TableHead>
                  <TableHead className="text-right">Entry</TableHead>
                  <TableHead className="text-right">Exit</TableHead>
                  <TableHead className="text-right">Pips</TableHead>
                  <TableHead className="text-right">R</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {trades.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="text-sm">{fmtDate(t.closeTime)}</TableCell>
                    <TableCell className="font-medium">{t.instrument}</TableCell>
                    <TableCell>
                      <Badge variant={t.direction === "BUY" ? "default" : "secondary"}>
                        {t.direction}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">{t.entryPrice}</TableCell>
                    <TableCell className="text-right">{t.exitPrice}</TableCell>
                    <TableCell className="text-right">
                      <span className={t.pips && t.pips < 0 ? "text-red-600" : "text-foreground"}>
                        {t.pips ?? "—"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">{t.rMultiple ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
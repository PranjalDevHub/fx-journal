"use client"

import { useMemo, useState } from "react"
import { useLiveQuery } from "dexie-react-hooks"
import { db, type TradeDirection } from "@/lib/db"

import { TradeFormDialog } from "@/components/trade-form-dialog"
import { TradeActions } from "@/components/trade-actions"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString()
}

type DirFilter = "ALL" | TradeDirection

export default function TradesPage() {
  const trades = useLiveQuery(
    () => db.trades.orderBy("closeTime").reverse().toArray(),
    []
  )

  const [openAdd, setOpenAdd] = useState(false)

  // Filters
  const [instrumentFilter, setInstrumentFilter] = useState("")
  const [strategyFilter, setStrategyFilter] = useState("")
  const [directionFilter, setDirectionFilter] = useState<DirFilter>("ALL")
  const [tagFilter, setTagFilter] = useState("")

  const filteredTrades = useMemo(() => {
    if (!trades) return null

    const inst = instrumentFilter.trim().toUpperCase()
    const strat = strategyFilter.trim().toLowerCase()
    const tag = tagFilter.trim().toLowerCase()

    return trades.filter((t) => {
      if (inst && !t.instrument.toUpperCase().includes(inst)) return false
      if (directionFilter !== "ALL" && t.direction !== directionFilter) return false

      const s = (t.strategy ?? "").toLowerCase()
      if (strat && !s.includes(strat)) return false

      const tags = (t.tags ?? []).map((x) => x.toLowerCase())
      if (tag && !tags.some((x) => x.includes(tag))) return false

      return true
    })
  }, [trades, instrumentFilter, strategyFilter, directionFilter, tagFilter])

  function clearFilters() {
    setInstrumentFilter("")
    setStrategyFilter("")
    setDirectionFilter("ALL")
    setTagFilter("")
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Trades</h1>
          <p className="text-sm text-muted-foreground">
            Log and review trades (offline).
          </p>
        </div>

        <Button onClick={() => setOpenAdd(true)}>Add trade</Button>
      </div>

      <TradeFormDialog mode="add" open={openAdd} onOpenChange={setOpenAdd} />

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <Label>Instrument</Label>
              <Input
                value={instrumentFilter}
                onChange={(e) => setInstrumentFilter(e.target.value)}
                placeholder="EURUSD"
              />
            </div>

            <div className="space-y-2">
              <Label>Strategy</Label>
              <Input
                value={strategyFilter}
                onChange={(e) => setStrategyFilter(e.target.value)}
                placeholder="NY Breakout"
              />
            </div>

            <div className="space-y-2">
              <Label>Direction</Label>
              <Select
                value={directionFilter}
                onValueChange={(v) => setDirectionFilter(v as DirFilter)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">ALL</SelectItem>
                  <SelectItem value="BUY">BUY</SelectItem>
                  <SelectItem value="SELL">SELL</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Tag contains</Label>
              <Input
                value={tagFilter}
                onChange={(e) => setTagFilter(e.target.value)}
                placeholder="breakout"
              />
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between gap-3">
            <div className="text-sm text-muted-foreground">
              Showing{" "}
              <span className="font-medium text-foreground">
                {filteredTrades ? filteredTrades.length : "…"}
              </span>{" "}
              of{" "}
              <span className="font-medium text-foreground">
                {trades ? trades.length : "…"}
              </span>{" "}
              trades
            </div>

            <Button variant="secondary" onClick={clearFilters}>
              Clear filters
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Trade list</CardTitle>
        </CardHeader>

        <CardContent>
          {!filteredTrades ? (
            <div className="text-sm text-muted-foreground">Loading…</div>
          ) : filteredTrades.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              No trades match your filters.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Close time</TableHead>
                  <TableHead>Instrument</TableHead>
                  <TableHead>Strategy</TableHead>
                  <TableHead>Dir</TableHead>
                  <TableHead className="text-right">Entry</TableHead>
                  <TableHead className="text-right">Exit</TableHead>
                  <TableHead className="text-right">Pips</TableHead>
                  <TableHead className="text-right">R</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {filteredTrades.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="text-sm">{fmtDate(t.closeTime)}</TableCell>

                    <TableCell className="font-medium">{t.instrument}</TableCell>

                    <TableCell className="text-sm">
                      {t.strategy ? (
                        <Badge variant="outline">{t.strategy}</Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>

                    <TableCell>
                      <Badge variant={t.direction === "BUY" ? "default" : "secondary"}>
                        {t.direction}
                      </Badge>
                    </TableCell>

                    <TableCell className="text-right">{t.entryPrice}</TableCell>
                    <TableCell className="text-right">{t.exitPrice}</TableCell>

                    <TableCell className="text-right">
                      <span className={typeof t.pips === "number" && t.pips < 0 ? "text-red-600" : ""}>
                        {t.pips ?? "—"}
                      </span>
                    </TableCell>

                    <TableCell className="text-right">{t.rMultiple ?? "—"}</TableCell>

                    <TableCell className="text-right">
                      <TradeActions trade={t} />
                    </TableCell>
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
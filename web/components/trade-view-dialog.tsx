"use client"

import type { Trade } from "@/lib/db"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString()
}

export function TradeViewDialog(props: {
  open: boolean
  onOpenChange: (open: boolean) => void
  trade?: Trade
  onEdit?: () => void
}) {
  const { open, onOpenChange, trade, onEdit } = props

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Trade details</DialogTitle>
        </DialogHeader>

        {!trade ? (
          <div className="text-sm text-muted-foreground">No trade selected.</div>
        ) : (
          <div className="space-y-4 text-sm">
            <div className="flex items-center justify-between">
              <div className="text-lg font-semibold">{trade.instrument}</div>
              <Badge variant={trade.direction === "BUY" ? "default" : "secondary"}>
                {trade.direction}
              </Badge>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <div>
                <div className="text-muted-foreground">Open time</div>
                <div className="font-medium">{fmtDate(trade.openTime)}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Close time</div>
                <div className="font-medium">{fmtDate(trade.closeTime)}</div>
              </div>

              <div>
                <div className="text-muted-foreground">Entry</div>
                <div className="font-medium">{trade.entryPrice}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Exit</div>
                <div className="font-medium">{trade.exitPrice}</div>
              </div>

              <div>
                <div className="text-muted-foreground">Stop loss</div>
                <div className="font-medium">{trade.stopLoss ?? "—"}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Take profit</div>
                <div className="font-medium">{trade.takeProfit ?? "—"}</div>
              </div>

              <div>
                <div className="text-muted-foreground">Pips</div>
                <div className="font-medium">{trade.pips ?? "—"}</div>
              </div>
              <div>
                <div className="text-muted-foreground">R</div>
                <div className="font-medium">{trade.rMultiple ?? "—"}</div>
              </div>
            </div>

            <div>
              <div className="text-muted-foreground">Tags</div>
              <div className="mt-1 flex flex-wrap gap-2">
                {(trade.tags ?? []).length === 0 ? (
                  <span className="text-muted-foreground">—</span>
                ) : (
                  trade.tags!.map((t) => (
                    <Badge key={t} variant="outline">
                      {t}
                    </Badge>
                  ))
                )}
              </div>
            </div>

            <div>
              <div className="text-muted-foreground">Notes</div>
              <div className="mt-1 whitespace-pre-wrap rounded-lg border bg-muted/30 p-3">
                {trade.notes ?? "—"}
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          {trade ? (
            <Button variant="secondary" onClick={onEdit}>
              Edit
            </Button>
          ) : null}
          <Button onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
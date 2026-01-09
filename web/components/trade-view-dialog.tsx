"use client";

import React from "react";
import type { Trade } from "@/lib/db";

import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export function TradeViewDialog({
  open,
  onOpenChange,
  trade,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trade: Trade;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Trade details</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          <div className="flex items-center gap-2">
            <div className="font-medium">{trade.instrument}</div>
            <Badge variant={trade.direction === "BUY" ? "default" : "outline"}>{trade.direction}</Badge>
            {trade.strategy ? <Badge variant="secondary">{trade.strategy}</Badge> : null}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <div className="text-xs text-muted-foreground">Open time</div>
              <div>{formatDate(trade.openTime)}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Close time</div>
              <div>{formatDate(trade.closeTime)}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Entry</div>
              <div>{trade.entryPrice}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Exit</div>
              <div>{trade.exitPrice}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Stop loss</div>
              <div>{trade.stopLoss ?? "-"}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Take profit</div>
              <div>{trade.takeProfit ?? "-"}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Pips</div>
              <div>{trade.pips ?? "-"}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">R</div>
              <div>{trade.rMultiple ?? "-"}</div>
            </div>
          </div>

          {trade.tags?.length ? (
            <div>
              <div className="text-xs text-muted-foreground">Tags</div>
              <div className="flex flex-wrap gap-2 pt-1">
                {trade.tags.map((t) => (
                  <Badge key={t} variant="outline">
                    {t}
                  </Badge>
                ))}
              </div>
            </div>
          ) : null}

          {trade.notes ? (
            <div>
              <div className="text-xs text-muted-foreground">Notes</div>
              <div className="whitespace-pre-wrap">{trade.notes}</div>
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
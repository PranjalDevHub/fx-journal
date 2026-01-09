"use client";

import React, { useState } from "react";
import type { Trade } from "@/lib/db";
import { db } from "@/lib/db";

import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

import { TradeFormDialog } from "@/components/trade-form-dialog";
import { TradeViewDialog } from "@/components/trade-view-dialog";
import { PsychologyDialog } from "@/components/psychology-dialog";

function isoNow() {
  return new Date().toISOString();
}

export function TradeActions({ trade }: { trade: Trade }) {
  const [viewOpen, setViewOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [psychOpen, setPsychOpen] = useState(false);

  async function softDeleteTrade() {
    const stamp = isoNow();

    await db.transaction("rw", db.trades, db.psychSnapshots, async () => {
      await db.trades.update(trade.id, {
        deletedAt: stamp,
        updatedAt: stamp,
      });

      await db.psychSnapshots
        .where("tradeId")
        .equals(trade.id)
        .modify((p: any) => {
          p.deletedAt = stamp;
          p.updatedAt = stamp;
        });
    });
  }

  return (
    <div className="inline-flex items-center justify-end">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">•••</Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setViewOpen(true)}>View</DropdownMenuItem>
          <DropdownMenuItem onClick={() => setEditOpen(true)}>Edit</DropdownMenuItem>
          <DropdownMenuItem onClick={() => setPsychOpen(true)}>Psychology</DropdownMenuItem>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-red-600">
                Delete
              </DropdownMenuItem>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this trade?</AlertDialogTitle>
              </AlertDialogHeader>
              <div className="text-sm text-muted-foreground">
                This is a soft delete (it will sync to cloud).
              </div>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-red-600 hover:bg-red-700"
                  onClick={() => void softDeleteTrade()}
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </DropdownMenuContent>
      </DropdownMenu>

      <TradeViewDialog open={viewOpen} onOpenChange={setViewOpen} trade={trade} />
      <TradeFormDialog open={editOpen} onOpenChange={setEditOpen} trade={trade} />
      <PsychologyDialog open={psychOpen} onOpenChange={setPsychOpen} trade={trade} />
    </div>
  );
}
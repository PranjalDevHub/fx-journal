"use client";

import React from "react";
import { TradeFormDialog } from "@/components/trade-form-dialog";

/**
 * This file exists for backward compatibility.
 * Some parts of the app may still import AddTradeDialog, but the real
 * create/edit logic is now in TradeFormDialog (which supports workspaceId).
 *
 * We accept any extra props to avoid TypeScript errors if older code
 * passes additional fields.
 */
export type AddTradeDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  [key: string]: any;
};

export function AddTradeDialog({ open, onOpenChange }: AddTradeDialogProps) {
  return <TradeFormDialog open={open} onOpenChange={onOpenChange} />;
}

export default AddTradeDialog;
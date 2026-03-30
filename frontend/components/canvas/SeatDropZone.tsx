"use client";

import React from "react";

/**
 * SeatDropZone is a thin wrapper concept — the actual drop behavior
 * is integrated directly into SeatDot via its enhanced props.
 * This file exports utility types and helpers for seat drop handling.
 */

export interface SeatDropData {
  guestId: string;
  guestName: string;
  previousSeatId: string | null;
}

/**
 * Extract guest data from a DragEvent's dataTransfer
 */
export function extractGuestFromDrop(e: React.DragEvent): SeatDropData | null {
  const guestId = e.dataTransfer.getData("application/guest-id");
  if (!guestId) return null;

  return {
    guestId,
    guestName: e.dataTransfer.getData("application/guest-name") || "",
    previousSeatId:
      e.dataTransfer.getData("application/guest-seat-id") || null,
  };
}

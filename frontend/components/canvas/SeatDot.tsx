"use client";

import React, { useCallback, useState } from "react";
import { cn } from "@/lib/utils";

interface SeatDotProps {
  /** Seat ID for API calls */
  seatId?: string;
  /** Seat label (e.g. "1", "A") */
  label: string;
  /** Guest name if occupied */
  guestName: string | null;
  /** Whether a guest is assigned */
  isOccupied: boolean;
  /** Pixel position relative to the table container */
  x: number;
  y: number;
  /** Size of the dot in px */
  size?: number;
  /** Called when a guest is dropped on this seat */
  onGuestDrop?: (seatId: string, guestId: string, guestName: string, previousSeatId: string | null) => void;
}

/**
 * Small circle positioned around a table perimeter.
 * Empty seats have a dashed border, occupied seats are solid rose.
 * Accepts drag-and-drop of guests onto empty seats.
 */
export function SeatDot({
  seatId,
  label,
  guestName,
  isOccupied,
  x,
  y,
  size = 14,
  onGuestDrop,
}: SeatDotProps) {
  const initial = guestName ? guestName.charAt(0).toUpperCase() : "";
  const [isDragOver, setIsDragOver] = useState(false);

  const canAcceptDrop = !isOccupied && !!onGuestDrop && !!seatId;

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      if (!canAcceptDrop) return;
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = "move";
      setIsDragOver(true);
    },
    [canAcceptDrop]
  );

  const handleDragEnter = useCallback(
    (e: React.DragEvent) => {
      if (!canAcceptDrop) return;
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(true);
    },
    [canAcceptDrop]
  );

  const handleDragLeave = useCallback(
    (e: React.DragEvent) => {
      e.stopPropagation();
      setIsDragOver(false);
    },
    []
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);

      if (!canAcceptDrop || !seatId) return;

      const guestId = e.dataTransfer.getData("application/guest-id");
      if (!guestId) return;

      const droppedGuestName = e.dataTransfer.getData("application/guest-name") || "";
      const previousSeatId = e.dataTransfer.getData("application/guest-seat-id") || null;

      onGuestDrop!(seatId, guestId, droppedGuestName, previousSeatId);
    },
    [canAcceptDrop, seatId, onGuestDrop]
  );

  // Make the drop zone larger than the visual dot for easier targeting
  const dropZoneSize = Math.max(size * 2.2, 28);

  return (
    <div
      className="absolute"
      style={{
        left: `${x - dropZoneSize / 2}px`,
        top: `${y - dropZoneSize / 2}px`,
        width: `${dropZoneSize}px`,
        height: `${dropZoneSize}px`,
        zIndex: isDragOver ? 20 : 5,
      }}
      onDragOver={handleDragOver}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drop highlight ring (larger, behind the dot) */}
      {isDragOver && canAcceptDrop && (
        <div
          className="absolute rounded-full animate-pulse"
          style={{
            left: `${(dropZoneSize - size * 2) / 2}px`,
            top: `${(dropZoneSize - size * 2) / 2}px`,
            width: `${size * 2}px`,
            height: `${size * 2}px`,
            background: "radial-gradient(circle, rgba(232,180,184,0.35) 0%, transparent 70%)",
            boxShadow: "0 0 12px 4px rgba(232,180,184,0.4)",
          }}
        />
      )}

      {/* Occupied seat reject indicator */}
      {isDragOver && isOccupied && (
        <div
          className="absolute rounded-full border-2 border-red-300/60"
          style={{
            left: `${(dropZoneSize - size * 1.6) / 2}px`,
            top: `${(dropZoneSize - size * 1.6) / 2}px`,
            width: `${size * 1.6}px`,
            height: `${size * 1.6}px`,
          }}
        />
      )}

      {/* Visual seat dot */}
      <div
        className={cn(
          "absolute rounded-full flex items-center justify-center transition-[background-color,border-color,box-shadow,transform] duration-150 ease-out",
          "pointer-events-none",
          isOccupied
            ? "bg-rose-400 border-[1.5px] border-rose-500 shadow-sm"
            : isDragOver && canAcceptDrop
              ? "bg-rose-200 border-[2px] border-rose-400 shadow-md scale-125"
              : "bg-cream-50 border-[1.5px] border-dashed border-cream-300"
        )}
        style={{
          left: `${(dropZoneSize - size) / 2}px`,
          top: `${(dropZoneSize - size) / 2}px`,
          width: `${size}px`,
          height: `${size}px`,
        }}
        title={guestName || `Seat ${label}`}
      >
        {isOccupied && size >= 14 && (
          <span
            className="text-white font-medium leading-none select-none"
            style={{ fontSize: `${Math.max(7, size * 0.55)}px` }}
          >
            {initial}
          </span>
        )}
      </div>
    </div>
  );
}

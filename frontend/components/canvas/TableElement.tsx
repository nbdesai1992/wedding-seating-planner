"use client";

import React, { useCallback, useRef, useState } from "react";
import { Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { SeatDot } from "./SeatDot";
import { ResizeHandles } from "./ResizeHandle";
import { RotateHandle } from "./RotateHandle";
import { ElementToolbar } from "./ElementToolbar";
import type { Table } from "@/lib/layout";

// ── Types ──────────────────────────────────────────────────

interface TableElementProps {
  table: Table;
  zoom: number;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onUpdate: (
    id: string,
    data: Partial<Omit<Table, "id" | "seats">>
  ) => void;
  onDelete: (id: string) => void;
  /** Called when a guest is dropped on a seat in this table */
  onGuestDrop?: (seatId: string, guestId: string, guestName: string, previousSeatId: string | null) => void;
}

// ── Seat Position Helpers ──────────────────────────────────

function computeSeatPositions(
  shape: string,
  seatCount: number,
  width: number,
  height: number
): Array<{ x: number; y: number }> {
  const positions: Array<{ x: number; y: number }> = [];
  const cx = width / 2;
  const cy = height / 2;

  if (shape === "round") {
    // Evenly spaced around an ellipse
    const rx = width / 2 + 14;
    const ry = height / 2 + 14;
    for (let i = 0; i < seatCount; i++) {
      const angle = ((2 * Math.PI) / seatCount) * i - Math.PI / 2;
      positions.push({
        x: cx + rx * Math.cos(angle),
        y: cy + ry * Math.sin(angle),
      });
    }
  } else if (shape === "rectangle") {
    // Distribute seats around rectangle perimeter
    const margin = 14;
    const perimeter =
      2 * (width + 2 * margin) + 2 * (height + 2 * margin);
    const spacing = perimeter / seatCount;

    const topW = width + 2 * margin;
    const sideH = height + 2 * margin;
    const segments = [
      { dir: "right", len: topW },
      { dir: "down", len: sideH },
      { dir: "left", len: topW },
      { dir: "up", len: sideH },
    ];

    let dist = topW / 2; // Start from top-center
    for (let i = 0; i < seatCount; i++) {
      const d = (dist + spacing * i) % perimeter;
      let accumulated = 0;
      for (const seg of segments) {
        if (d < accumulated + seg.len) {
          const t = d - accumulated;
          const frac = t / seg.len;
          switch (seg.dir) {
            case "right":
              positions.push({
                x: -margin + frac * topW,
                y: -margin,
              });
              break;
            case "down":
              positions.push({
                x: width + margin,
                y: -margin + frac * sideH,
              });
              break;
            case "left":
              positions.push({
                x: width + margin - frac * topW,
                y: height + margin,
              });
              break;
            case "up":
              positions.push({
                x: -margin,
                y: height + margin - frac * sideH,
              });
              break;
          }
          break;
        }
        accumulated += seg.len;
      }
    }
  } else {
    // Sweetheart — seats evenly spaced along the flat bottom edge
    const margin = 14;
    for (let i = 0; i < seatCount; i++) {
      const spacing = width / (seatCount + 1);
      positions.push({
        x: spacing * (i + 1),
        y: height + margin,
      });
    }
  }

  return positions;
}

// ── Component ──────────────────────────────────────────────

export function TableElement({
  table,
  zoom,
  isSelected,
  onSelect,
  onUpdate,
  onDelete,
  onGuestDrop,
}: TableElementProps) {
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0, posX: 0, posY: 0 });
  const [localPos, setLocalPos] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [localSize, setLocalSize] = useState<{
    w: number;
    h: number;
  } | null>(null);
  const [localRotation, setLocalRotation] = useState<number | null>(null);

  const posX = localPos?.x ?? table.x;
  const posY = localPos?.y ?? table.y;
  const w = localSize?.w ?? table.width;
  const h = localSize?.h ?? table.height;
  const rotation = localRotation ?? table.rotation;

  const isRound = table.shape === "round";
  const isSweetheart = table.shape === "sweetheart";
  const seatedCount = table.seats.filter((s) => s.guest_id).length;
  const totalSeats = table.seats.length;
  const seatPositions = computeSeatPositions(table.shape, totalSeats, w, h);

  // ── Drag to reposition ────────────────────────────────
  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      // Don't start drag from handles
      if ((e.target as HTMLElement).closest("[data-handle]")) return;

      e.stopPropagation();
      e.preventDefault();
      onSelect(table.id);
      isDragging.current = true;
      dragStart.current = {
        x: e.clientX,
        y: e.clientY,
        posX,
        posY,
      };
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [table.id, posX, posY, onSelect]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging.current) return;
      e.stopPropagation();
      const dx = (e.clientX - dragStart.current.x) / zoom;
      const dy = (e.clientY - dragStart.current.y) / zoom;
      setLocalPos({
        x: Math.round(dragStart.current.posX + dx),
        y: Math.round(dragStart.current.posY + dy),
      });
    },
    [zoom]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging.current) return;
      isDragging.current = false;
      e.stopPropagation();
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      if (localPos) {
        onUpdate(table.id, {
          x: localPos.x,
          y: localPos.y,
        });
        setLocalPos(null);
      }
    },
    [table.id, localPos, onUpdate]
  );

  // ── Resize ────────────────────────────────────────────
  const handleResize = useCallback(
    (newW: number, newH: number, dx: number, dy: number) => {
      setLocalSize({ w: newW, h: newH });
      if (dx !== 0 || dy !== 0) {
        setLocalPos((prev) => ({
          x: (prev?.x ?? table.x) + dx,
          y: (prev?.y ?? table.y) + dy,
        }));
      }
    },
    [table.x, table.y]
  );

  const handleResizeEnd = useCallback(() => {
    const updates: Partial<Omit<Table, "id" | "seats">> = {};
    if (localSize) {
      updates.width = localSize.w;
      updates.height = localSize.h;
    }
    if (localPos) {
      updates.x = localPos.x;
      updates.y = localPos.y;
    }
    onUpdate(table.id, updates);
    setLocalSize(null);
    setLocalPos(null);
  }, [table.id, localSize, localPos, onUpdate]);

  // ── Rotate ────────────────────────────────────────────
  const handleRotate = useCallback((angle: number) => {
    setLocalRotation(angle);
  }, []);

  const handleRotateEnd = useCallback(() => {
    if (localRotation !== null) {
      onUpdate(table.id, { rotation: localRotation });
      setLocalRotation(null);
    }
  }, [table.id, localRotation, onUpdate]);

  // ── Toolbar Actions ───────────────────────────────────
  const handleRename = useCallback(
    (newName: string) => {
      onUpdate(table.id, { name: newName });
    },
    [table.id, onUpdate]
  );

  const handleChangeShape = useCallback(
    (newShape: string) => {
      onUpdate(table.id, {
        shape: newShape as Table["shape"],
      });
    },
    [table.id, onUpdate]
  );

  const handleChangeSeatCount = useCallback(
    (count: number) => {
      onUpdate(table.id, { seat_count: count });
    },
    [table.id, onUpdate]
  );

  const handleDelete = useCallback(() => {
    onDelete(table.id);
  }, [table.id, onDelete]);

  return (
    <div
      data-element-wrapper
      className={cn(
        "absolute group",
        isDragging.current ? "cursor-grabbing" : "cursor-grab"
      )}
      style={{
        left: `${posX}px`,
        top: `${posY}px`,
        width: `${w}px`,
        height: `${h}px`,
        transform: `rotate(${rotation || 0}deg)`,
        transformOrigin: "center center",
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {/* Selection ring */}
      {isSelected && (
        <div
          className={cn(
            "absolute -inset-1 border-2 border-gold-400/60 pointer-events-none",
            isRound ? "rounded-full" : isSweetheart ? "rounded-t-full rounded-b-none" : "rounded-xl"
          )}
        />
      )}

      {/* Table body */}
      <div
        className={cn(
          "w-full h-full",
          "border-2 transition-all duration-150",
          isSelected
            ? "border-rose-400 shadow-lg"
            : "border-rose-200 shadow-card group-hover:shadow-card-hover group-hover:border-rose-300",
          "bg-white/90 backdrop-blur-sm",
          isRound ? "rounded-full" : isSweetheart ? "rounded-t-full rounded-b-none" : "rounded-card"
        )}
      >
        {/* Table label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-sm font-serif font-semibold text-warm-gray-700 leading-tight truncate max-w-[90%] text-center">
            {table.name}
          </span>
          <span className="text-xs text-warm-gray-400 mt-0.5 flex items-center gap-0.5">
            <Users className="w-3 h-3" />
            {seatedCount}/{totalSeats}
          </span>
        </div>
      </div>

      {/* Seats around the table */}
      {seatPositions.map((pos, i) => {
        const seat = table.seats[i];
        if (!seat) return null;
        return (
          <SeatDot
            key={seat.id}
            seatId={seat.id}
            label={String(seat.seat_index + 1)}
            guestName={seat.guest_name}
            isOccupied={!!seat.guest_id}
            x={pos.x}
            y={pos.y}
            onGuestDrop={onGuestDrop}
          />
        );
      })}

      {/* Interactive handles — shown when selected */}
      {isSelected && (
        <>
          <ResizeHandles
            width={w}
            height={h}
            zoom={zoom}
            onResize={handleResize}
            onResizeEnd={handleResizeEnd}
            minWidth={60}
            minHeight={60}
          />
          <RotateHandle
            centerX={w / 2}
            centerY={h / 2}
            width={w}
            zoom={zoom}
            onRotate={handleRotate}
            onRotateEnd={handleRotateEnd}
          />
          <ElementToolbar
            name={table.name}
            elementType="table"
            shape={table.shape}
            seatCount={totalSeats}
            elementWidth={w}
            onRename={handleRename}
            onChangeShape={handleChangeShape}
            onChangeSeatCount={handleChangeSeatCount}
            onDelete={handleDelete}
          />
        </>
      )}
    </div>
  );
}

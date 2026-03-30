"use client";

import React, { useCallback } from "react";
import { cn } from "@/lib/utils";
import { X, Utensils, UtensilsCrossed, Leaf, Fish } from "lucide-react";

// ── Types ──────────────────────────────────────────────────

export interface DraggableGuestData {
  id: string;
  name: string;
  meal_preference: string | null;
  group_tag: string | null;
  /** The table name if seated */
  tableName?: string | null;
  /** The seat ID if seated */
  seatId?: string | null;
  /** Whether currently assigned to a seat */
  isSeated: boolean;
}

interface DraggableGuestProps {
  guest: DraggableGuestData;
  onUnassign?: (guestId: string, seatId: string) => void;
  /** Compact mode for the seated list */
  compact?: boolean;
}

// ── Meal Icon Helper ───────────────────────────────────────

function MealIcon({ preference }: { preference: string | null }) {
  if (!preference) return null;

  const lower = preference.toLowerCase();
  let Icon = Utensils;
  let color = "text-warm-gray-400";

  if (lower.includes("veg") && !lower.includes("non")) {
    Icon = Leaf;
    color = "text-emerald-500";
  } else if (lower.includes("fish") || lower.includes("seafood")) {
    Icon = Fish;
    color = "text-blue-400";
  } else if (lower.includes("kosher") || lower.includes("halal") || lower.includes("allerg")) {
    Icon = UtensilsCrossed;
    color = "text-amber-500";
  }

  return (
    <span className={cn("shrink-0", color)} title={preference}>
      <Icon className="w-3 h-3" />
    </span>
  );
}

// ── Component ──────────────────────────────────────────────

export function DraggableGuest({
  guest,
  onUnassign,
  compact = false,
}: DraggableGuestProps) {
  const handleDragStart = useCallback(
    (e: React.DragEvent) => {
      e.dataTransfer.setData("application/guest-id", guest.id);
      e.dataTransfer.setData("application/guest-name", guest.name);
      e.dataTransfer.setData(
        "application/guest-seat-id",
        guest.seatId || ""
      );
      e.dataTransfer.effectAllowed = "move";

      // Custom drag image
      const ghostEl = document.createElement("div");
      ghostEl.textContent = guest.name;
      ghostEl.style.cssText = `
        position: absolute; top: -9999px; left: -9999px;
        padding: 6px 14px;
        background: white;
        border: 1.5px solid #E8B4B8;
        border-radius: 20px;
        font-size: 12px;
        font-weight: 500;
        color: #3D3535;
        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        white-space: nowrap;
      `;
      document.body.appendChild(ghostEl);
      e.dataTransfer.setDragImage(ghostEl, ghostEl.offsetWidth / 2, 16);
      // Clean up after a frame
      requestAnimationFrame(() => {
        document.body.removeChild(ghostEl);
      });
    },
    [guest]
  );

  const handleUnassign = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      if (onUnassign && guest.seatId) {
        onUnassign(guest.id, guest.seatId);
      }
    },
    [guest.id, guest.seatId, onUnassign]
  );

  const initial = guest.name.charAt(0).toUpperCase();

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      className={cn(
        "group flex items-center gap-2 select-none",
        "cursor-grab active:cursor-grabbing transition-all duration-150",
        compact
          ? "px-2 py-1.5 rounded-md hover:bg-rose-50/60"
          : "px-3 py-2 rounded-lg border border-transparent hover:border-rose-200 hover:bg-rose-50/40 hover:shadow-sm"
      )}
    >
      {/* Avatar circle */}
      <div
        className={cn(
          "shrink-0 rounded-full flex items-center justify-center font-medium",
          guest.isSeated
            ? "bg-rose-400 text-white"
            : "bg-cream-200 text-warm-gray-600 border border-cream-300",
          compact ? "w-5 h-5 text-[9px]" : "w-7 h-7 text-[11px]"
        )}
      >
        {initial}
      </div>

      {/* Name & details */}
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            "truncate leading-tight",
            compact
              ? "text-[11px] text-warm-gray-600"
              : "text-xs font-medium text-warm-gray-700"
          )}
        >
          {guest.name}
        </p>
        {!compact && guest.tableName && (
          <p className="text-[10px] text-warm-gray-400 truncate leading-tight mt-0.5">
            {guest.tableName}
          </p>
        )}
      </div>

      {/* Badges / icons */}
      <div className="flex items-center gap-1 shrink-0">
        {!compact && guest.group_tag && (
          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-gold-400/15 text-gold-600 font-medium tracking-wide truncate max-w-[60px]">
            {guest.group_tag}
          </span>
        )}
        {!compact && <MealIcon preference={guest.meal_preference} />}

        {/* Unassign button for seated guests */}
        {guest.isSeated && onUnassign && (
          <button
            onClick={handleUnassign}
            className={cn(
              "shrink-0 rounded-full flex items-center justify-center",
              "text-warm-gray-300 hover:text-rose-500 hover:bg-rose-100 transition-colors",
              compact ? "w-4 h-4" : "w-5 h-5",
              "opacity-0 group-hover:opacity-100"
            )}
            title="Remove from seat"
          >
            <X className={compact ? "w-2.5 h-2.5" : "w-3 h-3"} />
          </button>
        )}
      </div>
    </div>
  );
}

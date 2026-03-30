"use client";

import React, { useCallback, useMemo, useState } from "react";
import {
  Check,
  X,
  CheckCheck,
  XCircle,
  Sparkles,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  applySeating,
  assignSeat,
  type Layout,
  type SeatingSuggestion,
  type SeatingAssignment,
} from "@/lib/layout";

// ── Types ──────────────────────────────────────────────────

interface SuggestionOverlayProps {
  eventId: string;
  suggestion: SeatingSuggestion;
  layout: Layout;
  onApplied: (updatedLayout: Layout) => void;
  onDismiss: () => void;
}

interface AssignmentItem extends SeatingAssignment {
  guest_name: string;
  table_name: string;
  seat_label: string;
  status: "pending" | "accepted" | "rejected";
}

// ── Helpers ────────────────────────────────────────────────

function buildAssignmentItems(
  suggestion: SeatingSuggestion,
  layout: Layout
): AssignmentItem[] {
  return suggestion.assignments.map((a) => {
    // Find the seat and table info from layout
    let guestName = "Unknown Guest";
    let tableName = "Unknown Table";
    let seatLabel = "";

    for (const table of layout.tables) {
      for (const seat of table.seats) {
        if (seat.id === a.seat_id) {
          tableName = table.name;
          seatLabel = `Seat ${seat.seat_index + 1}`;
        }
        if (seat.guest_id === a.guest_id && seat.guest_name) {
          guestName = seat.guest_name;
        }
      }
    }

    // If we couldn't find a name from seat data, use guest_id as fallback
    if (guestName === "Unknown Guest") {
      guestName = `Guest ${a.guest_id.slice(0, 8)}`;
    }

    return {
      ...a,
      guest_name: guestName,
      table_name: tableName,
      seat_label: seatLabel,
      status: "pending" as const,
    };
  });
}

// ── Component ──────────────────────────────────────────────

export function SuggestionOverlay({
  eventId,
  suggestion,
  layout,
  onApplied,
  onDismiss,
}: SuggestionOverlayProps) {
  const [items, setItems] = useState<AssignmentItem[]>(() =>
    buildAssignmentItems(suggestion, layout)
  );
  const [isApplying, setIsApplying] = useState(false);
  const [showReasoning, setShowReasoning] = useState(false);

  // ── Counts ────────────────────────────────────────────────
  const counts = useMemo(() => {
    const pending = items.filter((i) => i.status === "pending").length;
    const accepted = items.filter((i) => i.status === "accepted").length;
    const rejected = items.filter((i) => i.status === "rejected").length;
    return { pending, accepted, rejected, total: items.length };
  }, [items]);

  // ── Actions ───────────────────────────────────────────────
  const setItemStatus = useCallback(
    (seatId: string, status: "pending" | "accepted" | "rejected") => {
      setItems((prev) =>
        prev.map((item) =>
          item.seat_id === seatId ? { ...item, status } : item
        )
      );
    },
    []
  );

  const acceptAll = useCallback(() => {
    setItems((prev) =>
      prev.map((item) =>
        item.status !== "rejected" ? { ...item, status: "accepted" } : item
      )
    );
  }, []);

  const rejectAll = useCallback(() => {
    setItems((prev) => prev.map((item) => ({ ...item, status: "rejected" })));
  }, []);

  const resetAll = useCallback(() => {
    setItems((prev) => prev.map((item) => ({ ...item, status: "pending" })));
  }, []);

  // ── Apply accepted assignments ────────────────────────────
  const handleApply = useCallback(async () => {
    const toApply = items.filter(
      (i) => i.status === "accepted" || i.status === "pending"
    );

    if (toApply.length === 0) {
      onDismiss();
      return;
    }

    setIsApplying(true);

    try {
      // Build a layout preview with assignments applied
      const updatedLayout = structuredClone(layout);

      const assignments: SeatingAssignment[] = toApply.map((i) => ({
        seat_id: i.seat_id,
        guest_id: i.guest_id,
      }));

      // Apply to backend
      await applySeating(eventId, assignments);

      // Update local layout state
      for (const assignment of toApply) {
        for (const table of updatedLayout.tables) {
          for (const seat of table.seats) {
            if (seat.id === assignment.seat_id) {
              seat.guest_id = assignment.guest_id;
              seat.guest_name = assignment.guest_name;
            }
          }
        }
      }

      onApplied(updatedLayout);
    } catch (err) {
      console.error("Failed to apply seating suggestions:", err);
      // Don't dismiss — let user retry
      setIsApplying(false);
    }
  }, [items, layout, eventId, onApplied, onDismiss]);

  // ── Group items by table ──────────────────────────────────
  const groupedByTable = useMemo(() => {
    const groups = new Map<string, AssignmentItem[]>();
    for (const item of items) {
      const group = groups.get(item.table_name) || [];
      group.push(item);
      groups.set(item.table_name, group);
    }
    return groups;
  }, [items]);

  return (
    <div className="absolute left-0 top-0 bottom-0 z-30 flex">
      {/* Side panel */}
      <div
        className={cn(
          "w-80 bg-white/98 backdrop-blur-sm",
          "border-r border-cream-200",
          "shadow-[4px_0_16px_rgba(0,0,0,0.06)]",
          "flex flex-col",
          "animate-fade-in"
        )}
      >
        {/* Header */}
        <div className="px-4 pt-4 pb-3 border-b border-cream-100">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-100 to-amber-200 flex items-center justify-center">
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              </div>
              <div>
                <h4 className="text-sm font-serif font-semibold text-warm-gray-700">
                  AI Suggestions
                </h4>
                <p className="text-[10px] text-warm-gray-400">
                  Review and accept seat assignments
                </p>
              </div>
            </div>
            <button
              onClick={onDismiss}
              disabled={isApplying}
              className="p-1 rounded-md hover:bg-cream-100 text-warm-gray-400 hover:text-warm-gray-600 transition-colors"
              title="Dismiss suggestions"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Status summary */}
          <div className="flex items-center gap-3 text-[10px] mt-2">
            <span className="text-warm-gray-400">
              {counts.total} suggestions
            </span>
            {counts.accepted > 0 && (
              <span className="text-emerald-600 font-medium flex items-center gap-0.5">
                <Check className="w-3 h-3" />
                {counts.accepted}
              </span>
            )}
            {counts.rejected > 0 && (
              <span className="text-rose-500 font-medium flex items-center gap-0.5">
                <X className="w-3 h-3" />
                {counts.rejected}
              </span>
            )}
            {counts.pending > 0 && (
              <span className="text-amber-500 font-medium">
                {counts.pending} pending
              </span>
            )}
          </div>

          {/* Thin gold divider */}
          <div className="mt-3 h-px bg-gradient-to-r from-transparent via-gold-400/40 to-transparent" />
        </div>

        {/* Bulk actions */}
        <div className="px-4 py-2.5 border-b border-cream-50 flex gap-2">
          <button
            onClick={acceptAll}
            disabled={isApplying}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5",
              "px-3 py-1.5 rounded-lg text-[11px] font-medium",
              "bg-emerald-50 text-emerald-700 border border-emerald-200",
              "hover:bg-emerald-100 transition-colors",
              isApplying && "opacity-50 cursor-not-allowed"
            )}
          >
            <CheckCheck className="w-3 h-3" />
            Accept All
          </button>
          <button
            onClick={rejectAll}
            disabled={isApplying}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5",
              "px-3 py-1.5 rounded-lg text-[11px] font-medium",
              "bg-rose-50 text-rose-600 border border-rose-200",
              "hover:bg-rose-100 transition-colors",
              isApplying && "opacity-50 cursor-not-allowed"
            )}
          >
            <XCircle className="w-3 h-3" />
            Reject All
          </button>
          {(counts.accepted > 0 || counts.rejected > 0) && (
            <button
              onClick={resetAll}
              disabled={isApplying}
              className={cn(
                "px-2 py-1.5 rounded-lg text-[11px]",
                "text-warm-gray-400 hover:text-warm-gray-600",
                "hover:bg-cream-100 transition-colors",
                isApplying && "opacity-50 cursor-not-allowed"
              )}
              title="Reset all"
            >
              Reset
            </button>
          )}
        </div>

        {/* Suggestion list — scrollable */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {Array.from(groupedByTable.entries()).map(
            ([tableName, tableItems]) => (
              <div key={tableName} className="border-b border-cream-50 last:border-b-0">
                {/* Table group header */}
                <div className="px-4 py-2 bg-cream-50/50">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-warm-gray-400">
                    {tableName}
                  </span>
                  <span className="text-[10px] text-warm-gray-300 ml-1.5">
                    ({tableItems.length})
                  </span>
                </div>

                {/* Individual assignments */}
                {tableItems.map((item) => (
                  <div
                    key={item.seat_id}
                    className={cn(
                      "flex items-center gap-3 px-4 py-2.5",
                      "border-b border-cream-50/80 last:border-b-0",
                      "transition-all duration-200",
                      item.status === "accepted" && "bg-emerald-50/40",
                      item.status === "rejected" &&
                        "bg-rose-50/30 opacity-60"
                    )}
                  >
                    {/* Guest info */}
                    <div className="flex-1 min-w-0">
                      <p
                        className={cn(
                          "text-xs font-medium truncate",
                          item.status === "rejected"
                            ? "text-warm-gray-400 line-through"
                            : "text-warm-gray-700"
                        )}
                      >
                        {item.guest_name}
                      </p>
                      <p className="text-[10px] text-warm-gray-400">
                        {item.seat_label}
                      </p>
                    </div>

                    {/* Accept/Reject buttons */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() =>
                          setItemStatus(
                            item.seat_id,
                            item.status === "accepted"
                              ? "pending"
                              : "accepted"
                          )
                        }
                        disabled={isApplying}
                        className={cn(
                          "w-6 h-6 rounded-md flex items-center justify-center",
                          "transition-all duration-150",
                          item.status === "accepted"
                            ? "bg-emerald-500 text-white shadow-sm"
                            : "bg-cream-100 text-warm-gray-400 hover:bg-emerald-100 hover:text-emerald-600"
                        )}
                        title="Accept"
                      >
                        <Check className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() =>
                          setItemStatus(
                            item.seat_id,
                            item.status === "rejected"
                              ? "pending"
                              : "rejected"
                          )
                        }
                        disabled={isApplying}
                        className={cn(
                          "w-6 h-6 rounded-md flex items-center justify-center",
                          "transition-all duration-150",
                          item.status === "rejected"
                            ? "bg-rose-500 text-white shadow-sm"
                            : "bg-cream-100 text-warm-gray-400 hover:bg-rose-100 hover:text-rose-600"
                        )}
                        title="Reject"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {items.length === 0 && (
            <div className="text-center py-12 px-6">
              <AlertTriangle className="w-8 h-8 text-cream-300 mx-auto mb-2" />
              <p className="text-xs text-warm-gray-400">
                No suggestions were generated.
              </p>
              <p className="text-[10px] text-warm-gray-300 mt-1">
                Try adding guests and tables first.
              </p>
            </div>
          )}
        </div>

        {/* Reasoning section (collapsible) */}
        {suggestion.reasoning && (
          <div className="border-t border-cream-100">
            <button
              onClick={() => setShowReasoning(!showReasoning)}
              className={cn(
                "w-full flex items-center gap-2 px-4 py-2.5",
                "text-[11px] text-warm-gray-500 hover:text-warm-gray-700",
                "hover:bg-cream-50 transition-colors"
              )}
            >
              {showReasoning ? (
                <ChevronDown className="w-3 h-3" />
              ) : (
                <ChevronRight className="w-3 h-3" />
              )}
              <Sparkles className="w-3 h-3 text-amber-500" />
              <span className="font-medium">AI Reasoning</span>
            </button>
            {showReasoning && (
              <div className="px-4 pb-3">
                <p className="text-[11px] text-warm-gray-500 leading-relaxed bg-cream-50 rounded-lg p-3 border border-cream-100">
                  {suggestion.reasoning}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Footer: Apply button */}
        <div className="px-4 py-3 border-t border-cream-200 bg-cream-50/50">
          <button
            onClick={handleApply}
            disabled={isApplying || counts.total === counts.rejected}
            className={cn(
              "w-full flex items-center justify-center gap-2",
              "px-4 py-2.5 rounded-lg text-xs font-medium",
              "transition-all duration-200",
              isApplying
                ? "bg-rose-300 text-white cursor-wait"
                : counts.total === counts.rejected
                ? "bg-cream-200 text-warm-gray-400 cursor-not-allowed"
                : [
                    "bg-gradient-to-b from-rose-400 to-rose-500 text-white",
                    "hover:from-rose-500 hover:to-rose-600",
                    "shadow-sm hover:shadow-md",
                  ]
            )}
          >
            {isApplying ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                <span>Applying...</span>
              </>
            ) : (
              <>
                <CheckCheck className="w-3.5 h-3.5" />
                <span>
                  Apply{" "}
                  {counts.total - counts.rejected > 0
                    ? `${counts.total - counts.rejected} Assignments`
                    : "Assignments"}
                </span>
              </>
            )}
          </button>
          <button
            onClick={onDismiss}
            disabled={isApplying}
            className={cn(
              "w-full mt-2 flex items-center justify-center",
              "px-4 py-2 rounded-lg text-xs",
              "text-warm-gray-400 hover:text-warm-gray-600",
              "hover:bg-cream-100 transition-colors"
            )}
          >
            Dismiss without applying
          </button>
        </div>
      </div>
    </div>
  );
}

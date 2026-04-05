"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Search,
  ChevronRight,
  ChevronDown,
  Users,
  PanelRightClose,
  PanelRightOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getGuests, type Guest } from "@/lib/guests";
import { unassignSeat, type Layout } from "@/lib/layout";
import { DraggableGuest, type DraggableGuestData } from "./DraggableGuest";

// ── Types ──────────────────────────────────────────────────

interface GuestSidebarProps {
  eventId: string;
  layout: Layout | null;
  onLayoutUpdate: (layout: Layout) => void;
}

// ── Component ──────────────────────────────────────────────

export function GuestSidebar({
  eventId,
  layout,
  onLayoutUpdate,
}: GuestSidebarProps) {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedTables, setExpandedTables] = useState<Set<string>>(
    new Set()
  );
  const [isDragOverSidebar, setIsDragOverSidebar] = useState(false);

  // ── Fetch guests ─────────────────────────────────────────
  useEffect(() => {
    async function loadGuests() {
      try {
        const data = await getGuests(eventId);
        setGuests(data);
      } catch (err) {
        console.error("Failed to load guests:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadGuests();
  }, [eventId]);

  // ── Build guest-to-seat mapping from layout ──────────────
  const seatMap = useMemo(() => {
    const map = new Map<
      string,
      { seatId: string; tableName: string; tableId: string }
    >();
    if (!layout) return map;

    for (const table of layout.tables) {
      for (const seat of table.seats) {
        if (seat.guest_id) {
          map.set(seat.guest_id, {
            seatId: seat.id,
            tableName: table.name,
            tableId: table.id,
          });
        }
      }
    }
    return map;
  }, [layout]);

  // ── Split guests into seated / unseated ──────────────────
  const { unseatedGuests, seatedByTable, totalSeated } = useMemo(() => {
    const unseated: DraggableGuestData[] = [];
    const byTable = new Map<
      string,
      { tableName: string; guests: DraggableGuestData[] }
    >();
    let seated = 0;

    const lowerSearch = searchQuery.toLowerCase().trim();

    for (const g of guests) {
      // Apply search filter
      if (lowerSearch) {
        const matchesName = g.name.toLowerCase().includes(lowerSearch);
        const matchesGroup = g.group_tag
          ?.toLowerCase()
          .includes(lowerSearch);
        const matchesMeal = g.meal_preference
          ?.toLowerCase()
          .includes(lowerSearch);
        if (!matchesName && !matchesGroup && !matchesMeal) continue;
      }

      const seatInfo = seatMap.get(g.id);

      const guestData: DraggableGuestData = {
        id: g.id,
        name: g.name,
        meal_preference: g.meal_preference,
        group_tag: g.group_tag,
        tableName: seatInfo?.tableName || null,
        seatId: seatInfo?.seatId || null,
        isSeated: !!seatInfo,
      };

      if (seatInfo) {
        seated++;
        const tableGroup = byTable.get(seatInfo.tableId) || {
          tableName: seatInfo.tableName,
          guests: [],
        };
        tableGroup.guests.push(guestData);
        byTable.set(seatInfo.tableId, tableGroup);
      } else {
        unseated.push(guestData);
      }
    }

    return {
      unseatedGuests: unseated,
      seatedByTable: byTable,
      totalSeated: seated,
    };
  }, [guests, seatMap, searchQuery]);

  // ── Unassign guest from seat ─────────────────────────────
  const handleUnassignGuest = useCallback(
    async (guestId: string, seatId: string) => {
      if (!layout) return;

      // Optimistic update
      const updatedLayout = structuredClone(layout);
      for (const table of updatedLayout.tables) {
        for (const seat of table.seats) {
          if (seat.id === seatId) {
            seat.guest_id = null;
            seat.guest_name = null;
          }
        }
      }
      onLayoutUpdate(updatedLayout);

      try {
        await unassignSeat(eventId, seatId);
      } catch (err) {
        console.error("Failed to unassign guest:", err);
        // Revert on error
        onLayoutUpdate(layout);
      }
    },
    [eventId, layout, onLayoutUpdate]
  );

  // ── Sidebar drop zone (drag guest back to unassign) ──────
  const handleSidebarDragOver = useCallback((e: React.DragEvent) => {
    const hasSeatId = e.dataTransfer.types.includes(
      "application/guest-seat-id"
    );
    if (!hasSeatId) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setIsDragOverSidebar(true);
  }, []);

  const handleSidebarDragLeave = useCallback(() => {
    setIsDragOverSidebar(false);
  }, []);

  const handleSidebarDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOverSidebar(false);

      const guestId = e.dataTransfer.getData("application/guest-id");
      const seatId = e.dataTransfer.getData("application/guest-seat-id");

      if (guestId && seatId) {
        handleUnassignGuest(guestId, seatId);
      }
    },
    [handleUnassignGuest]
  );

  // ── Toggle table group ───────────────────────────────────
  const toggleTable = useCallback((tableId: string) => {
    setExpandedTables((prev) => {
      const next = new Set(prev);
      if (next.has(tableId)) {
        next.delete(tableId);
      } else {
        next.add(tableId);
      }
      return next;
    });
  }, []);

  // ── Collapsed state ──────────────────────────────────────
  if (isCollapsed) {
    return (
      <div className="absolute right-0 top-0 bottom-0 z-20 flex items-start pt-4 pr-2">
        <button
          onClick={() => setIsCollapsed(false)}
          className={cn(
            "flex items-center gap-1.5 px-2.5 py-2 rounded-l-lg",
            "bg-white/95 backdrop-blur-sm border border-r-0 border-cream-200",
            "text-warm-gray-500 hover:text-warm-gray-700 hover:bg-cream-50",
            "shadow-card transition-all duration-200"
          )}
          title="Show guest panel"
        >
          <PanelRightOpen className="w-4 h-4" />
          <span className="text-[10px] font-medium writing-mode-vertical">
            Guests
          </span>
          <span className="text-[9px] bg-rose-100 text-rose-600 px-1 py-0.5 rounded-full font-medium">
            {totalSeated}/{guests.length}
          </span>
        </button>
      </div>
    );
  }

  // ── Full sidebar ─────────────────────────────────────────
  return (
    <div
      className={cn(
        "absolute right-0 top-0 bottom-0 z-20",
        "w-72 bg-white/97 backdrop-blur-sm",
        "border-l border-cream-200 shadow-[-4px_0_16px_rgba(0,0,0,0.04)]",
        "flex flex-col",
        "transition-all duration-300",
        isDragOverSidebar && "ring-2 ring-inset ring-rose-300 bg-rose-50/30"
      )}
      onDragOver={handleSidebarDragOver}
      onDragLeave={handleSidebarDragLeave}
      onDrop={handleSidebarDrop}
    >
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-cream-100">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-rose-400" />
            <h3 className="text-sm font-serif font-semibold text-warm-gray-700">
              Guests
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-medium text-warm-gray-400">
              <span className="text-rose-500">{totalSeated}</span>
              <span className="mx-0.5">of</span>
              <span>{guests.length}</span>
              <span className="ml-0.5">seated</span>
            </span>
            <button
              onClick={() => setIsCollapsed(true)}
              className="p-1 rounded hover:bg-cream-100 text-warm-gray-400 hover:text-warm-gray-600 transition-colors"
              title="Hide guest panel"
            >
              <PanelRightClose className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-warm-gray-300" />
          <input
            type="text"
            placeholder="Search guests..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={cn(
              "w-full pl-8 pr-3 py-1.5 text-xs",
              "bg-cream-50 border border-cream-200 rounded-lg",
              "text-warm-gray-700 placeholder:text-warm-gray-300",
              "focus:outline-none focus:border-rose-300 focus:ring-1 focus:ring-rose-200",
              "transition-all duration-150"
            )}
          />
        </div>

        {/* Progress bar */}
        <div className="mt-2.5 h-1.5 bg-cream-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-rose-300 to-rose-400 rounded-full transition-all duration-500 ease-out"
            style={{
              width: `${
                guests.length > 0
                  ? (totalSeated / guests.length) * 100
                  : 0
              }%`,
            }}
          />
        </div>
      </div>

      {/* Guest list — scrollable */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden overscroll-contain">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin h-5 w-5 border-2 border-rose-400 border-t-transparent rounded-full" />
          </div>
        ) : guests.length === 0 ? (
          <div className="text-center py-12 px-6">
            <Users className="w-8 h-8 text-cream-300 mx-auto mb-2" />
            <p className="text-xs text-warm-gray-400">
              No guests added yet.
            </p>
            <p className="text-[10px] text-warm-gray-300 mt-1">
              Add guests from the Guest List page first.
            </p>
          </div>
        ) : (
          <>
            {/* Unseated section */}
            {unseatedGuests.length > 0 && (
              <div className="px-2 pt-3 pb-1">
                <div className="px-2 mb-1.5 flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-cream-300" />
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-warm-gray-400">
                    Unseated
                  </span>
                  <span className="text-[10px] text-warm-gray-300 ml-auto">
                    {unseatedGuests.length}
                  </span>
                </div>
                <div className="space-y-0.5">
                  {unseatedGuests.map((g) => (
                    <DraggableGuest key={g.id} guest={g} />
                  ))}
                </div>
              </div>
            )}

            {/* Divider between sections */}
            {unseatedGuests.length > 0 && seatedByTable.size > 0 && (
              <div className="mx-4 my-2 border-t border-cream-100" />
            )}

            {/* Seated section (grouped by table) */}
            {seatedByTable.size > 0 && (
              <div className="px-2 pt-1 pb-3">
                <div className="px-2 mb-1.5 flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-warm-gray-400">
                    Seated
                  </span>
                  <span className="text-[10px] text-warm-gray-300 ml-auto">
                    {totalSeated}
                  </span>
                </div>

                {Array.from(seatedByTable.entries()).map(
                  ([tableId, { tableName, guests: tableGuests }]) => {
                    const isExpanded = expandedTables.has(tableId);
                    return (
                      <div key={tableId} className="mb-0.5">
                        <button
                          onClick={() => toggleTable(tableId)}
                          className={cn(
                            "w-full flex items-center gap-1.5 px-2 py-1.5",
                            "text-[11px] text-warm-gray-500 hover:text-warm-gray-700",
                            "rounded-md hover:bg-cream-50 transition-colors"
                          )}
                        >
                          {isExpanded ? (
                            <ChevronDown className="w-3 h-3 shrink-0" />
                          ) : (
                            <ChevronRight className="w-3 h-3 shrink-0" />
                          )}
                          <span className="font-medium truncate">
                            {tableName}
                          </span>
                          <span className="text-[10px] text-warm-gray-300 ml-auto shrink-0">
                            {tableGuests.length}
                          </span>
                        </button>

                        {isExpanded && (
                          <div className="ml-2 space-y-0">
                            {tableGuests.map((g) => (
                              <DraggableGuest
                                key={g.id}
                                guest={g}
                                onUnassign={handleUnassignGuest}
                                compact
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  }
                )}
              </div>
            )}

            {/* No results from search */}
            {searchQuery &&
              unseatedGuests.length === 0 &&
              seatedByTable.size === 0 && (
                <div className="text-center py-8 px-6">
                  <Search className="w-6 h-6 text-cream-300 mx-auto mb-2" />
                  <p className="text-xs text-warm-gray-400">
                    No guests match &ldquo;{searchQuery}&rdquo;
                  </p>
                </div>
              )}
          </>
        )}
      </div>

      {/* Drop hint when dragging seated guest back */}
      {isDragOverSidebar && (
        <div className="absolute inset-x-4 bottom-4 py-3 rounded-lg bg-rose-100/80 border border-rose-200 text-center pointer-events-none">
          <p className="text-xs font-medium text-rose-600">
            Drop here to unassign
          </p>
        </div>
      )}
    </div>
  );
}


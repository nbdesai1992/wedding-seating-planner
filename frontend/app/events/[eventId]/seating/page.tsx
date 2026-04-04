"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Canvas,
  ZoomControls,
  PromptBar,
  TableElement,
  FeatureElement,
  GuestSidebar,
  SeatingAI,
  SuggestionOverlay,
  ExportButton,
  CreationToolbar,
  type CanvasTransform,
  type TableDefaults,
  type FeatureDefaults,
} from "@/components/canvas";
import {
  getLayout,
  generateLayout,
  modifyLayout,
  createTable,
  updateTable,
  deleteTable,
  createFeature,
  updateFeature,
  deleteFeature,
  assignSeat,
  unassignSeat,
  type Layout,
  type Table,
  type Feature,
  type SeatingSuggestion,
} from "@/lib/layout";
import { AlertCircle, Users, Sparkles, ArrowRight } from "lucide-react";
import { getGuests } from "@/lib/guests";

// ── Example Prompts ────────────────────────────────────────

const EXAMPLE_PROMPTS = [
  "A ballroom with 8 round tables, a dance floor in the center, and a head table at the front",
  "An outdoor garden reception with 6 rectangular farm tables in two rows and a stage area",
  "An intimate dinner with 4 round tables of 10 and a sweetheart table for the couple",
  "A banquet hall with 12 round tables, a DJ booth, a bar, and a photo booth near the entrance",
];

// ── Empty State ────────────────────────────────────────────

function EmptyCanvas({
  guestCount,
  eventId,
  onPromptClick,
}: {
  guestCount: number;
  eventId: string;
  onPromptClick: (prompt: string) => void;
}) {
  const router = useRouter();

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      <div className="text-center max-w-lg px-8 pointer-events-auto">
        <div className="w-16 h-16 rounded-full bg-cream-100 border border-cream-200 mx-auto mb-4 flex items-center justify-center">
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-gold-400"
          >
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" />
          </svg>
        </div>
        <h3 className="font-serif text-lg text-warm-gray-700 mb-2">
          Design Your Seating Layout
        </h3>
        <p className="text-sm text-warm-gray-400 leading-relaxed mb-5">
          Describe your venue in the prompt bar, use the toolbar to add
          elements manually, or pick an example to get started:
        </p>

        {/* No-guests warning */}
        {guestCount === 0 && (
          <div className="mb-5 mx-auto max-w-md flex items-center gap-3 px-4 py-3 rounded-card bg-amber-50 border border-amber-200">
            <Users className="w-4 h-4 text-amber-500 shrink-0" />
            <div className="text-left">
              <p className="text-xs font-medium text-amber-700">
                No guests added yet
              </p>
              <p className="text-[11px] text-amber-600/80 mt-0.5">
                Add guests first so you can assign them to seats later.
              </p>
            </div>
            <button
              onClick={() =>
                router.push(`/events/${eventId}/guests`)
              }
              className="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 text-[11px] font-medium text-amber-700 bg-amber-100 hover:bg-amber-200 rounded-soft transition-colors"
            >
              Add Guests
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Clickable example prompts */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-5">
          {EXAMPLE_PROMPTS.map((prompt, i) => (
            <button
              key={i}
              onClick={() => onPromptClick(prompt)}
              className="group text-left px-3.5 py-2.5 rounded-card border border-cream-200 bg-white/80 hover:border-gold-400/40 hover:shadow-card transition-all duration-200"
            >
              <div className="flex items-start gap-2">
                <Sparkles className="w-3 h-3 text-gold-400 mt-0.5 shrink-0 group-hover:text-gold-500 transition-colors" />
                <span className="text-xs text-warm-gray-500 leading-relaxed group-hover:text-warm-gray-700 transition-colors line-clamp-2">
                  {prompt}
                </span>
              </div>
            </button>
          ))}
        </div>

        {/* Tip */}
        <p className="text-[11px] text-warm-gray-400 leading-relaxed max-w-sm mx-auto">
          Tip: Add your guests from the Guests tab first, then come back here to
          assign them to seats.
        </p>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────

export default function SeatingPage() {
  const params = useParams();
  const eventId = params.eventId as string;

  const [layout, setLayout] = useState<Layout | null>(null);
  const [isLoadingLayout, setIsLoadingLayout] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [guestCount, setGuestCount] = useState<number>(0);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(
    null
  );

  const [activeSuggestion, setActiveSuggestion] =
    useState<SeatingSuggestion | null>(null);

  const [transform, setTransform] = useState<CanvasTransform>({
    zoom: 0.7,
    panX: 60,
    panY: 60,
  });

  // ── Load layout + guest count on mount ─────────────────
  useEffect(() => {
    async function load() {
      try {
        const data = await getLayout(eventId);
        setLayout(data);
      } catch {
        // No layout yet — that's fine
        setLayout(null);
      } finally {
        setIsLoadingLayout(false);
      }
    }
    async function loadGuestCount() {
      try {
        const guests = await getGuests(eventId);
        setGuestCount(guests.length);
      } catch {
        // Non-critical, default 0
      }
    }
    load();
    loadGuestCount();
  }, [eventId]);

  // ── Generate layout from prompt ───────────────────────
  const handleGenerate = useCallback(
    async (description: string) => {
      setIsGenerating(true);
      setError(null);
      setSelectedElementId(null);
      try {
        const data = await generateLayout(eventId, description);
        setLayout(data);
        setTransform({ zoom: 0.65, panX: 80, panY: 80 });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to generate layout";
        setError(message);
      } finally {
        setIsGenerating(false);
      }
    },
    [eventId]
  );

  // ── Modify existing layout via prompt ─────────────────
  const handleModify = useCallback(
    async (prompt: string) => {
      setIsGenerating(true);
      setError(null);
      setSelectedElementId(null);
      // Save current transform to preserve zoom/pan
      const savedTransform = { ...transform };
      try {
        const data = await modifyLayout(eventId, prompt);
        setLayout(data);
        // Preserve zoom/pan state during modification
        setTransform(savedTransform);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to modify layout";
        setError(message);
        // Layout stays as-is on error — user doesn't lose their work
      } finally {
        setIsGenerating(false);
      }
    },
    [eventId, transform]
  );

  // ── Example prompt click → generate directly ──────────
  const handleExamplePromptClick = useCallback(
    (prompt: string) => {
      handleGenerate(prompt);
    },
    [handleGenerate]
  );

  // ── Ref for viewport-center calculation ───────────────
  const canvasContainerRef = useRef<HTMLDivElement>(null);

  function getViewportCenter(): { x: number; y: number } {
    const rect = canvasContainerRef.current?.getBoundingClientRect();
    const w = rect?.width ?? 800;
    const h = rect?.height ?? 600;
    return {
      x: (w / 2 - transform.panX) / transform.zoom,
      y: (h / 2 - transform.panY) / transform.zoom,
    };
  }

  // ── Manual table creation ─────────────────────────────
  const handleCreateTable = useCallback(
    async (shape: string, defaults: TableDefaults) => {
      const center = getViewportCenter();

      // Auto-name: "Table N" avoiding collisions
      const existingNums = (layout?.tables || []).map((t) => {
        const m = t.name.match(/^Table (\d+)$/);
        return m ? parseInt(m[1]) : 0;
      });
      const nextNum =
        existingNums.length > 0 ? Math.max(...existingNums) + 1 : 1;

      try {
        const table = await createTable(eventId, {
          name: `Table ${nextNum}`,
          shape: shape as Table["shape"],
          x: Math.round(center.x - defaults.width / 2),
          y: Math.round(center.y - defaults.height / 2),
          width: defaults.width,
          height: defaults.height,
          seat_count: defaults.seatCount,
        });
        setLayout((prev) => {
          if (!prev) {
            // First element on a blank layout — wrap in a layout shell
            return {
              id: table.layout_id,
              event_id: eventId,
              canvas_width: 2000,
              canvas_height: 1500,
              tables: [table],
              features: [],
            };
          }
          return { ...prev, tables: [...prev.tables, table] };
        });
        setSelectedElementId(table.id);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to create table"
        );
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [eventId, layout, transform]
  );

  // ── Manual feature creation ───────────────────────────
  const handleCreateFeature = useCallback(
    async (type: string, defaults: FeatureDefaults) => {
      const center = getViewportCenter();

      // Auto-name from type label
      const typeLabels: Record<string, string> = {
        dance_floor: "Dance Floor",
        bar: "Bar",
        cake_table: "Cake Table",
        stage: "Stage",
        custom: "Feature",
      };
      const label = typeLabels[type] || "Feature";

      // Avoid duplicate names
      const existingOfType = (layout?.features || []).filter(
        (f) => f.type === type
      );
      const name =
        existingOfType.length === 0
          ? label
          : `${label} ${existingOfType.length + 1}`;

      try {
        const feature = await createFeature(eventId, {
          name,
          type,
          shape: "rectangle",
          x: Math.round(center.x - defaults.width / 2),
          y: Math.round(center.y - defaults.height / 2),
          width: defaults.width,
          height: defaults.height,
        });
        setLayout((prev) => {
          if (!prev) {
            return {
              id: feature.layout_id,
              event_id: eventId,
              canvas_width: 2000,
              canvas_height: 1500,
              tables: [],
              features: [feature],
            };
          }
          return { ...prev, features: [...prev.features, feature] };
        });
        setSelectedElementId(feature.id);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to create feature"
        );
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [eventId, layout, transform]
  );

  // ── Canvas click (deselect) ───────────────────────────
  const handleCanvasClick = useCallback(() => {
    setSelectedElementId(null);
  }, []);

  // ── Table interactions ────────────────────────────────
  const handleSelectElement = useCallback((id: string) => {
    setSelectedElementId(id);
  }, []);

  const handleUpdateTable = useCallback(
    async (tableId: string, data: Partial<Omit<Table, "id" | "seats">>) => {
      try {
        const updated = await updateTable(eventId, tableId, data);
        setLayout((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            tables: prev.tables.map((t) =>
              t.id === tableId ? { ...t, ...updated } : t
            ),
          };
        });
      } catch (err) {
        console.error("Failed to update table:", err);
      }
    },
    [eventId]
  );

  const handleDeleteTable = useCallback(
    async (tableId: string) => {
      try {
        await deleteTable(eventId, tableId);
        setLayout((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            tables: prev.tables.filter((t) => t.id !== tableId),
          };
        });
        setSelectedElementId(null);
      } catch (err) {
        console.error("Failed to delete table:", err);
      }
    },
    [eventId]
  );

  // ── Feature interactions ──────────────────────────────
  const handleUpdateFeature = useCallback(
    async (featureId: string, data: Partial<Omit<Feature, "id">>) => {
      try {
        const updated = await updateFeature(eventId, featureId, data);
        setLayout((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            features: prev.features.map((f) =>
              f.id === featureId ? { ...f, ...updated } : f
            ),
          };
        });
      } catch (err) {
        console.error("Failed to update feature:", err);
      }
    },
    [eventId]
  );

  const handleDeleteFeature = useCallback(
    async (featureId: string) => {
      try {
        await deleteFeature(eventId, featureId);
        setLayout((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            features: prev.features.filter((f) => f.id !== featureId),
          };
        });
        setSelectedElementId(null);
      } catch (err) {
        console.error("Failed to delete feature:", err);
      }
    },
    [eventId]
  );

  // ── Guest-to-seat drop handler ────────────────────────
  const handleGuestDrop = useCallback(
    async (
      seatId: string,
      guestId: string,
      guestName: string,
      previousSeatId: string | null
    ) => {
      if (!layout) return;

      // Optimistic update
      const updatedLayout = structuredClone(layout);

      // Unassign from old seat if moving
      if (previousSeatId) {
        for (const table of updatedLayout.tables) {
          for (const seat of table.seats) {
            if (seat.id === previousSeatId) {
              seat.guest_id = null;
              seat.guest_name = null;
            }
          }
        }
      }

      // Assign to new seat
      for (const table of updatedLayout.tables) {
        for (const seat of table.seats) {
          if (seat.id === seatId) {
            seat.guest_id = guestId;
            seat.guest_name = guestName;
          }
        }
      }

      setLayout(updatedLayout);

      try {
        if (previousSeatId) {
          await unassignSeat(eventId, previousSeatId);
        }
        await assignSeat(eventId, seatId, guestId);
      } catch (err) {
        console.error("Failed to assign guest:", err);
        setLayout(layout);
      }
    },
    [eventId, layout]
  );

  // ── AI Suggestion handlers ─────────────────────────────
  const handleSuggestions = useCallback(
    (suggestion: SeatingSuggestion) => {
      setActiveSuggestion(suggestion);
    },
    []
  );

  const handleSuggestionApplied = useCallback(
    (updatedLayout: Layout) => {
      setLayout(updatedLayout);
      setActiveSuggestion(null);
    },
    []
  );

  const handleDismissSuggestions = useCallback(() => {
    setActiveSuggestion(null);
  }, []);

  // ── Layout update from sidebar ────────────────────────
  const handleLayoutUpdate = useCallback((updatedLayout: Layout) => {
    setLayout(updatedLayout);
  }, []);

  // ── Fit-to-content handler ────────────────────────────
  const handleFitToContent = useCallback(() => {
    if (!layout || (!layout.tables.length && !layout.features.length)) {
      setTransform({ zoom: 0.7, panX: 60, panY: 60 });
      return;
    }

    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;

    for (const t of layout.tables) {
      minX = Math.min(minX, t.x);
      minY = Math.min(minY, t.y);
      maxX = Math.max(maxX, t.x + t.width);
      maxY = Math.max(maxY, t.y + t.height);
    }
    for (const f of layout.features) {
      minX = Math.min(minX, f.x);
      minY = Math.min(minY, f.y);
      maxX = Math.max(maxX, f.x + f.width);
      maxY = Math.max(maxY, f.y + f.height);
    }

    const padding = 100;
    const contentW = maxX - minX + padding * 2;
    const contentH = maxY - minY + padding * 2;
    const containerW = window.innerWidth - 280;
    const containerH = window.innerHeight - 180;

    const zoom = Math.min(containerW / contentW, containerH / contentH, 1.0);
    const panX = (containerW - contentW * zoom) / 2 - (minX - padding) * zoom;
    const panY = (containerH - contentH * zoom) / 2 - (minY - padding) * zoom;

    setTransform({ zoom, panX, panY });
  }, [layout]);

  // ── Keyboard: Escape deselects, Delete removes ────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      if (e.key === "Escape") {
        setSelectedElementId(null);
      }
      if (
        (e.key === "Delete" || e.key === "Backspace") &&
        selectedElementId
      ) {
        // Check if it's a table or feature
        const isTable = layout?.tables.some(
          (t) => t.id === selectedElementId
        );
        if (isTable) {
          handleDeleteTable(selectedElementId);
        } else {
          handleDeleteFeature(selectedElementId);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedElementId, layout, handleDeleteTable, handleDeleteFeature]);

  const hasLayout =
    layout !== null &&
    (layout.tables.length > 0 || layout.features.length > 0);

  // ── Loading state ─────────────────────────────────────
  if (isLoadingLayout) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-120px)]">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-2 border-rose-400 border-t-transparent rounded-full mx-auto mb-3" />
          <p className="text-sm text-warm-gray-400">Loading layout...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] -m-8 animate-fade-in">
      {/* Prompt bar + Toolbar */}
      <div className="px-6 pt-5 pb-3 space-y-2">
        <div className="flex items-start gap-3">
          <div className="flex-1">
            <PromptBar
              onGenerate={handleGenerate}
              onModify={handleModify}
              isLoading={isGenerating}
              hasLayout={hasLayout}
            />
          </div>
          {hasLayout && (
            <div className="flex items-center gap-2 pt-0.5 shrink-0">
              <SeatingAI
                eventId={eventId}
                onSuggestions={handleSuggestions}
                disabled={isGenerating || !!activeSuggestion}
              />
              <ExportButton eventId={eventId} />
            </div>
          )}
        </div>

        {/* Manual creation toolbar */}
        <CreationToolbar
          onCreateTable={handleCreateTable}
          onCreateFeature={handleCreateFeature}
          disabled={isGenerating}
        />

        {/* Error message */}
        {error && (
          <div className="mt-3 flex items-center gap-2 px-4 py-2.5 bg-rose-50 border border-rose-200 rounded-soft">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
            <p className="text-xs text-rose-600">{error}</p>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-xs text-rose-400 hover:text-rose-600"
            >
              Dismiss
            </button>
          </div>
        )}
      </div>

      {/* Canvas area */}
      <div ref={canvasContainerRef} className="flex-1 relative mx-3 mb-3 rounded-card overflow-hidden border border-cream-200 bg-cream-50">
        <Canvas
          width={layout?.canvas_width || 2000}
          height={layout?.canvas_height || 1500}
          transform={transform}
          onTransformChange={setTransform}
          onCanvasClick={handleCanvasClick}
        >
          {/* Empty state */}
          {!hasLayout && !isGenerating && (
            <EmptyCanvas
              guestCount={guestCount}
              eventId={eventId}
              onPromptClick={handleExamplePromptClick}
            />
          )}

          {/* Tables */}
          {layout?.tables.map((table) => (
            <TableElement
              key={table.id}
              table={table}
              zoom={transform.zoom}
              isSelected={selectedElementId === table.id}
              onSelect={handleSelectElement}
              onUpdate={handleUpdateTable}
              onDelete={handleDeleteTable}
              onGuestDrop={handleGuestDrop}
            />
          ))}

          {/* Features */}
          {layout?.features.map((feature) => (
            <FeatureElement
              key={feature.id}
              feature={feature}
              zoom={transform.zoom}
              isSelected={selectedElementId === feature.id}
              onSelect={handleSelectElement}
              onUpdate={handleUpdateFeature}
              onDelete={handleDeleteFeature}
            />
          ))}
        </Canvas>

        {/* Zoom controls */}
        <ZoomControls
          transform={transform}
          onTransformChange={setTransform}
          onFitToContent={handleFitToContent}
        />

        {/* Generating overlay */}
        {isGenerating && (
          <div className="absolute inset-0 bg-cream-50/60 backdrop-blur-sm flex items-center justify-center z-30 rounded-card">
            <div className="text-center">
              <div className="w-14 h-14 rounded-full bg-white border border-cream-200 shadow-card mx-auto mb-4 flex items-center justify-center">
                <svg
                  className="animate-spin h-6 w-6 text-gold-400"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="3"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
              </div>
              <p className="text-sm font-medium text-warm-gray-700">
                {hasLayout ? "Modifying your layout..." : "Designing your layout..."}
              </p>
              <p className="text-xs text-warm-gray-400 mt-1">
                {hasLayout
                  ? "Our AI is applying your changes"
                  : "Our AI is arranging tables and features"}
              </p>
            </div>
          </div>
        )}

        {/* AI Suggestion overlay */}
        {activeSuggestion && layout && (
          <SuggestionOverlay
            eventId={eventId}
            suggestion={activeSuggestion}
            layout={layout}
            onApplied={handleSuggestionApplied}
            onDismiss={handleDismissSuggestions}
          />
        )}

        {/* Guest sidebar */}
        <GuestSidebar
          eventId={eventId}
          layout={layout}
          onLayoutUpdate={handleLayoutUpdate}
        />
      </div>
    </div>
  );
}

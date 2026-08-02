"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Sparkles, X, Wand2, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { suggestSeating, type SeatingSuggestion } from "@/lib/layout";

interface SeatingAIProps {
  eventId: string;
  onSuggestions: (suggestion: SeatingSuggestion) => void;
  disabled?: boolean;
}

export function SeatingAI({
  eventId,
  onSuggestions,
  disabled,
}: SeatingAIProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        if (!isLoading) {
          setIsOpen(false);
          setError(null);
        }
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen, isLoading]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !isLoading) {
        setIsOpen(false);
        setError(null);
      }
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [isOpen, isLoading]);

  const handleSuggest = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const suggestion = await suggestSeating(eventId);
      if (suggestion.assignments.length === 0) {
        setError(
          suggestion.reasoning ||
            "Everyone is already seated — there's nothing left to arrange."
        );
        return;
      }
      onSuggestions(suggestion);
      setIsOpen(false);
    } catch (err) {
      // Surface a human message — API validation errors arrive as objects
      const raw = err instanceof Error ? err.message : "";
      const message =
        raw && raw !== "[object Object]" && !raw.startsWith("[")
          ? raw
          : "We couldn't arrange seats just now — please try again in a moment.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [eventId, onSuggestions]);

  return (
    <div className="relative" ref={panelRef}>
      {/* Trigger button */}
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          setError(null);
        }}
        disabled={disabled || isLoading}
        className={cn(
          "inline-flex items-center gap-2 px-4 py-2 rounded-pill",
          "text-ui-xs font-medium tracking-[0.01em]",
          "transition-[background-color,box-shadow,transform] duration-200 ease-out",
          "active:translate-y-px",
          isOpen
            ? "bg-rose-600 text-white shadow-btn-rose"
            : [
                "bg-rose-500 text-white",
                "hover:bg-rose-600 hover:-translate-y-px",
                "shadow-btn-rose hover:shadow-btn-rose-hover",
              ],
          (disabled || isLoading) && "opacity-60 cursor-not-allowed"
        )}
      >
        <Sparkles className="w-3.5 h-3.5" />
        <span>Auto-Seat</span>
      </button>

      {/* Dropdown panel */}
      {isOpen && (
        <div
          className={cn(
            "absolute top-full right-0 mt-2 z-50",
            "w-80 bg-white/90 backdrop-blur-md rounded-card-lg",
            "border border-white/70 shadow-lifted",
            "animate-fade-up"
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-4 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-pill bg-rose-100 border border-rose-200/70 flex items-center justify-center">
                <Wand2 className="w-3.5 h-3.5 text-rose-600" />
              </div>
              <div>
                <p className="eyebrow eyebrow-rose text-[9.5px] leading-none mb-1">
                  Auto-Seat
                </p>
                <h4 className="font-serif text-[15px] font-medium text-warm-gray-800 leading-tight">
                  Seat your guests
                </h4>
              </div>
            </div>
            <button
              onClick={() => {
                if (!isLoading) {
                  setIsOpen(false);
                  setError(null);
                }
              }}
              className="p-1.5 rounded-pill hover:bg-cream-100 text-warm-gray-400 hover:text-warm-gray-600 transition-colors"
              aria-label="Close AI seating panel"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Gold ornament divider */}
          <div className="px-5">
            <div className="ornament-divider">
              <span className="ornament-dot" />
            </div>
          </div>

          {/* What will happen — honest, minimal */}
          <div className="px-5 py-4">
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-pill bg-cream-100 border border-cream-300/70 flex items-center justify-center shrink-0 mt-0.5">
                <Users className="w-3.5 h-3.5 text-gold-600" />
              </div>
              <p className="text-ui-xs text-warm-gray-500 leading-relaxed">
                We&rsquo;ll place your{" "}
                <span className="font-medium text-warm-gray-700">
                  unseated guests
                </span>{" "}
                at open seats, keeping groups together where we can. You review
                every placement before anything is saved.
              </p>
            </div>

            {/* Error */}
            {error && (
              <div className="mt-3 px-3 py-2 bg-rose-50 border border-rose-200 rounded-card">
                <p className="text-ui-xs text-rose-600">{error}</p>
              </div>
            )}
          </div>

          {/* Action button */}
          <div className="px-5 pb-4">
            <button
              onClick={handleSuggest}
              disabled={isLoading}
              className={cn(
                "w-full flex items-center justify-center gap-2",
                "px-4 py-2.5 rounded-pill text-ui-xs font-medium",
                "transition-[background-color,box-shadow,transform] duration-200 ease-out",
                "active:translate-y-px",
                isLoading
                  ? "bg-rose-300 text-white cursor-wait"
                  : [
                      "bg-rose-500 text-white hover:bg-rose-600",
                      "shadow-btn-rose hover:shadow-btn-rose-hover hover:-translate-y-px",
                    ]
              )}
            >
              {isLoading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  <span>Arranging seats&hellip;</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Suggest Seats</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

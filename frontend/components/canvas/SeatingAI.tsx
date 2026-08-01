"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Sparkles, X, ArrowRight, Wand2 } from "lucide-react";
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
  const [constraints, setConstraints] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

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

  // Focus textarea on open
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleSuggest = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const trimmed = constraints.trim();
      const suggestion = await suggestSeating(
        eventId,
        trimmed || undefined
      );
      onSuggestions(suggestion);
      setIsOpen(false);
      setConstraints("");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to get suggestions";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [eventId, constraints, onSuggestions]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handleSuggest();
      }
      if (e.key === "Escape") {
        if (!isLoading) {
          setIsOpen(false);
          setError(null);
        }
      }
    },
    [handleSuggest, isLoading]
  );

  const exampleConstraints = [
    "Keep the Johnson family together",
    "Separate exes: Sarah & Mike",
    "Put kids near the entrance",
    "Group college friends at the same table",
  ];

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

          {/* Constraints input */}
          <div className="px-5 py-4">
            <label className="block text-ui-xs font-medium text-warm-gray-500 mb-1.5">
              Constraints{" "}
              <span className="text-warm-gray-300 font-normal">
                (optional)
              </span>
            </label>
            <textarea
              ref={inputRef}
              value={constraints}
              onChange={(e) => setConstraints(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Describe any seating preferences or rules..."
              rows={3}
              disabled={isLoading}
              className={cn(
                "w-full px-3.5 py-2.5 text-ui-xs leading-relaxed",
                "bg-white/70 border border-cream-300 rounded-card",
                "text-warm-gray-700 placeholder:text-warm-gray-300",
                "focus:outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-200/60",
                "resize-none transition-[border-color,box-shadow] duration-150",
                isLoading && "opacity-50 cursor-not-allowed"
              )}
            />

            {/* Quick constraint chips */}
            <div className="mt-2 flex flex-wrap gap-1">
              {exampleConstraints.map((c, i) => (
                <button
                  key={i}
                  onClick={() =>
                    setConstraints((prev) =>
                      prev ? `${prev}\n${c}` : c
                    )
                  }
                  disabled={isLoading}
                  className={cn(
                    "px-2.5 py-1 text-[10.5px] rounded-pill press",
                    "bg-cream-100/80 text-warm-gray-500",
                    "border border-cream-300/70",
                    "hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200",
                    "transition-colors duration-150",
                    isLoading && "opacity-40 cursor-not-allowed"
                  )}
                >
                  {c}
                </button>
              ))}
            </div>

            {/* Error */}
            {error && (
              <div className="mt-2 px-3 py-2 bg-rose-50 border border-rose-200 rounded-card">
                <p className="text-ui-xs text-rose-600">{error}</p>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="px-5 pb-4 flex gap-2">
            <button
              onClick={handleSuggest}
              disabled={isLoading}
              className={cn(
                "flex-1 flex items-center justify-center gap-2",
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
                  <span>Thinking...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Suggest Seats</span>
                </>
              )}
            </button>
          </div>

          {/* Keyboard shortcut hint */}
          <div className="px-5 pb-3.5 text-center">
            <span className="text-[10px] text-warm-gray-400">
              Press{" "}
              <kbd className="px-1.5 py-0.5 bg-cream-100 border border-cream-300/70 rounded-soft text-[9px] text-warm-gray-500">
                ⌘ Enter
              </kbd>{" "}
              to suggest
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

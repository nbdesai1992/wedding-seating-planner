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
          "inline-flex items-center gap-2 px-4 py-2 rounded-lg",
          "text-xs font-medium transition-all duration-200",
          "shadow-sm hover:shadow-md",
          isOpen
            ? "bg-rose-500 text-white border border-rose-600/20"
            : [
                "bg-gradient-to-b from-rose-400 to-rose-500",
                "text-white",
                "hover:from-rose-500 hover:to-rose-600",
                "border border-rose-400/30",
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
            "absolute top-full left-0 mt-2 z-50",
            "w-80 bg-white rounded-xl",
            "border border-cream-200 shadow-lg shadow-warm-gray-800/8",
            "animate-fade-in"
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 pt-4 pb-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-rose-100 to-rose-200 flex items-center justify-center">
                <Wand2 className="w-3.5 h-3.5 text-rose-500" />
              </div>
              <div>
                <h4 className="text-sm font-serif font-semibold text-warm-gray-700">
                  AI Seating
                </h4>
                <p className="text-[10px] text-warm-gray-400">
                  Let AI suggest seat assignments
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                if (!isLoading) {
                  setIsOpen(false);
                  setError(null);
                }
              }}
              className="p-1 rounded-md hover:bg-cream-100 text-warm-gray-400 hover:text-warm-gray-600 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Thin gold divider */}
          <div className="mx-4 h-px bg-gradient-to-r from-transparent via-gold-400/40 to-transparent" />

          {/* Constraints input */}
          <div className="p-4">
            <label className="block text-[11px] font-medium text-warm-gray-500 mb-1.5">
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
                "w-full px-3 py-2 text-xs leading-relaxed",
                "bg-cream-50 border border-cream-200 rounded-lg",
                "text-warm-gray-700 placeholder:text-warm-gray-300",
                "focus:outline-none focus:border-rose-300 focus:ring-1 focus:ring-rose-200",
                "resize-none transition-all duration-150",
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
                    "px-2 py-0.5 text-[10px] rounded-full",
                    "bg-cream-100 text-warm-gray-500",
                    "border border-cream-200",
                    "hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200",
                    "transition-all duration-150",
                    isLoading && "opacity-40 cursor-not-allowed"
                  )}
                >
                  {c}
                </button>
              ))}
            </div>

            {/* Error */}
            {error && (
              <div className="mt-2 px-3 py-2 bg-rose-50 border border-rose-200 rounded-lg">
                <p className="text-[11px] text-rose-600">{error}</p>
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="px-4 pb-4 flex gap-2">
            <button
              onClick={handleSuggest}
              disabled={isLoading}
              className={cn(
                "flex-1 flex items-center justify-center gap-2",
                "px-4 py-2.5 rounded-lg text-xs font-medium",
                "transition-all duration-200",
                isLoading
                  ? "bg-rose-300 text-white cursor-wait"
                  : [
                      "bg-gradient-to-b from-rose-400 to-rose-500 text-white",
                      "hover:from-rose-500 hover:to-rose-600",
                      "shadow-sm hover:shadow-md",
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
          <div className="px-4 pb-3 text-center">
            <span className="text-[10px] text-warm-gray-300">
              Press{" "}
              <kbd className="px-1 py-0.5 bg-cream-100 border border-cream-200 rounded text-[9px]">
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

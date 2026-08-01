"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Sparkles, Send, Loader2, Pencil, History } from "lucide-react";

// ── Types ──────────────────────────────────────────────────

type PromptMode = "generate" | "modify";

interface PromptBarProps {
  onGenerate: (description: string) => Promise<void>;
  onModify: (prompt: string) => Promise<void>;
  isLoading?: boolean;
  /** Whether a layout already exists (tables/features present) */
  hasLayout?: boolean;
  className?: string;
}

const MAX_HISTORY = 5;
const HISTORY_KEY = "wedding-planner-prompt-history";

// ── Helpers ────────────────────────────────────────────────

function loadHistory(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveHistory(history: string[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, MAX_HISTORY)));
  } catch {
    // ignore
  }
}

// ── Component ──────────────────────────────────────────────

export function PromptBar({
  onGenerate,
  onModify,
  isLoading = false,
  hasLayout = false,
  className,
}: PromptBarProps) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const ignoreBlurRef = useRef(false);

  const mode: PromptMode = hasLayout ? "modify" : "generate";

  // Load history on mount
  useEffect(() => {
    setHistory(loadHistory());
  }, []);

  // Auto-focus on mount when no layout
  useEffect(() => {
    if (!hasLayout && inputRef.current) {
      inputRef.current.focus();
    }
  }, [hasLayout]);

  const addToHistory = useCallback((text: string) => {
    setHistory((prev) => {
      const filtered = prev.filter((h) => h !== text);
      const next = [text, ...filtered].slice(0, MAX_HISTORY);
      saveHistory(next);
      return next;
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = value.trim();
    if (!text || isLoading) return;

    addToHistory(text);
    setShowHistory(false);

    if (mode === "modify") {
      await onModify(text);
    } else {
      await onGenerate(text);
    }
    setValue("");
  };

  const handleHistoryClick = (prompt: string) => {
    setValue(prompt);
    setShowHistory(false);
    inputRef.current?.focus();
  };

  const clearHistory = () => {
    setHistory([]);
    saveHistory([]);
    setShowHistory(false);
  };

  const placeholder =
    mode === "modify"
      ? 'Modify your layout... (e.g., "Add a photo booth near the entrance")'
      : 'Describe your venue layout... (e.g., "A ballroom with 10 round tables for 8 guests each")';

  const loadingText =
    mode === "modify"
      ? "Applying changes to your layout..."
      : "Creating your layout with AI...";

  return (
    <div className={cn("relative z-10", className)}>
      <form onSubmit={handleSubmit} className="relative">
        {/* Outer glow on focus */}
        <div
          className={cn(
            "absolute -inset-px rounded-pill transition-shadow duration-300 pointer-events-none",
            isFocused
              ? "shadow-[0_0_0_3px_rgba(212,165,116,0.15)]"
              : ""
          )}
        />

        <div
          className={cn(
            "relative flex items-center gap-3",
            "bg-white/80 backdrop-blur-md",
            "border rounded-pill",
            "pl-2.5 pr-2.5 py-2",
            "transition-[border-color,box-shadow,background-color] duration-200 ease-out",
            isFocused
              ? "border-gold-400/60 shadow-lifted bg-white/90"
              : "border-white/70 shadow-soft hover:border-cream-300"
          )}
        >
          {/* Mode indicator + icon */}
          <div className="shrink-0 flex items-center gap-2">
            <div
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center",
                "transition-colors duration-200",
                isLoading
                  ? "bg-gold-400/10"
                  : isFocused
                  ? "bg-gold-400/10"
                  : "bg-cream-100"
              )}
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 text-gold-500 animate-spin" />
              ) : mode === "modify" ? (
                <Pencil
                  className={cn(
                    "w-3.5 h-3.5 transition-colors",
                    isFocused ? "text-gold-500" : "text-gold-400"
                  )}
                />
              ) : (
                <Sparkles
                  className={cn(
                    "w-4 h-4 transition-colors",
                    isFocused ? "text-gold-500" : "text-gold-400"
                  )}
                />
              )}
            </div>

            {/* Mode badge */}
            <span
              className={cn(
                "text-[9.5px] font-medium uppercase tracking-eyebrow px-2.5 py-1 rounded-pill leading-none",
                "transition-colors duration-200",
                mode === "modify"
                  ? "bg-rose-400/10 text-rose-600"
                  : "bg-gold-400/10 text-gold-600"
              )}
            >
              {mode === "modify" ? "Modify" : "Generate"}
            </span>
          </div>

          {/* Input */}
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onFocus={() => {
              setIsFocused(true);
              if (history.length > 0) setShowHistory(true);
            }}
            onBlur={() => {
              setIsFocused(false);
              // Delay hiding to allow click on history items/buttons
              setTimeout(() => {
                if (!ignoreBlurRef.current) {
                  setShowHistory(false);
                }
                ignoreBlurRef.current = false;
              }, 200);
            }}
            placeholder={placeholder}
            disabled={isLoading}
            className={cn(
              "flex-1 bg-transparent",
              "text-ui text-warm-gray-700 placeholder:text-warm-gray-400/70",
              "outline-none border-none",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          />

          {/* History toggle */}
          {history.length > 0 && !isLoading && (
            <button
              type="button"
              onMouseDown={() => {
                ignoreBlurRef.current = true;
              }}
              onClick={() => {
                setShowHistory((prev) => !prev);
                inputRef.current?.focus();
              }}
              className={cn(
                "shrink-0 w-8 h-8 rounded-pill press",
                "flex items-center justify-center",
                "transition-colors duration-200 ease-out",
                showHistory
                  ? "bg-gold-400/15 text-gold-500"
                  : "bg-cream-50 text-warm-gray-400 hover:bg-cream-100 hover:text-warm-gray-500"
              )}
              aria-label="Show prompt history"
            >
              <History className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Submit button */}
          <button
            type="submit"
            disabled={!value.trim() || isLoading}
            className={cn(
              "shrink-0 w-8 h-8 rounded-pill press",
              "flex items-center justify-center",
              "transition-[background-color,box-shadow] duration-200 ease-out",
              value.trim() && !isLoading
                ? "bg-rose-500 text-white hover:bg-rose-600 shadow-btn-rose hover:shadow-btn-rose-hover"
                : "bg-cream-100 text-warm-gray-300 cursor-not-allowed"
            )}
            aria-label={mode === "modify" ? "Modify layout" : "Generate layout"}
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Loading status text */}
        {isLoading && (
          <div className="absolute -bottom-6 left-5 flex items-center gap-2">
            <span className="text-ui-xs text-gold-600 font-medium animate-pulse">
              {loadingText}
            </span>
          </div>
        )}
      </form>

      {/* Prompt history dropdown */}
      {showHistory && history.length > 0 && !isLoading && (
        <div className="absolute top-full left-0 right-0 mt-2 z-50">
          <div className="bg-white/90 backdrop-blur-md border border-white/70 rounded-card-lg shadow-lifted overflow-hidden animate-fade-up">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-2.5 border-b border-cream-200/70">
              <span className="text-[9.5px] font-medium uppercase tracking-eyebrow text-warm-gray-400">
                Recent prompts
              </span>
              <button
                type="button"
                onMouseDown={() => { ignoreBlurRef.current = true; }}
                onClick={clearHistory}
                className="text-[10px] text-warm-gray-400 hover:text-rose-500 transition-colors duration-150"
              >
                Clear
              </button>
            </div>

            {/* History items */}
            <div className="py-1">
              {history.map((prompt, i) => (
                <button
                  key={i}
                  type="button"
                  onMouseDown={() => { ignoreBlurRef.current = true; }}
                  onClick={() => handleHistoryClick(prompt)}
                  className={cn(
                    "w-full text-left px-5 py-2.5",
                    "text-ui-sm text-warm-gray-600",
                    "hover:bg-cream-50 transition-colors duration-150",
                    "flex items-center gap-3"
                  )}
                >
                  <Sparkles className="w-3 h-3 text-gold-400 shrink-0" />
                  <span className="truncate">{prompt}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

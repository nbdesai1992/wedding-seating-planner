"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import type { LayoutConfig } from "@/lib/layout";
import {
  Circle,
  RectangleHorizontal,
  Music,
  Wine,
  Mic2,
  Cake,
  Heart,
  Minus,
  Plus,
  Sparkles,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────

interface LayoutWizardProps {
  onGenerate: (config: LayoutConfig) => Promise<void>;
  isLoading: boolean;
}

// ── Stepper ────────────────────────────────────────────────

function Stepper({
  value,
  onChange,
  min,
  max,
  label,
}: {
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  label: string;
}) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <span className="text-xs text-warm-gray-400 font-medium">{label}</span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          className="w-7 h-7 rounded-full border border-cream-300 flex items-center justify-center text-warm-gray-500 hover:bg-cream-100 disabled:opacity-30 transition-colors"
        >
          <Minus className="w-3 h-3" />
        </button>
        <span className="w-8 text-center text-lg font-serif font-semibold text-warm-gray-700">
          {value}
        </span>
        <button
          type="button"
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
          className="w-7 h-7 rounded-full border border-cream-300 flex items-center justify-center text-warm-gray-500 hover:bg-cream-100 disabled:opacity-30 transition-colors"
        >
          <Plus className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

// ── Toggle ─────────────────────────────────────────────────

function Toggle({
  checked,
  onChange,
  label,
  icon: Icon,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={cn(
        "flex items-center gap-2.5 px-3.5 py-2.5 rounded-card border transition-all duration-150",
        checked
          ? "border-rose-300 bg-rose-50/60 shadow-sm"
          : "border-cream-200 bg-white/60 hover:border-cream-300"
      )}
    >
      <Icon
        className={cn(
          "w-4 h-4 transition-colors",
          checked ? "text-rose-400" : "text-warm-gray-400"
        )}
      />
      <span
        className={cn(
          "text-sm font-medium transition-colors",
          checked ? "text-warm-gray-700" : "text-warm-gray-400"
        )}
      >
        {label}
      </span>
      <div
        className={cn(
          "ml-auto w-8 h-5 rounded-full transition-colors relative",
          checked ? "bg-rose-400" : "bg-cream-300"
        )}
      >
        <div
          className={cn(
            "absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform",
            checked ? "translate-x-3.5" : "translate-x-0.5"
          )}
        />
      </div>
    </button>
  );
}

// ── Position Picker ────────────────────────────────────────

const POSITIONS = [
  { value: "center", label: "Center" },
  { value: "front", label: "Front" },
  { value: "left", label: "Left" },
  { value: "right", label: "Right" },
] as const;

function PositionPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: "center" | "front" | "left" | "right") => void;
}) {
  return (
    <div className="flex gap-1.5">
      {POSITIONS.map((pos) => (
        <button
          key={pos.value}
          type="button"
          onClick={() => onChange(pos.value)}
          className={cn(
            "px-2.5 py-1 rounded-soft text-xs font-medium transition-all duration-150",
            value === pos.value
              ? "bg-rose-400 text-white shadow-sm"
              : "bg-cream-100 text-warm-gray-500 hover:bg-cream-200"
          )}
        >
          {pos.label}
        </button>
      ))}
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────

export function LayoutWizard({ onGenerate, isLoading }: LayoutWizardProps) {
  const [tableCount, setTableCount] = useState(10);
  const [tableShape, setTableShape] = useState<"round" | "rectangle">("round");
  const [seatsPerTable, setSeatsPerTable] = useState(8);
  const [includeSweetheart, setIncludeSweetheart] = useState(true);
  const [includeDanceFloor, setIncludeDanceFloor] = useState(true);
  const [danceFloorPosition, setDanceFloorPosition] = useState<
    "center" | "front" | "left" | "right"
  >("center");
  const [includeBar, setIncludeBar] = useState(false);
  const [includeStage, setIncludeStage] = useState(false);
  const [includeCakeTable, setIncludeCakeTable] = useState(false);

  function handleGenerate() {
    onGenerate({
      table_count: tableCount,
      table_shape: tableShape,
      seats_per_table: seatsPerTable,
      include_sweetheart: includeSweetheart,
      include_dance_floor: includeDanceFloor,
      dance_floor_position: danceFloorPosition,
      include_bar: includeBar,
      include_stage: includeStage,
      include_cake_table: includeCakeTable,
    });
  }

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
      <div className="pointer-events-auto w-full max-w-md px-6">
        <div className="bg-white/95 backdrop-blur-sm border border-cream-200 rounded-card shadow-card p-6">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="w-12 h-12 rounded-full bg-cream-100 border border-cream-200 mx-auto mb-3 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-gold-400" />
            </div>
            <h3 className="font-serif text-lg font-semibold text-warm-gray-700">
              Design Your Layout
            </h3>
            <p className="text-xs text-warm-gray-400 mt-1">
              Set up your tables and features to get started
            </p>
          </div>

          {/* Tables section */}
          <div className="mb-5">
            <h4 className="text-xs uppercase tracking-wider text-warm-gray-400 font-medium mb-3">
              Tables
            </h4>
            <div className="flex items-end justify-between gap-4">
              <Stepper
                value={tableCount}
                onChange={setTableCount}
                min={1}
                max={40}
                label="Tables"
              />

              {/* Shape toggle */}
              <div className="flex flex-col items-center gap-1.5">
                <span className="text-xs text-warm-gray-400 font-medium">
                  Shape
                </span>
                <div className="flex gap-1 bg-cream-100 rounded-lg p-0.5">
                  <button
                    type="button"
                    onClick={() => setTableShape("round")}
                    className={cn(
                      "flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all",
                      tableShape === "round"
                        ? "bg-white text-warm-gray-700 shadow-sm"
                        : "text-warm-gray-400 hover:text-warm-gray-600"
                    )}
                  >
                    <Circle className="w-3 h-3" />
                    Round
                  </button>
                  <button
                    type="button"
                    onClick={() => setTableShape("rectangle")}
                    className={cn(
                      "flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all",
                      tableShape === "rectangle"
                        ? "bg-white text-warm-gray-700 shadow-sm"
                        : "text-warm-gray-400 hover:text-warm-gray-600"
                    )}
                  >
                    <RectangleHorizontal className="w-3 h-3" />
                    Rect
                  </button>
                </div>
              </div>

              <Stepper
                value={seatsPerTable}
                onChange={setSeatsPerTable}
                min={2}
                max={20}
                label="Seats each"
              />
            </div>

            {/* Sweetheart toggle */}
            <div className="mt-3">
              <Toggle
                checked={includeSweetheart}
                onChange={setIncludeSweetheart}
                label="Sweetheart Table"
                icon={Heart}
              />
            </div>
          </div>

          <div className="divider-gold mb-5" />

          {/* Features section */}
          <div className="mb-6">
            <h4 className="text-xs uppercase tracking-wider text-warm-gray-400 font-medium mb-3">
              Features
            </h4>
            <div className="space-y-2">
              <div>
                <Toggle
                  checked={includeDanceFloor}
                  onChange={setIncludeDanceFloor}
                  label="Dance Floor"
                  icon={Music}
                />
                {includeDanceFloor && (
                  <div className="mt-2 ml-9 flex items-center gap-2">
                    <span className="text-xs text-warm-gray-400">
                      Position:
                    </span>
                    <PositionPicker
                      value={danceFloorPosition}
                      onChange={setDanceFloorPosition}
                    />
                  </div>
                )}
              </div>
              <Toggle
                checked={includeBar}
                onChange={setIncludeBar}
                label="Bar"
                icon={Wine}
              />
              <Toggle
                checked={includeStage}
                onChange={setIncludeStage}
                label="Stage"
                icon={Mic2}
              />
              <Toggle
                checked={includeCakeTable}
                onChange={setIncludeCakeTable}
                label="Cake Table"
                icon={Cake}
              />
            </div>
          </div>

          {/* Generate button */}
          <button
            type="button"
            onClick={handleGenerate}
            disabled={isLoading}
            className={cn(
              "w-full py-3 rounded-card text-sm font-medium transition-all duration-200",
              "bg-rose-400 text-white hover:bg-rose-500 shadow-sm hover:shadow-md",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              "flex items-center justify-center gap-2"
            )}
          >
            {isLoading ? (
              <>
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Generate Layout
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

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
      <span className="text-ui-xs text-warm-gray-400 font-medium">{label}</span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          aria-label={`Decrease ${label.toLowerCase()}`}
          className="w-7 h-7 rounded-pill border border-cream-300 flex items-center justify-center text-warm-gray-500 hover:bg-cream-100 disabled:opacity-30 transition-colors duration-150 press"
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
          aria-label={`Increase ${label.toLowerCase()}`}
          className="w-7 h-7 rounded-pill border border-cream-300 flex items-center justify-center text-warm-gray-500 hover:bg-cream-100 disabled:opacity-30 transition-colors duration-150 press"
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
        "flex w-full items-center gap-2.5 px-3.5 py-1.5 rounded-pill border press",
        "transition-[border-color,background-color,box-shadow] duration-150 ease-out",
        checked
          ? "border-rose-300 bg-rose-50/60 shadow-soft"
          : "border-cream-200 bg-white/60 hover:border-cream-300"
      )}
    >
      <Icon
        className={cn(
          "w-4 h-4 transition-colors duration-150",
          checked ? "text-rose-400" : "text-warm-gray-400"
        )}
      />
      <span
        className={cn(
          "text-ui-sm font-medium transition-colors duration-150",
          checked ? "text-warm-gray-700" : "text-warm-gray-400"
        )}
      >
        {label}
      </span>
      <div
        className={cn(
          "ml-auto w-8 h-5 rounded-pill transition-colors duration-150 relative",
          checked ? "bg-rose-400" : "bg-cream-300"
        )}
      >
        <div
          className={cn(
            "absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-150",
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
            "px-2.5 py-1 rounded-pill text-ui-xs font-medium press",
            "transition-[background-color,color,box-shadow] duration-150 ease-out",
            value === pos.value
              ? "bg-rose-400 text-white shadow-btn-rose"
              : "bg-cream-100 text-warm-gray-500 hover:bg-cream-200"
          )}
        >
          {pos.label}
        </button>
      ))}
    </div>
  );
}

// ── Section header: eyebrow + hairline rule ────────────────

function SectionHeader({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 mb-3">
      <span className="text-[9.5px] uppercase tracking-eyebrow text-gold-600 font-medium leading-none">
        {label}
      </span>
      <div className="hairline" />
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
      <div className="pointer-events-auto w-full max-w-md px-6 max-h-full overflow-y-auto py-4">
        <div className="frosted-card px-7 py-5 animate-fade-up">
          {/* Header — warm invitation */}
          <div className="text-center mb-4">
            <p className="eyebrow eyebrow-gold mb-2.5">The Room Awaits</p>
            <h3 className="font-serif text-[20px] font-medium text-warm-gray-800 leading-snug">
              Set the scene for your celebration
            </h3>
            <p className="text-ui-sm text-warm-gray-400 mt-1.5">
              Choose your tables and touches — we&rsquo;ll arrange the room.
            </p>
          </div>

          {/* Gold ornament divider */}
          <div className="ornament-divider mb-4">
            <span className="ornament-dot" />
          </div>

          {/* Tables section */}
          <div className="mb-4">
            <SectionHeader label="Tables" />
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
                <span className="text-ui-xs text-warm-gray-400 font-medium">
                  Shape
                </span>
                <div className="flex gap-1 bg-cream-100 rounded-pill p-0.5">
                  <button
                    type="button"
                    onClick={() => setTableShape("round")}
                    className={cn(
                      "flex items-center gap-1 px-2.5 py-1.5 rounded-pill text-ui-xs font-medium press",
                      "transition-[background-color,color,box-shadow] duration-150 ease-out",
                      tableShape === "round"
                        ? "bg-white text-warm-gray-700 shadow-soft"
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
                      "flex items-center gap-1 px-2.5 py-1.5 rounded-pill text-ui-xs font-medium press",
                      "transition-[background-color,color,box-shadow] duration-150 ease-out",
                      tableShape === "rectangle"
                        ? "bg-white text-warm-gray-700 shadow-soft"
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

          {/* Features section */}
          <div className="mb-4">
            <SectionHeader label="Features" />
            <div className="space-y-1.5">
              <div>
                <Toggle
                  checked={includeDanceFloor}
                  onChange={setIncludeDanceFloor}
                  label="Dance Floor"
                  icon={Music}
                />
                {includeDanceFloor && (
                  <div className="mt-2 ml-9 flex items-center gap-2">
                    <span className="text-ui-xs text-warm-gray-400">
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
              "w-full py-2.5 rounded-pill text-ui font-medium",
              "bg-gradient-to-br from-rose-600 to-rose-700 text-white",
              "shadow-btn-rose hover:shadow-btn-rose-hover hover:-translate-y-px",
              "transition-[background-color,box-shadow,transform] duration-200 ease-out",
              "active:translate-y-px",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              "flex items-center justify-center gap-2"
            )}
          >
            {isLoading ? (
              <>
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                Arranging the room...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Arrange My Room
              </>
            )}
          </button>

          <p className="text-center text-[10.5px] text-warm-gray-400 mt-2.5">
            Prefer words? Describe your venue in the bar above.
          </p>
        </div>
      </div>
    </div>
  );
}

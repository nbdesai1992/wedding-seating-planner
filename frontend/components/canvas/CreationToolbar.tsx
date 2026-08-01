"use client";

import React from "react";
import {
  Circle,
  RectangleHorizontal,
  Heart,
  Music,
  Wine,
  Cake,
  Mic2,
  Star,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ── Shared Element Catalog ─────────────────────────────────
// Single source of truth for both manual creation and AI generation.

export interface TableDefaults {
  width: number;
  height: number;
  seatCount: number;
}

export interface FeatureDefaults {
  width: number;
  height: number;
}

export const TABLE_CATALOG: Record<
  string,
  TableDefaults & { label: string; icon: React.ComponentType<{ className?: string }> }
> = {
  round: { width: 120, height: 120, seatCount: 8, label: "Round", icon: Circle },
  rectangle: { width: 200, height: 100, seatCount: 8, label: "Rectangle", icon: RectangleHorizontal },
  sweetheart: { width: 120, height: 80, seatCount: 2, label: "Sweetheart", icon: Heart },
};

export const FEATURE_CATALOG: Record<
  string,
  FeatureDefaults & { label: string; icon: React.ComponentType<{ className?: string }> }
> = {
  dance_floor: { width: 300, height: 300, label: "Dance Floor", icon: Music },
  bar: { width: 250, height: 80, label: "Bar", icon: Wine },
  cake_table: { width: 80, height: 80, label: "Cake Table", icon: Cake },
  stage: { width: 300, height: 120, label: "Stage", icon: Mic2 },
  custom: { width: 150, height: 150, label: "Custom", icon: Star },
};

// ── Types ──────────────────────────────────────────────────

interface CreationToolbarProps {
  onCreateTable: (shape: string, defaults: TableDefaults) => void;
  onCreateFeature: (type: string, defaults: FeatureDefaults) => void;
  disabled?: boolean;
}

// ── Component ──────────────────────────────────────────────

export function CreationToolbar({
  onCreateTable,
  onCreateFeature,
  disabled = false,
}: CreationToolbarProps) {
  const itemBtn = cn(
    "w-8 h-8 rounded-pill flex items-center justify-center press",
    "text-warm-gray-400 hover:bg-rose-50 hover:text-rose-600",
    "transition-colors duration-150 ease-out",
    "focus-visible:focus-ring-rose"
  );

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 pl-4 pr-2 py-1.5",
        "bg-white/70 backdrop-blur-md border border-white/70 rounded-pill shadow-soft",
        "transition-opacity duration-200",
        disabled && "opacity-50 pointer-events-none"
      )}
    >
      {/* Tables group */}
      <span className="text-[9.5px] uppercase tracking-eyebrow text-warm-gray-400 font-medium mr-1 leading-none">
        Tables
      </span>
      {Object.entries(TABLE_CATALOG).map(([shape, spec]) => {
        const Icon = spec.icon;
        return (
          <button
            key={shape}
            onClick={() => onCreateTable(shape, spec)}
            disabled={disabled}
            title={spec.label}
            aria-label={`Add ${spec.label.toLowerCase()} table`}
            className={itemBtn}
          >
            <Icon className="w-4 h-4" />
          </button>
        );
      })}

      {/* Divider */}
      <div className="w-px h-5 bg-cream-300/80 mx-1.5" />

      {/* Features group */}
      <span className="text-[9.5px] uppercase tracking-eyebrow text-warm-gray-400 font-medium mr-1 leading-none">
        Features
      </span>
      {Object.entries(FEATURE_CATALOG).map(([type, spec]) => {
        const Icon = spec.icon;
        return (
          <button
            key={type}
            onClick={() => onCreateFeature(type, spec)}
            disabled={disabled}
            title={spec.label}
            aria-label={`Add ${spec.label.toLowerCase()}`}
            className={itemBtn}
          >
            <Icon className="w-4 h-4" />
          </button>
        );
      })}
    </div>
  );
}

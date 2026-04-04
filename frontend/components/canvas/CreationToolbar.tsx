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
  return (
    <div
      className={cn(
        "flex items-center gap-1.5 px-3 py-2 bg-white/80 backdrop-blur-sm border border-cream-200 rounded-card",
        disabled && "opacity-50 pointer-events-none"
      )}
    >
      {/* Tables group */}
      <span className="text-[10px] uppercase tracking-wider text-warm-gray-400 font-medium mr-0.5">
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
            className="w-8 h-8 rounded-lg flex items-center justify-center text-warm-gray-400 hover:bg-cream-100 hover:text-warm-gray-600 transition-colors"
          >
            <Icon className="w-4 h-4" />
          </button>
        );
      })}

      {/* Divider */}
      <div className="w-px h-6 bg-cream-200 mx-1" />

      {/* Features group */}
      <span className="text-[10px] uppercase tracking-wider text-warm-gray-400 font-medium mr-0.5">
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
            className="w-8 h-8 rounded-lg flex items-center justify-center text-warm-gray-400 hover:bg-cream-100 hover:text-warm-gray-600 transition-colors"
          >
            <Icon className="w-4 h-4" />
          </button>
        );
      })}
    </div>
  );
}

"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Plus, Minus, Maximize, RotateCcw } from "lucide-react";
import { MIN_ZOOM, MAX_ZOOM, type CanvasTransform } from "./Canvas";

// ── Types ──────────────────────────────────────────────────

interface ZoomControlsProps {
  transform: CanvasTransform;
  onTransformChange: (t: CanvasTransform) => void;
  /** Optional: recalculate pan to fit all content */
  onFitToContent?: () => void;
  className?: string;
}

// ── Constants ──────────────────────────────────────────────

const ZOOM_INCREMENT = 0.15;

// ── Component ──────────────────────────────────────────────

export function ZoomControls({
  transform,
  onTransformChange,
  onFitToContent,
  className,
}: ZoomControlsProps) {
  const zoomPercent = Math.round(transform.zoom * 100);

  const zoomIn = () => {
    const newZoom = Math.min(MAX_ZOOM, transform.zoom + ZOOM_INCREMENT);
    onTransformChange({ ...transform, zoom: newZoom });
  };

  const zoomOut = () => {
    const newZoom = Math.max(MIN_ZOOM, transform.zoom - ZOOM_INCREMENT);
    onTransformChange({ ...transform, zoom: newZoom });
  };

  const resetZoom = () => {
    onTransformChange({ zoom: 1, panX: 0, panY: 0 });
  };

  const fitContent = () => {
    if (onFitToContent) {
      onFitToContent();
    } else {
      // Default: zoom to 60% and center
      onTransformChange({ zoom: 0.6, panX: 100, panY: 60 });
    }
  };

  const btnBase = cn(
    "w-8 h-8 flex items-center justify-center rounded-pill",
    "transition-colors duration-150 ease-out press",
    "text-warm-gray-500 hover:text-warm-gray-700",
    "hover:bg-cream-100 active:bg-cream-200",
    "focus-visible:focus-ring-rose"
  );

  return (
    <div
      className={cn(
        "absolute bottom-4 right-4 z-20",
        "flex items-center gap-0.5",
        "bg-white/70 backdrop-blur-md",
        "border border-white/70 rounded-pill",
        "shadow-soft px-1.5 py-1.5",
        className
      )}
    >
      {/* Zoom out */}
      <button
        className={btnBase}
        onClick={zoomOut}
        disabled={transform.zoom <= MIN_ZOOM}
        title="Zoom out"
        aria-label="Zoom out"
      >
        <Minus className="w-3.5 h-3.5" />
      </button>

      {/* Zoom level */}
      <button
        className={cn(
          "min-w-[3.25rem] h-8 px-2",
          "flex items-center justify-center",
          "text-ui-xs font-medium text-warm-gray-600 tabular-nums",
          "rounded-pill hover:bg-cream-100 transition-colors press",
          "focus-visible:focus-ring-rose"
        )}
        onClick={resetZoom}
        title="Reset to 100%"
        aria-label={`Current zoom: ${zoomPercent}%. Click to reset.`}
      >
        {zoomPercent}%
      </button>

      {/* Zoom in */}
      <button
        className={btnBase}
        onClick={zoomIn}
        disabled={transform.zoom >= MAX_ZOOM}
        title="Zoom in"
        aria-label="Zoom in"
      >
        <Plus className="w-3.5 h-3.5" />
      </button>

      {/* Divider */}
      <div className="w-px h-5 bg-cream-300/80 mx-0.5" />

      {/* Fit to content */}
      <button
        className={btnBase}
        onClick={fitContent}
        title="Fit to content"
        aria-label="Fit to content"
      >
        <Maximize className="w-3.5 h-3.5" />
      </button>

      {/* Reset pan & zoom */}
      <button
        className={btnBase}
        onClick={resetZoom}
        title="Reset view"
        aria-label="Reset view"
      >
        <RotateCcw className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

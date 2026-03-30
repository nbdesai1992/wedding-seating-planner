"use client";

import React, { useCallback, useRef, useState } from "react";
import {
  Music,
  Wine,
  Utensils,
  Camera,
  DoorOpen,
  Mic2,
  Cake,
  Star,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ResizeHandles } from "./ResizeHandle";
import { RotateHandle } from "./RotateHandle";
import { ElementToolbar } from "./ElementToolbar";
import type { Feature } from "@/lib/layout";

// ── Icon & Color Mappings ──────────────────────────────────

const FEATURE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  dance_floor: Music,
  stage: Mic2,
  bar: Wine,
  entrance: DoorOpen,
  buffet: Utensils,
  dj_booth: Music,
  photo_booth: Camera,
  cake_table: Cake,
  cake: Cake,
};

const FEATURE_STYLES: Record<
  string,
  { bg: string; border: string; text: string; iconColor: string }
> = {
  dance_floor: {
    bg: "bg-rose-50/80",
    border: "border-rose-300",
    text: "text-rose-600",
    iconColor: "text-rose-400",
  },
  stage: {
    bg: "bg-amber-50/60",
    border: "border-gold-400/50",
    text: "text-gold-600",
    iconColor: "text-gold-400",
  },
  bar: {
    bg: "bg-cream-100/80",
    border: "border-cream-300",
    text: "text-warm-gray-600",
    iconColor: "text-warm-gray-400",
  },
  entrance: {
    bg: "bg-cream-50",
    border: "border-cream-300",
    text: "text-warm-gray-500",
    iconColor: "text-warm-gray-400",
  },
  buffet: {
    bg: "bg-cream-100/80",
    border: "border-cream-300",
    text: "text-warm-gray-600",
    iconColor: "text-warm-gray-400",
  },
  dj_booth: {
    bg: "bg-rose-50/60",
    border: "border-rose-200",
    text: "text-rose-500",
    iconColor: "text-rose-300",
  },
  photo_booth: {
    bg: "bg-amber-50/40",
    border: "border-gold-400/40",
    text: "text-gold-600",
    iconColor: "text-gold-400",
  },
  cake_table: {
    bg: "bg-rose-50/50",
    border: "border-rose-200",
    text: "text-rose-500",
    iconColor: "text-rose-300",
  },
  cake: {
    bg: "bg-rose-50/50",
    border: "border-rose-200",
    text: "text-rose-500",
    iconColor: "text-rose-300",
  },
  default: {
    bg: "bg-cream-50",
    border: "border-cream-300",
    text: "text-warm-gray-500",
    iconColor: "text-warm-gray-400",
  },
};

// ── Types ──────────────────────────────────────────────────

interface FeatureElementProps {
  feature: Feature;
  zoom: number;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onUpdate: (id: string, data: Partial<Omit<Feature, "id">>) => void;
  onDelete: (id: string) => void;
}

// ── Component ──────────────────────────────────────────────

export function FeatureElement({
  feature,
  zoom,
  isSelected,
  onSelect,
  onUpdate,
  onDelete,
}: FeatureElementProps) {
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0, posX: 0, posY: 0 });
  const [localPos, setLocalPos] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [localSize, setLocalSize] = useState<{
    w: number;
    h: number;
  } | null>(null);
  const [localRotation, setLocalRotation] = useState<number | null>(null);

  const posX = localPos?.x ?? feature.x;
  const posY = localPos?.y ?? feature.y;
  const w = localSize?.w ?? feature.width;
  const h = localSize?.h ?? feature.height;
  const rotation = localRotation ?? feature.rotation;

  const styles = FEATURE_STYLES[feature.type] || FEATURE_STYLES.default;
  const IconComponent = FEATURE_ICONS[feature.type] || Star;
  const isCircle =
    feature.shape === "circle" ||
    (feature.width === feature.height &&
      Math.abs(feature.width - feature.height) < 10);

  // ── Drag to reposition ────────────────────────────────
  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if ((e.target as HTMLElement).closest("[data-handle]")) return;

      e.stopPropagation();
      e.preventDefault();
      onSelect(feature.id);
      isDragging.current = true;
      dragStart.current = {
        x: e.clientX,
        y: e.clientY,
        posX,
        posY,
      };
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [feature.id, posX, posY, onSelect]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging.current) return;
      e.stopPropagation();
      const dx = (e.clientX - dragStart.current.x) / zoom;
      const dy = (e.clientY - dragStart.current.y) / zoom;
      setLocalPos({
        x: Math.round(dragStart.current.posX + dx),
        y: Math.round(dragStart.current.posY + dy),
      });
    },
    [zoom]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging.current) return;
      isDragging.current = false;
      e.stopPropagation();
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      if (localPos) {
        onUpdate(feature.id, {
          x: localPos.x,
          y: localPos.y,
        });
        setLocalPos(null);
      }
    },
    [feature.id, localPos, onUpdate]
  );

  // ── Resize ────────────────────────────────────────────
  const handleResize = useCallback(
    (newW: number, newH: number, dx: number, dy: number) => {
      setLocalSize({ w: newW, h: newH });
      if (dx !== 0 || dy !== 0) {
        setLocalPos((prev) => ({
          x: (prev?.x ?? feature.x) + dx,
          y: (prev?.y ?? feature.y) + dy,
        }));
      }
    },
    [feature.x, feature.y]
  );

  const handleResizeEnd = useCallback(() => {
    const updates: Partial<Omit<Feature, "id">> = {};
    if (localSize) {
      updates.width = localSize.w;
      updates.height = localSize.h;
    }
    if (localPos) {
      updates.x = localPos.x;
      updates.y = localPos.y;
    }
    onUpdate(feature.id, updates);
    setLocalSize(null);
    setLocalPos(null);
  }, [feature.id, localSize, localPos, onUpdate]);

  // ── Rotate ────────────────────────────────────────────
  const handleRotate = useCallback((angle: number) => {
    setLocalRotation(angle);
  }, []);

  const handleRotateEnd = useCallback(() => {
    if (localRotation !== null) {
      onUpdate(feature.id, { rotation: localRotation });
      setLocalRotation(null);
    }
  }, [feature.id, localRotation, onUpdate]);

  // ── Toolbar Actions ───────────────────────────────────
  const handleRename = useCallback(
    (newName: string) => {
      onUpdate(feature.id, { name: newName });
    },
    [feature.id, onUpdate]
  );

  const handleDelete = useCallback(() => {
    onDelete(feature.id);
  }, [feature.id, onDelete]);

  return (
    <div
      data-element-wrapper
      className={cn(
        "absolute group",
        isDragging.current ? "cursor-grabbing" : "cursor-grab"
      )}
      style={{
        left: `${posX}px`,
        top: `${posY}px`,
        width: `${w}px`,
        height: `${h}px`,
        transform: `rotate(${rotation || 0}deg)`,
        transformOrigin: "center center",
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {/* Selection ring */}
      {isSelected && (
        <div
          className={cn(
            "absolute -inset-1 border-2 border-gold-400/60 pointer-events-none",
            isCircle ? "rounded-full" : "rounded-xl"
          )}
        />
      )}

      {/* Feature body */}
      <div
        className={cn(
          "w-full h-full",
          "border-2 border-dashed transition-all duration-150",
          styles.bg,
          isSelected ? "border-gold-400" : styles.border,
          isSelected
            ? "shadow-lg"
            : "shadow-sm group-hover:shadow-md",
          isCircle ? "rounded-full" : "rounded-card",
          "flex flex-col items-center justify-center gap-1"
        )}
      >
        <IconComponent
          className={cn("w-5 h-5", styles.iconColor)}
        />
        <span
          className={cn(
            "text-xs font-medium text-center px-2 leading-tight",
            styles.text
          )}
        >
          {feature.name}
        </span>
      </div>

      {/* Interactive handles — shown when selected */}
      {isSelected && (
        <>
          <ResizeHandles
            width={w}
            height={h}
            zoom={zoom}
            onResize={handleResize}
            onResizeEnd={handleResizeEnd}
            minWidth={50}
            minHeight={50}
          />
          <RotateHandle
            centerX={w / 2}
            centerY={h / 2}
            width={w}
            zoom={zoom}
            onRotate={handleRotate}
            onRotateEnd={handleRotateEnd}
          />
          <ElementToolbar
            name={feature.name}
            elementType="feature"
            elementWidth={w}
            onRename={handleRename}
            onDelete={handleDelete}
          />
        </>
      )}
    </div>
  );
}

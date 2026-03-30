"use client";

import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type WheelEvent as ReactWheelEvent,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { cn } from "@/lib/utils";

// ── Constants ──────────────────────────────────────────────

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 2.0;
const ZOOM_STEP = 0.08;
const GRID_SIZE = 32; // px at 100% zoom

// ── Types ──────────────────────────────────────────────────

export interface CanvasTransform {
  zoom: number;
  panX: number;
  panY: number;
}

interface CanvasProps {
  width?: number;
  height?: number;
  transform: CanvasTransform;
  onTransformChange: (t: CanvasTransform) => void;
  children?: ReactNode;
  className?: string;
  /** Called when the user clicks empty canvas space */
  onCanvasClick?: (canvasX: number, canvasY: number) => void;
}

// ── Component ──────────────────────────────────────────────

export function Canvas({
  width = 2000,
  height = 1500,
  transform,
  onTransformChange,
  children,
  className,
  onCanvasClick,
}: CanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [isSpaceDown, setIsSpaceDown] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 });

  // ── Clamp zoom ─────────────────────────────────────────
  const clampZoom = useCallback(
    (z: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z)),
    []
  );

  // ── Zoom towards point ────────────────────────────────
  const zoomToPoint = useCallback(
    (clientX: number, clientY: number, delta: number) => {
      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const px = clientX - rect.left;
      const py = clientY - rect.top;

      const oldZoom = transform.zoom;
      const newZoom = clampZoom(oldZoom + delta);
      if (newZoom === oldZoom) return;

      // Keep the point under cursor stable
      const scale = newZoom / oldZoom;
      const newPanX = px - (px - transform.panX) * scale;
      const newPanY = py - (py - transform.panY) * scale;

      onTransformChange({ zoom: newZoom, panX: newPanX, panY: newPanY });
    },
    [transform, onTransformChange, clampZoom]
  );

  // ── Wheel handler ──────────────────────────────────────
  const handleWheel = useCallback(
    (e: ReactWheelEvent<HTMLDivElement>) => {
      e.preventDefault();

      // Pinch-to-zoom on trackpad sends ctrlKey
      if (e.ctrlKey || e.metaKey) {
        const delta = -e.deltaY * 0.01;
        zoomToPoint(e.clientX, e.clientY, delta);
      } else {
        // Regular scroll → zoom (non-trackpad scroll wheel)
        const delta = -e.deltaY * ZOOM_STEP * 0.01;
        zoomToPoint(e.clientX, e.clientY, delta);
      }
    },
    [zoomToPoint]
  );

  // ── Raw wheel listener for non-passive ─────────────────
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handler = (e: globalThis.WheelEvent) => {
      e.preventDefault();

      if (e.ctrlKey || e.metaKey) {
        const delta = -e.deltaY * 0.01;
        zoomToPoint(e.clientX, e.clientY, delta);
      } else {
        const delta = -e.deltaY * ZOOM_STEP * 0.01;
        zoomToPoint(e.clientX, e.clientY, delta);
      }
    };

    container.addEventListener("wheel", handler, { passive: false });
    return () => container.removeEventListener("wheel", handler);
  }, [zoomToPoint]);

  // ── Pan via mouse ──────────────────────────────────────
  const handleMouseDown = useCallback(
    (e: ReactMouseEvent<HTMLDivElement>) => {
      // Middle-click or space+click → pan
      if (e.button === 1 || isSpaceDown) {
        e.preventDefault();
        setIsPanning(true);
        panStartRef.current = {
          x: e.clientX,
          y: e.clientY,
          panX: transform.panX,
          panY: transform.panY,
        };
        return;
      }

      // Left-click on empty space
      if (e.button === 0 && e.target === e.currentTarget) {
        // Determine if this is a click or start of a drag-to-pan
        setIsPanning(true);
        panStartRef.current = {
          x: e.clientX,
          y: e.clientY,
          panX: transform.panX,
          panY: transform.panY,
        };
      }
    },
    [isSpaceDown, transform.panX, transform.panY]
  );

  useEffect(() => {
    if (!isPanning) return;

    let didDrag = false;

    const handleMove = (e: globalThis.MouseEvent) => {
      const dx = e.clientX - panStartRef.current.x;
      const dy = e.clientY - panStartRef.current.y;

      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        didDrag = true;
      }

      onTransformChange({
        zoom: transform.zoom,
        panX: panStartRef.current.panX + dx,
        panY: panStartRef.current.panY + dy,
      });
    };

    const handleUp = (e: globalThis.MouseEvent) => {
      setIsPanning(false);

      // If they didn't drag, it's a canvas click
      if (!didDrag && onCanvasClick) {
        const container = containerRef.current;
        if (container) {
          const rect = container.getBoundingClientRect();
          const canvasX =
            (e.clientX - rect.left - transform.panX) / transform.zoom;
          const canvasY =
            (e.clientY - rect.top - transform.panY) / transform.zoom;
          onCanvasClick(canvasX, canvasY);
        }
      }
    };

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };
  }, [isPanning, transform, onTransformChange, onCanvasClick]);

  // ── Space key for pan mode ─────────────────────────────
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code === "Space" && !e.repeat) {
        // Don't capture if typing in an input
        const tag = (e.target as HTMLElement).tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
        e.preventDefault();
        setIsSpaceDown(true);
      }
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        setIsSpaceDown(false);
      }
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  // ── Grid dot pattern ───────────────────────────────────
  const gridSpacing = GRID_SIZE * transform.zoom;
  const dotSize = Math.max(1, transform.zoom * 1.5);
  const offsetX = (transform.panX % gridSpacing + gridSpacing) % gridSpacing;
  const offsetY = (transform.panY % gridSpacing + gridSpacing) % gridSpacing;

  const gridStyle: React.CSSProperties = {
    backgroundImage: `radial-gradient(circle, rgba(212,165,116,0.28) ${dotSize}px, transparent ${dotSize}px)`,
    backgroundSize: `${gridSpacing}px ${gridSpacing}px`,
    backgroundPosition: `${offsetX}px ${offsetY}px`,
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative w-full h-full overflow-hidden select-none",
        "bg-cream-50",
        isPanning || isSpaceDown ? "cursor-grabbing" : "cursor-default",
        className
      )}
      style={gridStyle}
      onMouseDown={handleMouseDown}
    >
      {/* Transform container */}
      <div
        className="absolute origin-top-left"
        style={{
          transform: `translate(${transform.panX}px, ${transform.panY}px) scale(${transform.zoom})`,
          width: `${width}px`,
          height: `${height}px`,
          willChange: "transform",
        }}
      >
        {/* Canvas boundary indicator */}
        <div
          className="absolute inset-0 border border-dashed border-cream-300/50 rounded-sm pointer-events-none"
          style={{ width: `${width}px`, height: `${height}px` }}
        />
        {children}
      </div>
    </div>
  );
}

export { MIN_ZOOM, MAX_ZOOM };

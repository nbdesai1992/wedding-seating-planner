"use client";

import React, { useCallback, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

type HandlePosition =
  | "nw"
  | "ne"
  | "sw"
  | "se"
  | "n"
  | "e"
  | "s"
  | "w";

interface ResizeHandlesProps {
  /** Current element dimensions */
  width: number;
  height: number;
  /** Current zoom level — drag deltas are divided by zoom */
  zoom: number;
  /** Called during drag with new width/height */
  onResize: (width: number, height: number, dx: number, dy: number) => void;
  /** Called when drag ends */
  onResizeEnd: () => void;
  /** Minimum dimensions */
  minWidth?: number;
  minHeight?: number;
}

const HANDLE_SIZE = 8;
const HANDLE_HALF = HANDLE_SIZE / 2;

const CURSOR_MAP: Record<HandlePosition, string> = {
  nw: "nwse-resize",
  ne: "nesw-resize",
  sw: "nesw-resize",
  se: "nwse-resize",
  n: "ns-resize",
  s: "ns-resize",
  e: "ew-resize",
  w: "ew-resize",
};

/** Positions for each handle relative to the element bounds */
function getHandleCoords(
  pos: HandlePosition,
  w: number,
  h: number
): { x: number; y: number } {
  switch (pos) {
    case "nw":
      return { x: -HANDLE_HALF, y: -HANDLE_HALF };
    case "ne":
      return { x: w - HANDLE_HALF, y: -HANDLE_HALF };
    case "sw":
      return { x: -HANDLE_HALF, y: h - HANDLE_HALF };
    case "se":
      return { x: w - HANDLE_HALF, y: h - HANDLE_HALF };
    case "n":
      return { x: w / 2 - HANDLE_HALF, y: -HANDLE_HALF };
    case "s":
      return { x: w / 2 - HANDLE_HALF, y: h - HANDLE_HALF };
    case "e":
      return { x: w - HANDLE_HALF, y: h / 2 - HANDLE_HALF };
    case "w":
      return { x: -HANDLE_HALF, y: h / 2 - HANDLE_HALF };
  }
}

const HANDLE_POSITIONS: HandlePosition[] = [
  "nw",
  "ne",
  "sw",
  "se",
  "n",
  "e",
  "s",
  "w",
];

export function ResizeHandles({
  width,
  height,
  zoom,
  onResize,
  onResizeEnd,
  minWidth = 60,
  minHeight = 40,
}: ResizeHandlesProps) {
  return (
    <>
      {HANDLE_POSITIONS.map((pos) => (
        <SingleHandle
          key={pos}
          position={pos}
          width={width}
          height={height}
          zoom={zoom}
          onResize={onResize}
          onResizeEnd={onResizeEnd}
          minWidth={minWidth}
          minHeight={minHeight}
        />
      ))}
    </>
  );
}

function SingleHandle({
  position,
  width,
  height,
  zoom,
  onResize,
  onResizeEnd,
  minWidth,
  minHeight,
}: {
  position: HandlePosition;
  width: number;
  height: number;
  zoom: number;
  onResize: (w: number, h: number, dx: number, dy: number) => void;
  onResizeEnd: () => void;
  minWidth: number;
  minHeight: number;
}) {
  const isDragging = useRef(false);
  const startRef = useRef({ x: 0, y: 0, w: 0, h: 0 });

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.stopPropagation();
      e.preventDefault();
      isDragging.current = true;
      startRef.current = {
        x: e.clientX,
        y: e.clientY,
        w: width,
        h: height,
      };
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [width, height]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging.current) return;
      e.stopPropagation();

      const dx = (e.clientX - startRef.current.x) / zoom;
      const dy = (e.clientY - startRef.current.y) / zoom;

      let newW = startRef.current.w;
      let newH = startRef.current.h;
      let offsetX = 0;
      let offsetY = 0;

      // Compute new size based on which handle is being dragged
      if (position.includes("e")) {
        newW = Math.max(minWidth, startRef.current.w + dx);
      }
      if (position.includes("w")) {
        const proposedW = startRef.current.w - dx;
        if (proposedW >= minWidth) {
          newW = proposedW;
          offsetX = dx;
        }
      }
      if (position.includes("s")) {
        newH = Math.max(minHeight, startRef.current.h + dy);
      }
      if (position.includes("n")) {
        const proposedH = startRef.current.h - dy;
        if (proposedH >= minHeight) {
          newH = proposedH;
          offsetY = dy;
        }
      }

      // Shift+drag: proportional resize for corner handles
      if (e.shiftKey && position.length === 2) {
        const aspect = startRef.current.w / startRef.current.h;
        if (newW / newH > aspect) {
          newW = Math.max(minWidth, Math.round(newH * aspect));
        } else {
          newH = Math.max(minHeight, Math.round(newW / aspect));
        }
      }

      onResize(Math.round(newW), Math.round(newH), Math.round(offsetX), Math.round(offsetY));
    },
    [zoom, position, onResize, minWidth, minHeight]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging.current) return;
      isDragging.current = false;
      e.stopPropagation();
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      onResizeEnd();
    },
    [onResizeEnd]
  );

  const coords = getHandleCoords(position, width, height);
  const isCorner = position.length === 2;

  return (
    <div
      className={cn(
        "absolute z-30 pointer-events-auto",
        "border border-rose-400 bg-white shadow-sm",
        "transition-transform duration-75",
        "hover:scale-125",
        isCorner ? "rounded-sm" : "rounded-full"
      )}
      style={{
        left: `${coords.x}px`,
        top: `${coords.y}px`,
        width: `${HANDLE_SIZE}px`,
        height: `${HANDLE_SIZE}px`,
        cursor: CURSOR_MAP[position],
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    />
  );
}

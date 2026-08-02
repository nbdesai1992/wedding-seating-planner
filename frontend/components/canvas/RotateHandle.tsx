"use client";

import React, { useCallback, useRef } from "react";
import { RotateCw } from "lucide-react";

interface RotateHandleProps {
  /** Element center X relative to its container */
  centerX: number;
  /** Element center Y relative to its container */
  centerY: number;
  /** Element width for positioning the handle */
  width: number;
  /** Current zoom level */
  zoom: number;
  /** Called during rotation with angle in degrees */
  onRotate: (angle: number) => void;
  /** Called when rotation drag ends */
  onRotateEnd: () => void;
}

const HANDLE_OFFSET = -28; // px above the element

export function RotateHandle({
  centerX,
  centerY,
  width,
  zoom,
  onRotate,
  onRotateEnd,
}: RotateHandleProps) {
  const isDragging = useRef(false);
  const elementCenterRef = useRef({ x: 0, y: 0 });

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.stopPropagation();
      e.preventDefault();
      isDragging.current = true;
      (e.target as HTMLElement).setPointerCapture(e.pointerId);

      // Store the element center in screen coords
      const el = (e.target as HTMLElement).closest("[data-element-wrapper]");
      if (el) {
        const rect = el.getBoundingClientRect();
        elementCenterRef.current = {
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2,
        };
      }
    },
    []
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging.current) return;
      e.stopPropagation();

      const dx = e.clientX - elementCenterRef.current.x;
      const dy = e.clientY - elementCenterRef.current.y;
      let angle = Math.atan2(dy, dx) * (180 / Math.PI) + 90; // +90 because 0deg is "up"

      // Snap to 15-degree increments when holding shift
      if (e.shiftKey) {
        angle = Math.round(angle / 15) * 15;
      }

      // Normalize to 0-360
      angle = ((angle % 360) + 360) % 360;

      onRotate(angle);
    },
    [onRotate]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging.current) return;
      isDragging.current = false;
      e.stopPropagation();
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      onRotateEnd();
    },
    [onRotateEnd]
  );

  return (
    <>
      {/* Connector line from element top to handle */}
      <div
        className="absolute pointer-events-none"
        style={{
          left: `${width / 2}px`,
          top: `${HANDLE_OFFSET}px`,
          width: "1px",
          height: `${Math.abs(HANDLE_OFFSET)}px`,
          background: "rgba(200, 148, 107, 0.5)",
        }}
      />
      {/* Handle circle */}
      <div
        className="absolute z-30 pointer-events-auto w-5 h-5 rounded-full bg-white border border-gold-400 shadow-soft flex items-center justify-center cursor-grab hover:border-gold-500 hover:shadow-lifted transition-[border-color,box-shadow] duration-150 ease-out active:cursor-grabbing"
        style={{
          left: `${width / 2 - 10}px`,
          top: `${HANDLE_OFFSET - 10}px`,
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <RotateCw className="w-2.5 h-2.5 text-gold-500" />
      </div>
    </>
  );
}

"use client";

import React, { useState } from "react";
import {
  Type,
  Shapes,
  Users,
  Trash2,
  Circle,
  Square,
  Heart,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ElementToolbarProps {
  /** Name of the element */
  name: string;
  /** Whether this is a table (shows seat count) or feature */
  elementType: "table" | "feature";
  /** Current shape */
  shape?: string;
  /** Current seat count (tables only) */
  seatCount?: number;
  /** Width of the element — toolbar centered above */
  elementWidth: number;
  /** Callbacks */
  onRename: (newName: string) => void;
  onChangeShape?: (shape: string) => void;
  onChangeSeatCount?: (count: number) => void;
  onDelete: () => void;
}

type ActivePanel = null | "rename" | "shape" | "seats";

export function ElementToolbar({
  name,
  elementType,
  shape,
  seatCount,
  elementWidth,
  onRename,
  onChangeShape,
  onChangeSeatCount,
  onDelete,
}: ElementToolbarProps) {
  const [activePanel, setActivePanel] = useState<ActivePanel>(null);
  const [editName, setEditName] = useState(name);
  const [editSeats, setEditSeats] = useState(seatCount?.toString() || "8");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const togglePanel = (panel: ActivePanel) => {
    if (activePanel === panel) {
      setActivePanel(null);
    } else {
      setActivePanel(panel);
      if (panel === "rename") setEditName(name);
      if (panel === "seats") setEditSeats(seatCount?.toString() || "8");
    }
    setShowDeleteConfirm(false);
  };

  const handleRenameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editName.trim()) {
      onRename(editName.trim());
      setActivePanel(null);
    }
  };

  const handleSeatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const count = parseInt(editSeats, 10);
    if (count > 0 && count <= 20 && onChangeSeatCount) {
      onChangeSeatCount(count);
      setActivePanel(null);
    }
  };

  const shapeOptions =
    elementType === "table"
      ? [
          { value: "round", label: "Round", icon: Circle },
          { value: "rectangle", label: "Rectangle", icon: Square },
          { value: "oval", label: "Sweetheart", icon: Heart },
        ]
      : [
          { value: "rectangle", label: "Rectangle", icon: Square },
          { value: "circle", label: "Circle", icon: Circle },
        ];

  return (
    <div
      className="absolute z-40 pointer-events-auto"
      style={{
        left: `${elementWidth / 2}px`,
        top: "-50px",
        transform: "translateX(-50%)",
      }}
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {/* Main toolbar */}
      <div className="flex items-center gap-0.5 bg-white rounded-pill shadow-lifted border border-cream-200/80 px-1.5 py-1">
        {/* Rename */}
        <ToolbarButton
          icon={Type}
          label="Rename"
          isActive={activePanel === "rename"}
          onClick={() => togglePanel("rename")}
        />

        {/* Shape */}
        {onChangeShape && (
          <ToolbarButton
            icon={Shapes}
            label="Shape"
            isActive={activePanel === "shape"}
            onClick={() => togglePanel("shape")}
          />
        )}

        {/* Seat count */}
        {elementType === "table" && onChangeSeatCount && (
          <ToolbarButton
            icon={Users}
            label="Seats"
            isActive={activePanel === "seats"}
            onClick={() => togglePanel("seats")}
          />
        )}

        {/* Divider */}
        <div className="w-px h-5 bg-cream-200 mx-0.5" />

        {/* Delete */}
        {showDeleteConfirm ? (
          <div className="flex items-center gap-1 px-1">
            <span className="text-[10px] text-rose-500 whitespace-nowrap">
              Delete?
            </span>
            <button
              className="text-[10px] px-2 py-0.5 bg-rose-500 text-white rounded-pill press hover:bg-rose-600 transition-colors duration-150"
              onClick={() => {
                onDelete();
                setShowDeleteConfirm(false);
              }}
            >
              Yes
            </button>
            <button
              className="text-[10px] px-2 py-0.5 bg-cream-100 text-warm-gray-600 rounded-pill press hover:bg-cream-200 transition-colors duration-150"
              onClick={() => setShowDeleteConfirm(false)}
            >
              No
            </button>
          </div>
        ) : (
          <ToolbarButton
            icon={Trash2}
            label="Delete"
            isActive={false}
            onClick={() => setShowDeleteConfirm(true)}
            variant="danger"
          />
        )}
      </div>

      {/* Sub-panels */}
      {activePanel === "rename" && (
        <div className="absolute left-1/2 -translate-x-1/2 mt-1.5 bg-white rounded-card shadow-lifted border border-cream-200/80 p-2 min-w-[160px]">
          <form onSubmit={handleRenameSubmit} className="flex gap-1.5">
            <input
              autoFocus
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="flex-1 text-xs px-2.5 py-1 border border-cream-300 rounded-pill bg-cream-50 text-warm-gray-700 focus:outline-none focus:border-gold-400 focus:ring-1 focus:ring-gold-400/30 transition-[border-color,box-shadow] duration-150"
              placeholder="Enter name..."
            />
            <button
              type="submit"
              className="text-xs px-2.5 py-1 bg-rose-500 text-white rounded-pill press hover:bg-rose-600 transition-colors duration-150"
            >
              Save
            </button>
          </form>
        </div>
      )}

      {activePanel === "shape" && (
        <div className="absolute left-1/2 -translate-x-1/2 mt-1.5 bg-white rounded-card shadow-lifted border border-cream-200/80 p-1.5 min-w-[140px]">
          {shapeOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => {
                onChangeShape?.(opt.value);
                setActivePanel(null);
              }}
              className={cn(
                "flex items-center gap-2 w-full text-left px-2.5 py-1.5 rounded-pill text-xs transition-colors duration-150",
                shape === opt.value
                  ? "bg-rose-50 text-rose-600"
                  : "text-warm-gray-600 hover:bg-cream-50"
              )}
            >
              <opt.icon className="w-3 h-3" />
              {opt.label}
            </button>
          ))}
        </div>
      )}

      {activePanel === "seats" && (
        <div className="absolute left-1/2 -translate-x-1/2 mt-1.5 bg-white rounded-card shadow-lifted border border-cream-200/80 p-2 min-w-[140px]">
          <form onSubmit={handleSeatSubmit} className="flex gap-1.5">
            <input
              autoFocus
              type="number"
              min="1"
              max="20"
              value={editSeats}
              onChange={(e) => setEditSeats(e.target.value)}
              className="w-14 text-xs px-2 py-1 border border-cream-300 rounded-pill bg-cream-50 text-warm-gray-700 text-center focus:outline-none focus:border-gold-400 focus:ring-1 focus:ring-gold-400/30 transition-[border-color,box-shadow] duration-150"
            />
            <button
              type="submit"
              className="text-xs px-2 py-1 bg-rose-500 text-white rounded-pill press hover:bg-rose-600 transition-colors duration-150 flex-1"
            >
              Update
            </button>
          </form>
          <p className="text-[10px] text-warm-gray-400 mt-1.5 text-center">
            1 &ndash; 20 seats
          </p>
        </div>
      )}
    </div>
  );
}

// ── ToolbarButton ─────────────────────────────────────────

function ToolbarButton({
  icon: Icon,
  label,
  isActive,
  onClick,
  variant = "default",
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  isActive: boolean;
  onClick: () => void;
  variant?: "default" | "danger";
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={cn(
        "p-1.5 rounded-pill press transition-colors duration-150",
        isActive
          ? "bg-rose-50 text-rose-500"
          : variant === "danger"
          ? "text-warm-gray-400 hover:text-rose-500 hover:bg-rose-50"
          : "text-warm-gray-400 hover:text-warm-gray-600 hover:bg-cream-50"
      )}
    >
      <Icon className="w-3.5 h-3.5" />
    </button>
  );
}

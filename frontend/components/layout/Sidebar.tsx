"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Calendar, Users, LayoutGrid, FileText, ChevronRight } from "lucide-react";

interface SidebarItem {
  label: string;
  icon: React.ReactNode;
  href?: string;
  active?: boolean;
}

interface SidebarProps {
  eventName?: string;
  eventDate?: string;
  items?: SidebarItem[];
  activeItem?: string;
  className?: string;
}

const defaultItems: SidebarItem[] = [
  { label: "Overview", icon: <LayoutGrid size={18} /> },
  { label: "Guest List", icon: <Users size={18} /> },
  { label: "Seating Chart", icon: <Calendar size={18} /> },
  { label: "Export", icon: <FileText size={18} /> },
];

export function Sidebar({
  eventName = "My Wedding",
  eventDate,
  items = defaultItems,
  activeItem = "Overview",
  className,
}: SidebarProps) {
  return (
    <aside
      className={cn(
        "w-60 shrink-0 h-full",
        "bg-cream-100 border-r border-cream-200",
        "flex flex-col",
        className
      )}
    >
      {/* Event context header */}
      <div className="px-5 pt-6 pb-4">
        <p className="text-xs font-medium text-warm-gray-400 uppercase tracking-wider mb-1">
          Event
        </p>
        <h3 className="font-serif text-base font-semibold text-warm-gray-800 truncate">
          {eventName}
        </h3>
        {eventDate && (
          <p className="text-xs text-warm-gray-400 mt-0.5">{eventDate}</p>
        )}
        <div className="divider-gold mt-4" />
      </div>

      {/* Navigation items */}
      <nav className="flex-1 px-3 space-y-0.5">
        {items.map((item) => {
          const isActive = item.label === activeItem;
          return (
            <button
              key={item.label}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 rounded-soft",
                "text-sm transition-all duration-150",
                isActive
                  ? "bg-white text-warm-gray-800 shadow-card font-medium"
                  : "text-warm-gray-500 hover:bg-white/60 hover:text-warm-gray-700"
              )}
            >
              <span
                className={cn(
                  "shrink-0",
                  isActive ? "text-rose-400" : "text-warm-gray-400"
                )}
              >
                {item.icon}
              </span>
              <span className="flex-1 text-left">{item.label}</span>
              {isActive && (
                <ChevronRight size={14} className="text-warm-gray-300" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4">
        <div className="divider-gold mb-3" />
        <p className="text-[11px] text-warm-gray-400 text-center">
          Seated &middot; Wedding Planner
        </p>
      </div>
    </aside>
  );
}

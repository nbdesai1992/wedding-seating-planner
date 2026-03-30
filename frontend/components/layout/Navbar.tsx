"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Heart, ChevronDown, LogOut, Settings, User } from "lucide-react";

interface NavbarProps {
  userName?: string;
  className?: string;
}

export function Navbar({ userName, className }: NavbarProps) {
  const [menuOpen, setMenuOpen] = React.useState(false);

  return (
    <nav
      className={cn(
        "sticky top-0 z-40",
        "h-14 px-6 flex items-center justify-between",
        "bg-white/80 backdrop-blur-md",
        "border-b border-cream-200",
        className
      )}
    >
      {/* Logo / App Name */}
      <div className="flex items-center gap-2.5">
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-rose-100">
          <Heart size={16} className="text-rose-400 fill-rose-400" />
        </div>
        <span className="font-serif text-lg font-semibold text-warm-gray-800 tracking-tight">
          Seated
        </span>
      </div>

      {/* Right side: User menu */}
      <div className="relative">
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-soft",
            "text-sm text-warm-gray-600",
            "hover:bg-cream-100 transition-colors duration-150",
            "focus-visible:focus-ring-rose"
          )}
        >
          <div className="w-7 h-7 rounded-full bg-rose-100 flex items-center justify-center">
            <span className="text-xs font-medium text-rose-600">
              {userName ? userName.charAt(0).toUpperCase() : "U"}
            </span>
          </div>
          <span className="hidden sm:inline font-medium">
            {userName || "Account"}
          </span>
          <ChevronDown
            size={14}
            className={cn(
              "text-warm-gray-400 transition-transform duration-200",
              menuOpen && "rotate-180"
            )}
          />
        </button>

        {/* Dropdown */}
        {menuOpen && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setMenuOpen(false)}
            />
            <div className="absolute right-0 mt-1 w-48 z-20 bg-white rounded-card shadow-card-hover border border-cream-200 py-1 animate-fade-in">
              <button className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-warm-gray-600 hover:bg-cream-50 transition-colors">
                <User size={14} />
                Profile
              </button>
              <button className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-warm-gray-600 hover:bg-cream-50 transition-colors">
                <Settings size={14} />
                Settings
              </button>
              <div className="divider-gold my-1" />
              <button className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-warm-gray-500 hover:bg-cream-50 transition-colors">
                <LogOut size={14} />
                Sign out
              </button>
            </div>
          </>
        )}
      </div>
    </nav>
  );
}

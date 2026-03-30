"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Heart } from "lucide-react";
import { UserButton } from "@clerk/nextjs";

interface NavbarProps {
  className?: string;
}

export function Navbar({ className }: NavbarProps) {
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

      {/* Right side: Clerk UserButton */}
      <UserButton
        appearance={{
          elements: {
            avatarBox: "w-8 h-8 ring-2 ring-rose-100",
            userButtonPopoverCard:
              "shadow-card-hover border border-cream-200 rounded-card",
            userButtonPopoverActionButton:
              "text-warm-gray-600 hover:bg-cream-50",
            userButtonPopoverActionButtonText: "text-warm-gray-600 text-sm",
            userButtonPopoverActionButtonIcon: "text-warm-gray-400",
            userButtonPopoverFooter: "hidden",
          },
        }}
      />
    </nav>
  );
}

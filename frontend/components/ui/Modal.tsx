"use client";

import React, { useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  size?: "sm" | "md" | "lg";
}

const sizeStyles = {
  sm: "max-w-md",
  md: "max-w-lg",
  lg: "max-w-2xl",
};

export function Modal({
  open,
  onClose,
  children,
  title,
  size = "md",
}: ModalProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (open) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, handleKeyDown]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-warm-gray-900/30 backdrop-blur-modal animate-fade-in"
        onClick={onClose}
      />

      {/* Content */}
      <div
        className={cn(
          "relative w-full bg-white rounded-card-lg shadow-modal",
          "border border-cream-200/80",
          "animate-fade-in",
          sizeStyles[size]
        )}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        {/* Header */}
        {title && (
          <div className="flex items-center justify-between px-6 pt-6 pb-0">
            <h2 className="font-serif text-xl font-semibold text-warm-gray-800">
              {title}
            </h2>
            <button
              onClick={onClose}
              className={cn(
                "p-1.5 rounded-pill text-warm-gray-400",
                "hover:text-warm-gray-600 hover:bg-cream-100",
                "transition-colors duration-150",
                "focus-visible:focus-ring-rose"
              )}
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>
        )}

        {/* Divider */}
        {title && <div className="divider-gold mx-6 mt-4" />}

        {/* Body */}
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

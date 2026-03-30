"use client";

import React from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "ghost" | "gold";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: [
    "bg-rose-400 text-white",
    "hover:bg-rose-600 active:bg-rose-700",
    "shadow-sm hover:shadow-md",
    "focus-visible:focus-ring-rose",
  ].join(" "),
  secondary: [
    "bg-cream-100 text-warm-gray-700 border border-cream-300",
    "hover:bg-cream-200 active:bg-cream-300",
    "focus-visible:focus-ring-rose",
  ].join(" "),
  ghost: [
    "bg-transparent text-warm-gray-600",
    "hover:bg-cream-100 active:bg-cream-200",
    "focus-visible:focus-ring-rose",
  ].join(" "),
  gold: [
    "bg-gold-400 text-white",
    "hover:bg-gold-500 active:bg-gold-600",
    "shadow-sm hover:shadow-md",
    "focus-visible:focus-ring-gold",
  ].join(" "),
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-xs rounded-soft",
  md: "px-4 py-2 text-sm rounded-soft",
  lg: "px-6 py-2.5 text-sm rounded-card",
};

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  icon,
  className,
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2",
        "font-medium transition-all duration-150 ease-out",
        "select-none whitespace-nowrap",
        variantStyles[variant],
        sizeStyles[size],
        (disabled || loading) && "opacity-50 cursor-not-allowed pointer-events-none",
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <svg
          className="animate-spin h-4 w-4"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
      ) : icon ? (
        <span className="shrink-0">{icon}</span>
      ) : null}
      {children}
    </button>
  );
}

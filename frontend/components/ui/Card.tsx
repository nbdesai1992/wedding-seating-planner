"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  padding?: "none" | "sm" | "md" | "lg";
  onClick?: () => void;
}

const paddingStyles = {
  none: "",
  sm: "p-4",
  md: "p-6",
  lg: "p-8",
};

export function Card({
  children,
  className,
  hover = false,
  padding = "md",
  onClick,
}: CardProps) {
  const Component = onClick ? "button" : "div";

  return (
    <Component
      className={cn(
        "bg-white rounded-card-lg shadow-soft",
        "border border-cream-200/80",
        paddingStyles[padding],
        hover &&
          "transition-[box-shadow,transform] duration-300 ease-out hover:shadow-lifted hover:-translate-y-[3px]",
        onClick && "cursor-pointer text-left w-full",
        className
      )}
      onClick={onClick}
    >
      {children}
    </Component>
  );
}

interface CardHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export function CardHeader({ children, className }: CardHeaderProps) {
  return (
    <div className={cn("mb-4", className)}>
      {children}
      <div className="divider-gold mt-4" />
    </div>
  );
}

interface CardTitleProps {
  children: React.ReactNode;
  className?: string;
}

export function CardTitle({ children, className }: CardTitleProps) {
  return (
    <h3 className={cn("font-serif text-lg font-semibold text-warm-gray-800", className)}>
      {children}
    </h3>
  );
}

interface EyebrowProps {
  children: React.ReactNode;
  tone?: "muted" | "gold" | "rose";
  className?: string;
}

/** Uppercase, letter-spaced eyebrow label (editorial ornament). */
export function Eyebrow({ children, tone = "muted", className }: EyebrowProps) {
  return (
    <p
      className={cn(
        "eyebrow",
        tone === "gold" && "eyebrow-gold",
        tone === "rose" && "eyebrow-rose",
        className
      )}
    >
      {children}
    </p>
  );
}

interface SectionHeaderProps {
  title: React.ReactNode;
  eyebrow?: string;
  action?: React.ReactNode;
  className?: string;
}

/**
 * Editorial section header: serif heading + hairline rule that fills the
 * remaining row width — whitespace and hairlines instead of boxes.
 */
export function SectionHeader({
  title,
  eyebrow,
  action,
  className,
}: SectionHeaderProps) {
  return (
    <div className={cn(className)}>
      {eyebrow && <Eyebrow tone="gold" className="mb-2">{eyebrow}</Eyebrow>}
      <div className="flex items-center gap-4">
        <h2 className="font-serif text-xl font-medium text-warm-gray-800 shrink-0">
          {title}
        </h2>
        <div className="hairline" aria-hidden="true" />
        {action && <div className="shrink-0">{action}</div>}
      </div>
    </div>
  );
}

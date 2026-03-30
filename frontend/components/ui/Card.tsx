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
        "bg-white rounded-card shadow-card",
        "border border-cream-200",
        paddingStyles[padding],
        hover && "transition-all duration-200 ease-out hover:shadow-card-hover hover:-translate-y-0.5",
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

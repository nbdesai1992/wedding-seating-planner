"use client";

import React, { forwardRef } from "react";
import { cn } from "@/lib/utils";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, className, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-medium text-warm-gray-700"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            "w-full px-3 py-2 text-sm",
            "bg-white border rounded-soft",
            "text-warm-gray-800 placeholder:text-warm-gray-400",
            "transition-all duration-150 ease-out",
            error
              ? "border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-200 focus:ring-offset-1"
              : "border-cream-300 hover:border-rose-200 focus:border-rose-400 focus:ring-2 focus:ring-rose-200 focus:ring-offset-1",
            "focus:outline-none",
            className
          )}
          {...props}
        />
        {error && (
          <p className="text-xs text-red-500 mt-0.5">{error}</p>
        )}
        {hint && !error && (
          <p className="text-xs text-warm-gray-400 mt-0.5">{hint}</p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

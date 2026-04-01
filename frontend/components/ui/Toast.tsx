"use client";

import React, { useEffect, useState } from "react";
import { CheckCircle, Info, AlertCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type ToastVariant = "success" | "info" | "error";

export interface ToastData {
  id: string;
  message: string;
  variant: ToastVariant;
  duration?: number;
}

interface ToastProps {
  toast: ToastData;
  onDismiss: (id: string) => void;
}

const variantConfig: Record<
  ToastVariant,
  { bg: string; border: string; icon: string; iconBg: string; text: string }
> = {
  success: {
    bg: "bg-rose-50",
    border: "border-rose-200",
    icon: "text-rose-500",
    iconBg: "bg-rose-100",
    text: "text-warm-gray-700",
  },
  info: {
    bg: "bg-cream-100",
    border: "border-cream-300",
    icon: "text-gold-500",
    iconBg: "bg-cream-200",
    text: "text-warm-gray-700",
  },
  error: {
    bg: "bg-red-50",
    border: "border-red-200",
    icon: "text-red-500",
    iconBg: "bg-red-100",
    text: "text-red-800",
  },
};

const variantIcons: Record<ToastVariant, React.ComponentType<{ className?: string }>> = {
  success: CheckCircle,
  info: Info,
  error: AlertCircle,
};

export function Toast({ toast, onDismiss }: ToastProps) {
  const [isExiting, setIsExiting] = useState(false);
  const config = variantConfig[toast.variant];
  const Icon = variantIcons[toast.variant];
  const duration = toast.duration ?? 4000;

  useEffect(() => {
    const dismissTimer = setTimeout(() => {
      setIsExiting(true);
    }, duration);

    return () => clearTimeout(dismissTimer);
  }, [duration]);

  useEffect(() => {
    if (isExiting) {
      const removeTimer = setTimeout(() => {
        onDismiss(toast.id);
      }, 300);
      return () => clearTimeout(removeTimer);
    }
  }, [isExiting, onDismiss, toast.id]);

  function handleDismiss() {
    setIsExiting(true);
  }

  return (
    <div
      role="alert"
      className={cn(
        "flex items-start gap-3 px-4 py-3 rounded-card border shadow-card-hover",
        "min-w-[280px] max-w-[380px]",
        "transition-all duration-300 ease-out",
        config.bg,
        config.border,
        isExiting
          ? "opacity-0 translate-x-4 scale-95"
          : "opacity-100 translate-x-0 scale-100 animate-toast-in"
      )}
    >
      <div
        className={cn(
          "w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5",
          config.iconBg
        )}
      >
        <Icon className={cn("w-3.5 h-3.5", config.icon)} />
      </div>

      <p className={cn("text-sm leading-snug flex-1 pt-0.5", config.text)}>
        {toast.message}
      </p>

      <button
        onClick={handleDismiss}
        className="shrink-0 p-0.5 rounded-soft text-warm-gray-400 hover:text-warm-gray-600 hover:bg-warm-gray-100/50 transition-colors"
        aria-label="Dismiss notification"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

const toastKeyframes = `
@keyframes toastSlideIn {
  from {
    opacity: 0;
    transform: translateX(16px) scale(0.96);
  }
  to {
    opacity: 1;
    transform: translateX(0) scale(1);
  }
}
.animate-toast-in {
  animation: toastSlideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
`;

export function ToastContainer({
  toasts,
  onDismiss,
}: {
  toasts: ToastData[];
  onDismiss: (id: string) => void;
}) {
  if (toasts.length === 0) return null;

  return (
    <>
      <style>{toastKeyframes}</style>
      <div
        className="fixed bottom-6 right-6 z-[100] flex flex-col-reverse gap-2.5 pointer-events-none"
        aria-live="polite"
        aria-label="Notifications"
      >
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto">
            <Toast toast={toast} onDismiss={onDismiss} />
          </div>
        ))}
      </div>
    </>
  );
}

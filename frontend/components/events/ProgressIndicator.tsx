"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Check,
  Heart,
  Users,
  LayoutGrid,
  Armchair,
  FileDown,
} from "lucide-react";
import { getLayout, type Layout } from "@/lib/layout";

// ── Types ─────────────────────────────────────────────────

interface Step {
  key: string;
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  isComplete: boolean;
  subtitle?: string;
}

interface ProgressIndicatorProps {
  eventId: string;
  guestCount: number;
}

// ── Component ─────────────────────────────────────────────

export function ProgressIndicator({
  eventId,
  guestCount,
}: ProgressIndicatorProps) {
  const pathname = usePathname();
  const [layout, setLayout] = useState<Layout | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const data = await getLayout(eventId);
        if (!cancelled) setLayout(data);
      } catch {
        // Layout doesn't exist yet — that's fine
      } finally {
        if (!cancelled) setLoaded(true);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [eventId]);

  const basePath = `/events/${eventId}`;

  // ── Compute completion stats ──
  const hasLayout = layout !== null && layout.tables.length > 0;
  const tableCount = layout?.tables.length ?? 0;
  const seatedCount =
    layout?.tables.reduce(
      (sum, t) =>
        sum + (t.seats?.filter((s) => s.guest_id !== null).length ?? 0),
      0
    ) ?? 0;
  const allSeated = guestCount > 0 && seatedCount >= guestCount;
  const hasAnySeating = seatedCount > 0;

  // ── Build steps ──
  const steps: Step[] = [
    {
      key: "event",
      label: "Event",
      href: basePath,
      icon: Heart,
      isComplete: true,
    },
    {
      key: "guests",
      label: "Guests",
      href: `${basePath}/guests`,
      icon: Users,
      isComplete: guestCount > 0,
      subtitle:
        guestCount > 0
          ? `${guestCount} guest${guestCount !== 1 ? "s" : ""}`
          : "No guests",
    },
    {
      key: "layout",
      label: "Layout",
      href: `${basePath}/seating`,
      icon: LayoutGrid,
      isComplete: hasLayout,
      subtitle: hasLayout
        ? `${tableCount} table${tableCount !== 1 ? "s" : ""}`
        : "Not set up",
    },
    {
      key: "seating",
      label: "Seating",
      href: `${basePath}/seating`,
      icon: Armchair,
      isComplete: allSeated,
      subtitle:
        guestCount > 0 ? `${seatedCount}/${guestCount} seated` : undefined,
    },
    {
      key: "export",
      label: "Export",
      href: `${basePath}/export`,
      icon: FileDown,
      isComplete: false,
      subtitle: hasAnySeating ? "Ready" : undefined,
    },
  ];

  // ── Determine active step from pathname ──
  const activeIndex = (() => {
    if (pathname.includes("/export")) return 4;
    if (pathname.includes("/seating")) {
      // If layout isn't set up, highlight the Layout step; otherwise Seating
      return hasLayout ? 3 : 2;
    }
    if (pathname.includes("/guests")) return 1;
    return 0;
  })();

  if (!loaded) {
    return (
      <div className="mb-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="h-3 w-16 rounded-pill bg-cream-200 animate-pulse" />
        </div>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-2.5 mb-2.5">
            <div className="w-5 h-5 rounded-full bg-cream-200 animate-pulse" />
            <div className="h-3 w-12 rounded-pill bg-cream-200 animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="mb-5">
      {/* Section label */}
      <p className="eyebrow mb-3">Your Journey</p>

      {/* ── Desktop: vertical stepper with pill segments ── */}
      <div className="hidden md:block">
        {steps.map((step, i) => {
          const isActive = i === activeIndex;
          const isLast = i === steps.length - 1;
          const Icon = step.icon;
          const isExportDisabled =
            step.key === "export" && !hasAnySeating;

          // Line color: rose if both ends complete, gradient at boundary, cream otherwise
          const lineColor =
            step.isComplete && steps[i + 1]?.isComplete
              ? "bg-rose-300"
              : step.isComplete
                ? "bg-gradient-to-b from-rose-300 to-cream-300"
                : "bg-cream-300";

          return (
            <div key={step.key}>
              <Link
                href={isExportDisabled ? "#" : step.href}
                onClick={
                  isExportDisabled ? (e) => e.preventDefault() : undefined
                }
                className={`group flex items-center gap-2.5 rounded-pill -mx-2.5 px-2.5 py-1.5 transition-[background-color,border-color,box-shadow] duration-200 ease-out border ${
                  isActive
                    ? "bg-white border-gold-300/70 shadow-soft"
                    : "border-transparent"
                } ${
                  isExportDisabled
                    ? "cursor-default opacity-50"
                    : "cursor-pointer"
                }`}
              >
                {/* Step circle */}
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition-[background-color,border-color,color] duration-200 ${
                    step.isComplete
                      ? "bg-rose-400 text-white shadow-sm"
                      : isActive
                        ? "bg-white border-2 border-gold-400 text-gold-500"
                        : "bg-cream-200 text-warm-gray-400 group-hover:bg-cream-300"
                  }`}
                >
                  {step.isComplete ? (
                    <Check className="w-2.5 h-2.5" strokeWidth={3} />
                  ) : (
                    <Icon className="w-2.5 h-2.5" />
                  )}
                </div>

                {/* Label + subtitle */}
                <div className="flex-1 min-w-0">
                  <span
                    className={`text-ui-xs font-medium leading-none transition-colors duration-150 ${
                      isActive
                        ? "text-gold-600"
                        : step.isComplete
                          ? "text-warm-gray-700"
                          : "text-warm-gray-400 group-hover:text-warm-gray-500"
                    }`}
                  >
                    {step.label}
                  </span>
                  {step.subtitle && (
                    <span
                      className={`block text-[10px] leading-tight mt-0.5 ${
                        isActive ? "text-gold-400" : "text-warm-gray-400"
                      }`}
                    >
                      {step.subtitle}
                    </span>
                  )}
                </div>
              </Link>

              {/* Connecting line between steps */}
              {!isLast && (
                <div className="flex items-stretch ml-[9px]">
                  <div className={`w-px h-2.5 ${lineColor}`} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Mobile: compact horizontal stepper ── */}
      <div className="md:hidden">
        <div className="flex items-center gap-0 relative px-1">
          {steps.map((step, i) => {
            const isActive = i === activeIndex;
            const isLast = i === steps.length - 1;
            const isExportDisabled =
              step.key === "export" && !hasAnySeating;

            return (
              <React.Fragment key={step.key}>
                <Link
                  href={isExportDisabled ? "#" : step.href}
                  onClick={
                    isExportDisabled ? (e) => e.preventDefault() : undefined
                  }
                  className={`flex flex-col items-center relative z-10 ${
                    isExportDisabled ? "opacity-40" : ""
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center transition-[background-color,border-color,color] duration-200 ${
                      step.isComplete
                        ? "bg-rose-400 text-white"
                        : isActive
                          ? "bg-white border-2 border-gold-400 text-gold-500"
                          : "bg-cream-200 text-warm-gray-400"
                    }`}
                  >
                    {step.isComplete ? (
                      <Check className="w-2.5 h-2.5" strokeWidth={3} />
                    ) : (
                      <step.icon className="w-2.5 h-2.5" />
                    )}
                  </div>
                  <span
                    className={`text-[9px] mt-0.5 font-medium ${
                      isActive
                        ? "text-gold-500"
                        : step.isComplete
                          ? "text-warm-gray-600"
                          : "text-warm-gray-400"
                    }`}
                  >
                    {step.label}
                  </span>
                </Link>
                {/* Connecting line */}
                {!isLast && (
                  <div
                    className={`flex-1 h-px mx-0.5 mt-[-10px] ${
                      step.isComplete && steps[i + 1]?.isComplete
                        ? "bg-rose-300"
                        : step.isComplete
                          ? "bg-gradient-to-r from-rose-300 to-cream-300"
                          : "bg-cream-300"
                    }`}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>
    </div>
  );
}

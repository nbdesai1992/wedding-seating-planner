"use client";

import React from "react";
import { LayoutDashboard, GripVertical, ListChecks, FileDown } from "lucide-react";

const features = [
  {
    icon: LayoutDashboard,
    title: "Describe Your Venue, See It Come to Life",
    description:
      "Tell us about your space — the shape, the size, the style — and watch your layout appear instantly. No measuring tape required.",
  },
  {
    icon: GripVertical,
    title: "Drag, Drop, Done",
    description:
      "Assign guests to seats with intuitive drag-and-drop. Move people around until everything feels just right.",
  },
  {
    icon: ListChecks,
    title: "Manage Every Detail",
    description:
      "Guest lists, meal preferences, groups, plus-ones — everything in one place so nothing falls through the cracks.",
  },
  {
    icon: FileDown,
    title: "Export a Beautiful Seating Chart",
    description:
      "Download a print-ready PDF of your seating chart in one click. Perfect for the welcome table.",
  },
];

export function Features() {
  return (
    <section className="relative py-24 sm:py-32">
      <div className="max-w-6xl mx-auto px-6">
        {/* Section header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-serif font-semibold text-warm-gray-800 mb-4">
            Everything You Need, Nothing You Don&rsquo;t
          </h2>
          <div className="divider-gold mx-auto max-w-[200px] mt-5" />
        </div>

        {/* Feature grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, i) => {
            const Icon = feature.icon;
            return (
              <div
                key={i}
                className="landing-fade-in group relative rounded-card p-7 transition-all duration-300 hover:-translate-y-1"
                style={{
                  background: "#FFFCF8",
                  border: "1px solid #F5F0EB",
                  boxShadow:
                    "0 1px 3px 0 rgba(107, 91, 91, 0.05), 0 1px 2px -1px rgba(107, 91, 91, 0.04)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow =
                    "0 8px 24px -4px rgba(107, 91, 91, 0.1), 0 2px 8px -2px rgba(107, 91, 91, 0.06)";
                  e.currentTarget.style.borderColor = "#F0D0D4";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow =
                    "0 1px 3px 0 rgba(107, 91, 91, 0.05), 0 1px 2px -1px rgba(107, 91, 91, 0.04)";
                  e.currentTarget.style.borderColor = "#F5F0EB";
                }}
              >
                {/* Gold accent line at top */}
                <div
                  className="absolute top-0 left-7 right-7 h-px"
                  style={{
                    background:
                      "linear-gradient(90deg, transparent, #D4A574 50%, transparent)",
                    opacity: 0.4,
                  }}
                />

                {/* Icon */}
                <div
                  className="w-11 h-11 rounded-full flex items-center justify-center mb-5"
                  style={{ background: "#FDF2F2" }}
                >
                  <Icon size={20} style={{ color: "#D4A574" }} strokeWidth={1.8} />
                </div>

                {/* Content */}
                <h3 className="text-base font-serif font-semibold text-warm-gray-800 mb-2.5 leading-snug">
                  {feature.title}
                </h3>
                <p className="text-sm text-warm-gray-400 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

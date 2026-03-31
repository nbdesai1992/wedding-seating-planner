"use client";

import React from "react";
import { CalendarHeart, UserPlus, Armchair } from "lucide-react";

const steps = [
  {
    number: "1",
    icon: CalendarHeart,
    title: "Set Up Your Event",
    description:
      "Create your event and describe your venue. Whether it's a grand ballroom or an intimate garden, we'll set the stage.",
  },
  {
    number: "2",
    icon: UserPlus,
    title: "Add Your Guests",
    description:
      "Import your guest list or add them one by one. Track RSVPs, meal choices, and who should sit together.",
  },
  {
    number: "3",
    icon: Armchair,
    title: "Design Your Seating",
    description:
      "Arrange your tables, assign your guests, and export a gorgeous seating chart — ready for your welcome table.",
  },
];

export function HowItWorks() {
  return (
    <section
      className="relative py-24 sm:py-32"
      style={{ background: "#FFF8F0" }}
    >
      <div className="max-w-5xl mx-auto px-6">
        {/* Section header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-serif font-semibold text-warm-gray-800 mb-4">
            Three Simple Steps
          </h2>
          <p className="text-warm-gray-400 max-w-lg mx-auto">
            From your guest list to a finished seating chart in minutes — not hours.
          </p>
          <div className="divider-gold mx-auto max-w-[200px] mt-5" />
        </div>

        {/* Steps */}
        <div className="relative">
          {/* Connecting line — visible on desktop */}
          <div
            className="hidden lg:block absolute top-[52px] left-[calc(16.67%+28px)] right-[calc(16.67%+28px)] h-px"
            style={{
              background:
                "linear-gradient(90deg, #D4A574, #E8B4B8, #D4A574)",
              opacity: 0.35,
            }}
          />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 lg:gap-8">
            {steps.map((step, i) => {
              const Icon = step.icon;
              return (
                <div
                  key={i}
                  className="landing-fade-in relative flex flex-col items-center text-center"
                >
                  {/* Number circle */}
                  <div
                    className="relative z-10 w-[56px] h-[56px] rounded-full flex items-center justify-center mb-6 text-xl font-serif font-semibold"
                    style={{
                      background:
                        "linear-gradient(135deg, #D4A574 0%, #C9956B 100%)",
                      color: "white",
                      boxShadow: "0 4px 16px rgba(212, 165, 116, 0.3)",
                    }}
                  >
                    {step.number}
                  </div>

                  {/* Icon */}
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center mb-4"
                    style={{ background: "rgba(232, 180, 184, 0.15)" }}
                  >
                    <Icon size={18} style={{ color: "#C4848A" }} strokeWidth={1.8} />
                  </div>

                  {/* Content */}
                  <h3 className="text-lg font-serif font-semibold text-warm-gray-800 mb-2">
                    {step.title}
                  </h3>
                  <p className="text-sm text-warm-gray-400 leading-relaxed max-w-xs">
                    {step.description}
                  </p>

                  {/* Mobile connecting dots */}
                  {i < steps.length - 1 && (
                    <div className="lg:hidden flex flex-col items-center gap-1.5 mt-8">
                      <div
                        className="w-1 h-1 rounded-full"
                        style={{ background: "#D4A574", opacity: 0.4 }}
                      />
                      <div
                        className="w-1 h-1 rounded-full"
                        style={{ background: "#D4A574", opacity: 0.3 }}
                      />
                      <div
                        className="w-1 h-1 rounded-full"
                        style={{ background: "#D4A574", opacity: 0.2 }}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

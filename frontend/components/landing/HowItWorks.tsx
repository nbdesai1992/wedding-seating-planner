"use client";

import React from "react";

const steps = [
  {
    number: "01",
    title: "Create Your Event",
    description:
      "Set up your event and describe your venue in your own words. Whether it's a grand ballroom, a rustic barn, or an intimate garden, your layout appears in seconds.",
    accent: "#D4A574",
  },
  {
    number: "02",
    title: "Build Your Guest List",
    description:
      "Import your guest list or add guests one by one. Track RSVPs, meal choices, seating groups, and plus-ones, all in one organized view.",
    accent: "#E8B4B8",
  },
  {
    number: "03",
    title: "Design Your Seating",
    description:
      "Drag guests to seats, rearrange tables, and perfect every detail. When you're done, export a gorgeous PDF for your welcome table.",
    accent: "#C9956B",
  },
];

export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="relative py-24 sm:py-32 overflow-hidden"
      style={{
        /* Feathered translucent wash — global gradient reads through, no band edges */
        background:
          "linear-gradient(180deg, transparent 0%, rgba(255, 248, 240, 0.4) 35%, rgba(253, 242, 242, 0.35) 65%, transparent 100%)",
      }}
    >
      {/* Decorative background elements */}
      <div
        className="absolute top-0 right-0 w-72 h-72 rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(212, 165, 116, 0.06) 0%, transparent 70%)",
          transform: "translate(30%, -30%)",
        }}
      />
      <div
        className="absolute bottom-0 left-0 w-96 h-96 rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(232, 180, 184, 0.06) 0%, transparent 70%)",
          transform: "translate(-30%, 30%)",
        }}
      />

      <div className="relative z-10 max-w-5xl mx-auto px-6">
        {/* Section header */}
        <div className="text-center mb-20">
          <p className="eyebrow eyebrow-gold mb-4">The Process</p>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-semibold text-warm-gray-900 mb-4">
            Three Simple Steps
          </h2>
          <p className="text-warm-gray-400 max-w-md mx-auto text-base">
            From your guest list to a finished seating chart in minutes, not hours.
          </p>
          <div className="ornament-divider mx-auto max-w-[220px] mt-7">
            <span className="ornament-dot" />
          </div>
        </div>

        {/* Steps with flowing connection */}
        <div className="relative">
          {/* Flowing gold SVG curve connecting steps — desktop only */}
          <svg
            className="hidden lg:block absolute inset-0 w-full h-full pointer-events-none"
            viewBox="0 0 900 400"
            fill="none"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <path
              d="M 150 80 C 300 80, 300 200, 450 200 C 600 200, 600 80, 750 80"
              stroke="url(#goldCurve)"
              strokeWidth="2"
              strokeDasharray="6 4"
              opacity="0.35"
            />
            <defs>
              <linearGradient id="goldCurve" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#D4A574" />
                <stop offset="50%" stopColor="#E8B4B8" />
                <stop offset="100%" stopColor="#C9956B" />
              </linearGradient>
            </defs>
          </svg>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-16 lg:gap-8">
            {steps.map((step, i) => (
              <div
                key={i}
                className={`landing-fade-in relative flex flex-col items-center text-center ${
                  i === 1 ? "lg:mt-24" : ""
                }`}
              >
                {/* Large serif step number */}
                <div className="relative mb-6">
                  <span
                    className="text-6xl sm:text-7xl font-serif font-semibold leading-none"
                    style={{
                      background: `linear-gradient(135deg, ${step.accent}, ${step.accent}88)`,
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                      backgroundClip: "text",
                    }}
                  >
                    {step.number}
                  </span>
                  {/* Decorative dot */}
                  <div
                    className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-8 h-1 rounded-full"
                    style={{ background: step.accent, opacity: 0.3 }}
                  />
                </div>

                {/* Card */}
                <div
                  className="rounded-card-lg p-7 w-full shadow-soft hover:shadow-lifted hover:-translate-y-[3px] transition-[box-shadow,transform] duration-300 ease-out"
                  style={{
                    background: "rgba(255, 255, 255, 0.65)",
                    border: "1px solid rgba(255, 255, 255, 0.7)",
                    backdropFilter: "blur(14px)",
                    WebkitBackdropFilter: "blur(14px)",
                  }}
                >
                  <h3 className="text-xl font-serif font-semibold text-warm-gray-900 mb-3">
                    {step.title}
                  </h3>
                  <p className="text-sm leading-relaxed" style={{ color: "#8B7D7D" }}>
                    {step.description}
                  </p>
                </div>

                {/* Mobile connecting element */}
                {i < steps.length - 1 && (
                  <div className="lg:hidden flex flex-col items-center gap-1 mt-6">
                    <div className="w-0.5 h-8" style={{ background: `linear-gradient(to bottom, ${step.accent}40, transparent)` }} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

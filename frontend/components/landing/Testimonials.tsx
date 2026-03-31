"use client";

import React from "react";

const testimonials = [
  {
    quote:
      "Planning seating for 180 guests felt impossible until I found Seated. I described my venue and had a full layout in seconds. My mother-in-law was actually impressed.",
    name: "Jessica R.",
    location: "Charleston, SC",
    initials: "JR",
    accentBg: "#F9E8E8",
    accentColor: "#A86A70",
  },
  {
    quote:
      "I changed my table arrangement probably fifty times and never once felt frustrated. The drag-and-drop is so smooth. My seating chart PDF looked gorgeous on the welcome table.",
    name: "Priya K.",
    location: "San Francisco, CA",
    initials: "PK",
    accentBg: "#FFF8F0",
    accentColor: "#C9956B",
  },
  {
    quote:
      "We had a rehearsal dinner AND reception to plan. Being able to manage both events separately with their own layouts saved my sanity.",
    name: "Amanda T.",
    location: "Nashville, TN",
    initials: "AT",
    accentBg: "#FDF2F2",
    accentColor: "#8C5056",
  },
];

export function Testimonials() {
  return (
    <section
      id="testimonials"
      className="relative py-24 sm:py-32 overflow-hidden"
      style={{ background: "#FFFCF8" }}
    >
      {/* Decorative background */}
      <div
        className="absolute top-12 left-8 w-64 h-64 rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(232, 180, 184, 0.06) 0%, transparent 70%)",
        }}
      />
      <div
        className="absolute bottom-12 right-8 w-48 h-48 rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(212, 165, 116, 0.06) 0%, transparent 70%)",
        }}
      />

      <div className="relative z-10 max-w-6xl mx-auto px-6">
        {/* Section header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-bold text-warm-gray-900 mb-4">
            Loved by Brides Everywhere
          </h2>
          <p className="text-warm-gray-400 max-w-md mx-auto text-base">
            Real stories from couples who planned their perfect day with Seated
          </p>
          <div className="divider-gold mx-auto max-w-[160px] mt-6" />
        </div>

        {/* Testimonial cards — staggered */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
          {testimonials.map((t, i) => (
            <div
              key={i}
              className={`landing-fade-in relative ${i === 1 ? "md:-mt-4" : i === 2 ? "md:mt-4" : ""}`}
            >
              <div
                className="relative rounded-xl p-8 transition-all duration-300 hover:-translate-y-1 h-full"
                style={{
                  background: "linear-gradient(155deg, #FFFCF8 0%, #FDF2F2 100%)",
                  border: "1px solid rgba(240, 208, 212, 0.5)",
                  boxShadow: "0 4px 20px rgba(107, 91, 91, 0.06)",
                }}
              >
                {/* Large decorative quote mark */}
                <div className="mb-5">
                  <span
                    className="text-5xl font-serif leading-none select-none"
                    style={{ color: "#D4A574", opacity: 0.25 }}
                  >
                    &ldquo;
                  </span>
                </div>

                {/* Quote text */}
                <blockquote
                  className="text-sm sm:text-base leading-relaxed mb-8"
                  style={{ color: "#6B5B5B" }}
                >
                  {t.quote}
                </blockquote>

                {/* Gold divider */}
                <div
                  className="h-px w-10 mb-5"
                  style={{
                    background: "linear-gradient(90deg, #D4A574, transparent)",
                    opacity: 0.5,
                  }}
                />

                {/* Attribution */}
                <div className="flex items-center gap-3">
                  {/* Avatar */}
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                    style={{
                      background: t.accentBg,
                      color: t.accentColor,
                      fontFamily: "Inter, sans-serif",
                    }}
                  >
                    {t.initials}
                  </div>
                  <div>
                    <p className="font-serif font-bold text-sm text-warm-gray-900">
                      {t.name}
                    </p>
                    <p className="text-xs" style={{ color: "#8B7D7D" }}>
                      {t.location}
                    </p>
                  </div>
                </div>

                {/* Decorative corner floral accent */}
                <svg
                  className="absolute top-4 right-4 w-10 h-10 pointer-events-none"
                  viewBox="0 0 40 40"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M20 5 Q28 12, 25 20 Q32 18, 35 20 Q32 22, 25 20 Q28 28, 20 35 Q12 28, 15 20 Q8 22, 5 20 Q8 18, 15 20 Q12 12, 20 5Z"
                    stroke="#D4A574"
                    strokeWidth="0.5"
                    opacity="0.15"
                  />
                </svg>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

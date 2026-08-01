"use client";

import React from "react";
import Link from "next/link";

export function FinalCTA() {
  return (
    <section className="relative py-24 sm:py-32 overflow-hidden">
      {/* Translucent rose wash — the global gradient reads through */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, transparent 0%, rgba(249, 232, 232, 0.5) 32%, rgba(255, 248, 240, 0.4) 68%, transparent 100%)",
        }}
      />

      {/* Decorative elements */}
      <div
        className="absolute top-8 right-12 w-48 h-48 rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(212, 165, 116, 0.1) 0%, transparent 70%)",
        }}
      />
      <div
        className="absolute bottom-8 left-12 w-64 h-64 rounded-full"
        style={{
          background: "radial-gradient(circle, rgba(232, 180, 184, 0.08) 0%, transparent 70%)",
        }}
      />

      {/* Gold sparkle dots */}
      {[
        { x: "10%", y: "20%", s: 3 },
        { x: "85%", y: "15%", s: 2 },
        { x: "90%", y: "70%", s: 2.5 },
        { x: "15%", y: "80%", s: 2 },
        { x: "50%", y: "10%", s: 2 },
        { x: "70%", y: "85%", s: 3 },
      ].map((dot, i) => (
        <div
          key={i}
          className="absolute rounded-full"
          style={{
            left: dot.x,
            top: dot.y,
            width: dot.s,
            height: dot.s,
            background: "#D4A574",
            opacity: 0.2,
          }}
        />
      ))}

      {/* Content */}
      <div className="relative z-10 max-w-2xl mx-auto px-6 text-center">
        {/* Decorative floral SVG */}
        <svg
          className="mx-auto mb-6 w-12 h-12"
          viewBox="0 0 48 48"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M24 4 Q32 12, 28 24 Q36 20, 44 24 Q36 28, 28 24 Q32 36, 24 44 Q16 36, 20 24 Q12 28, 4 24 Q12 20, 20 24 Q16 12, 24 4Z"
            stroke="#D4A574"
            strokeWidth="1"
            opacity="0.4"
          />
          <circle cx="24" cy="24" r="3" fill="#D4A574" opacity="0.25" />
        </svg>

        {/* Eyebrow */}
        <p className="eyebrow-gold mb-5 font-sans font-medium uppercase text-ui-xs tracking-eyebrow-wide">
          Begin Today
        </p>

        {/* Headline */}
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-semibold text-warm-gray-900 mb-5 leading-tight">
          Your Perfect Day Deserves
          <span className="block" style={{ color: "#C4848A" }}>
            Perfect Seating
          </span>
        </h2>

        {/* Subtitle */}
        <p className="text-base sm:text-lg leading-relaxed mb-10" style={{ color: "#8B7D7D" }}>
          Join thousands of couples who planned their wedding seating stress-free with Seated.
        </p>

        {/* CTA button */}
        <Link
          href="/sign-up"
          className="press inline-flex items-center justify-center px-10 py-4 rounded-pill text-white font-medium text-base shadow-btn-gold hover:shadow-btn-gold-hover hover:-translate-y-px transition-[box-shadow,transform,background-color] duration-200 ease-out"
          style={{
            background: "linear-gradient(135deg, #D4A574 0%, #C9956B 100%)",
          }}
        >
          Get Started Free
          <svg className="ml-2 w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </Link>

        <p className="mt-6 text-xs" style={{ color: "#C4BABA" }}>
          Free to use · No credit card required
        </p>
      </div>
    </section>
  );
}

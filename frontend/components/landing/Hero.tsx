"use client";

import React from "react";
import Link from "next/link";

function TableDecoration() {
  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none"
      viewBox="0 0 1200 700"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Large table circles — gold with low opacity */}
      <circle cx="150" cy="200" r="45" stroke="#D4A574" strokeWidth="1.5" opacity="0.18" />
      <circle cx="150" cy="200" r="3" fill="#D4A574" opacity="0.25" />
      <circle cx="1050" cy="180" r="55" stroke="#D4A574" strokeWidth="1.5" opacity="0.15" />
      <circle cx="1050" cy="180" r="3" fill="#D4A574" opacity="0.22" />
      <circle cx="1100" cy="500" r="35" stroke="#D4A574" strokeWidth="1.5" opacity="0.12" />
      <circle cx="1100" cy="500" r="3" fill="#D4A574" opacity="0.18" />
      <circle cx="100" cy="520" r="40" stroke="#D4A574" strokeWidth="1.5" opacity="0.14" />
      <circle cx="100" cy="520" r="3" fill="#D4A574" opacity="0.2" />
      <circle cx="250" cy="600" r="30" stroke="#E8B4B8" strokeWidth="1" opacity="0.12" />

      {/* Tiny "seat" dots around tables */}
      {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => {
        const rad = (angle * Math.PI) / 180;
        return (
          <circle
            key={`t1-${angle}`}
            cx={150 + Math.cos(rad) * 60}
            cy={200 + Math.sin(rad) * 60}
            r="3"
            fill="#D4A574"
            opacity="0.15"
          />
        );
      })}
      {[0, 60, 120, 180, 240, 300].map((angle) => {
        const rad = (angle * Math.PI) / 180;
        return (
          <circle
            key={`t2-${angle}`}
            cx={1050 + Math.cos(rad) * 72}
            cy={180 + Math.sin(rad) * 72}
            r="3"
            fill="#D4A574"
            opacity="0.12"
          />
        );
      })}

      {/* Delicate connecting curves */}
      <path
        d="M 200 220 Q 400 100, 600 150"
        stroke="#D4A574"
        strokeWidth="0.8"
        opacity="0.08"
        fill="none"
      />
      <path
        d="M 600 550 Q 800 500, 1000 520"
        stroke="#E8B4B8"
        strokeWidth="0.8"
        opacity="0.08"
        fill="none"
      />

      {/* Rose-gold gradient blobs */}
      <circle cx="950" cy="350" r="120" fill="url(#roseBlob)" opacity="0.04" />
      <circle cx="200" cy="400" r="100" fill="url(#goldBlob)" opacity="0.05" />

      <defs>
        <radialGradient id="roseBlob" cx="50%" cy="50%">
          <stop offset="0%" stopColor="#E8B4B8" />
          <stop offset="100%" stopColor="#E8B4B8" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="goldBlob" cx="50%" cy="50%">
          <stop offset="0%" stopColor="#D4A574" />
          <stop offset="100%" stopColor="#D4A574" stopOpacity="0" />
        </radialGradient>
      </defs>
    </svg>
  );
}

export function Hero() {
  return (
    <section className="relative min-h-[92vh] flex items-center justify-center overflow-hidden">
      {/* Background gradient */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(165deg, #FFFCF8 0%, #FFF8F0 30%, #FDF2F2 60%, #F9E8E8 100%)",
        }}
      />

      {/* Decorative SVG */}
      <TableDecoration />

      {/* Content */}
      <div className="relative z-10 max-w-3xl mx-auto px-6 text-center">
        {/* Small badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-pill bg-white/70 border border-cream-300 mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-gold-400" />
          <span className="text-xs font-medium text-warm-gray-500 tracking-wide uppercase">
            Wedding Seating Made Simple
          </span>
        </div>

        {/* Headline */}
        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-serif font-semibold text-warm-gray-900 leading-[1.1] tracking-tight mb-6">
          Every Guest in the
          <span className="block mt-1" style={{ color: "#C4848A" }}>
            Right Seat
          </span>
        </h1>

        {/* Subtitle */}
        <p className="text-lg sm:text-xl text-warm-gray-400 max-w-xl mx-auto mb-10 leading-relaxed">
          The effortless way to plan your seating chart. Describe your venue,
          arrange your tables, and seat every guest — all in one beautiful place.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/sign-up"
            className="inline-flex items-center justify-center px-8 py-3.5 rounded-soft text-white font-medium text-base transition-all duration-200 hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]"
            style={{
              background: "linear-gradient(135deg, #D4A574 0%, #C9956B 100%)",
              boxShadow: "0 2px 12px rgba(212, 165, 116, 0.3)",
            }}
          >
            Get Started Free
          </Link>
          <Link
            href="/sign-in"
            className="inline-flex items-center justify-center px-8 py-3.5 rounded-soft font-medium text-base border transition-all duration-200 hover:bg-cream-100 active:scale-[0.98]"
            style={{
              borderColor: "#EDE5DD",
              color: "#6B5B5B",
            }}
          >
            Sign In
          </Link>
        </div>

        {/* Trust indicator */}
        <p className="mt-12 text-xs text-warm-gray-300 tracking-wide">
          Free to use &middot; No credit card required
        </p>
      </div>

      {/* Bottom fade */}
      <div
        className="absolute bottom-0 left-0 right-0 h-24"
        style={{
          background:
            "linear-gradient(to top, #FFFCF8 0%, transparent 100%)",
        }}
      />
    </section>
  );
}

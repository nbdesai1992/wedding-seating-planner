"use client";

import React from "react";

const avatars = [
  { initials: "JR", bg: "#F9E8E8", color: "#A86A70" },
  { initials: "PK", bg: "#FFF8F0", color: "#C9956B" },
  { initials: "AT", bg: "#F0D0D4", color: "#8C5056" },
  { initials: "ML", bg: "#E0BE96", color: "#6E3A3E" },
  { initials: "SC", bg: "#F9E8E8", color: "#A86A70" },
  { initials: "KW", bg: "#FFF8F0", color: "#9C6E48" },
];

export function SocialProof() {
  return (
    <section
      className="relative py-8"
      style={{
        background: "linear-gradient(180deg, #FFFCF8 0%, #FFF8F0 100%)",
      }}
    >
      <div className="max-w-4xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-center gap-5">
        {/* Overlapping avatars */}
        <div className="flex items-center -space-x-2.5">
          {avatars.map((a, i) => (
            <div
              key={i}
              className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold border-2 border-white"
              style={{
                background: a.bg,
                color: a.color,
                zIndex: avatars.length - i,
                fontFamily: "Inter, sans-serif",
              }}
            >
              {a.initials}
            </div>
          ))}
        </div>

        {/* Text */}
        <p className="text-sm text-warm-gray-400 text-center sm:text-left">
          <span className="font-medium text-warm-gray-600">500+ couples</span>{" "}
          have planned their perfect seating with Seated
        </p>

        {/* Rating stars */}
        <div className="flex items-center gap-1">
          {[...Array(5)].map((_, i) => (
            <svg
              key={i}
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="#D4A574"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
          ))}
          <span className="text-xs text-warm-gray-400 ml-1">4.9</span>
        </div>
      </div>
    </section>
  );
}

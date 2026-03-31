"use client";

import React from "react";
import Link from "next/link";
import { ProductPreview } from "./ProductPreview";

/* ─── CSS decorative elements ─── */
function FloralAccent({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg
      className={`absolute pointer-events-none ${className || ""}`}
      style={{ ...style }}
      width="120"
      height="120"
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Abstract botanical / leaf motif */}
      <path
        d="M60 10 Q80 30, 70 60 Q90 50, 110 60 Q90 70, 70 60 Q80 90, 60 110 Q40 90, 50 60 Q30 70, 10 60 Q30 50, 50 60 Q40 30, 60 10Z"
        fill="none"
        stroke="#D4A574"
        strokeWidth="0.6"
        opacity="0.2"
      />
      <circle cx="60" cy="60" r="4" fill="#D4A574" opacity="0.12" />
    </svg>
  );
}

function GoldSparkles() {
  const sparkles = [
    { x: "8%", y: "18%", size: 3, opacity: 0.25, delay: 0 },
    { x: "15%", y: "70%", size: 2, opacity: 0.18, delay: 0.5 },
    { x: "88%", y: "25%", size: 2.5, opacity: 0.22, delay: 1 },
    { x: "92%", y: "65%", size: 2, opacity: 0.15, delay: 1.5 },
    { x: "78%", y: "85%", size: 3, opacity: 0.2, delay: 0.3 },
    { x: "25%", y: "90%", size: 2, opacity: 0.16, delay: 0.8 },
    { x: "50%", y: "8%", size: 2.5, opacity: 0.2, delay: 1.2 },
    { x: "5%", y: "45%", size: 2, opacity: 0.14, delay: 0.7 },
    { x: "65%", y: "12%", size: 1.5, opacity: 0.18, delay: 0.4 },
  ];

  return (
    <>
      {sparkles.map((s, i) => (
        <div
          key={i}
          className="absolute rounded-full"
          style={{
            left: s.x,
            top: s.y,
            width: s.size,
            height: s.size,
            background: "#D4A574",
            opacity: s.opacity,
            animation: `sparkle 3s ease-in-out ${s.delay}s infinite`,
          }}
        />
      ))}
      <style jsx>{`
        @keyframes sparkle {
          0%, 100% { opacity: 0.1; transform: scale(1); }
          50% { opacity: 0.35; transform: scale(1.5); }
        }
      `}</style>
    </>
  );
}

export function Hero() {
  return (
    <section className="relative min-h-screen overflow-hidden pt-16">
      {/* Layered background gradient */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(165deg, #FFFCF8 0%, #FFF8F0 25%, #FDF2F2 50%, #F9E8E8 75%, #FFF8F0 100%)",
        }}
      />

      {/* Subtle watercolor-style blobs */}
      <div
        className="absolute top-0 right-0 w-[600px] h-[600px]"
        style={{
          background:
            "radial-gradient(ellipse at 70% 30%, rgba(232, 180, 184, 0.12) 0%, transparent 60%)",
        }}
      />
      <div
        className="absolute bottom-0 left-0 w-[500px] h-[500px]"
        style={{
          background:
            "radial-gradient(ellipse at 30% 70%, rgba(212, 165, 116, 0.1) 0%, transparent 60%)",
        }}
      />

      {/* Floral accents */}
      <FloralAccent className="hidden lg:block" style={{ top: "5%", left: "3%", opacity: 0.5 }} />
      <FloralAccent className="hidden lg:block" style={{ bottom: "8%", right: "5%", transform: "rotate(45deg)", opacity: 0.4 }} />

      {/* Gold sparkle dots */}
      <GoldSparkles />

      {/* Main content: split layout */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 py-16 lg:py-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center min-h-[calc(100vh-10rem)]">
          {/* Left: copy */}
          <div className="max-w-xl">
            {/* Small badge */}
            <div
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-pill mb-8"
              style={{
                background: "rgba(255, 255, 255, 0.6)",
                border: "1px solid rgba(237, 229, 221, 0.6)",
                backdropFilter: "blur(8px)",
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: "#D4A574" }}
              />
              <span className="text-xs font-medium tracking-wide uppercase" style={{ color: "#8B7D7D" }}>
                Wedding Seating Made Beautiful
              </span>
            </div>

            {/* Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-serif font-bold leading-[1.08] tracking-tight mb-6">
              <span className="text-warm-gray-900">Every Guest</span>
              <br />
              <span className="text-warm-gray-900">in the </span>
              <span
                className="relative inline-block"
                style={{ color: "#C4848A" }}
              >
                Right Seat
                {/* Gold underline accent */}
                <svg
                  className="absolute -bottom-2 left-0 w-full"
                  height="6"
                  viewBox="0 0 200 6"
                  fill="none"
                  preserveAspectRatio="none"
                >
                  <path
                    d="M0 4 Q50 0, 100 3 Q150 6, 200 2"
                    stroke="#D4A574"
                    strokeWidth="2"
                    strokeLinecap="round"
                    opacity="0.5"
                  />
                </svg>
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-lg sm:text-xl leading-relaxed mb-10" style={{ color: "#8B7D7D" }}>
              The effortless way to plan your wedding seating chart. Describe your venue,
              arrange your tables, and seat every guest. All in one beautiful place.
            </p>

            {/* CTA */}
            <div className="flex flex-col sm:flex-row items-start gap-4">
              <Link
                href="/sign-up"
                className="inline-flex items-center justify-center px-8 py-3.5 rounded-soft text-white font-medium text-base transition-all duration-300 hover:shadow-xl hover:scale-[1.03] active:scale-[0.97]"
                style={{
                  background: "linear-gradient(135deg, #D4A574 0%, #C9956B 100%)",
                  boxShadow: "0 4px 20px rgba(212, 165, 116, 0.35)",
                }}
              >
                Start Planning Free
                <svg className="ml-2 w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </Link>
              <p className="text-xs self-center" style={{ color: "#C4BABA" }}>
                Free to use · No credit card needed
              </p>
            </div>
          </div>

          {/* Right: Product preview */}
          <div className="relative lg:pl-4">
            <ProductPreview />
          </div>
        </div>
      </div>

      {/* Bottom gradient fade into next section */}
      <div
        className="absolute bottom-0 left-0 right-0 h-32"
        style={{
          background: "linear-gradient(to top, #FFF8F0 0%, transparent 100%)",
        }}
      />
    </section>
  );
}

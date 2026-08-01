"use client";

import React from "react";

/* ─── Mini CSS illustrations for each feature ─── */

function VenueVisual() {
  return (
    <div className="relative w-full max-w-sm mx-auto">
      <div
        className="rounded-card-lg p-5 overflow-hidden shadow-soft"
        style={{
          background: "linear-gradient(145deg, #FFFCF8, #FDF2F2)",
          border: "1px solid #F0D0D4",
        }}
      >
        {/* Prompt bar mock */}
        <div
          className="rounded-lg px-4 py-3 mb-4 flex items-center gap-3"
          style={{ background: "white", border: "1px solid #EDE5DD" }}
        >
          <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: "#F9E8E8" }}>
            <span className="text-[9px]" style={{ color: "#E8B4B8" }}>✦</span>
          </div>
          <span className="text-xs" style={{ color: "#8B7D7D", fontFamily: "Inter, sans-serif" }}>
            &ldquo;A ballroom with 12 round tables and a dance floor...&rdquo;
          </span>
          <div
            className="ml-auto w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0"
            style={{ background: "linear-gradient(135deg, #D4A574, #C9956B)" }}
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
              <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" />
            </svg>
          </div>
        </div>

        {/* Mini layout appearing */}
        <div className="relative rounded-lg p-4" style={{ background: "white", border: "1px solid #F5F0EB" }}>
          <svg viewBox="0 0 240 100" className="w-full">
            {/* Mini tables */}
            {[
              { x: 35, y: 30 },
              { x: 90, y: 30 },
              { x: 35, y: 75 },
              { x: 90, y: 75 },
              { x: 200, y: 30 },
              { x: 200, y: 75 },
            ].map((t, i) => (
              <g key={i}>
                <circle cx={t.x} cy={t.y} r="14" fill="#F9E8E8" stroke="#E8B4B8" strokeWidth="0.8" />
                <text
                  x={t.x}
                  y={t.y + 1}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize="5"
                  fill="#A86A70"
                  fontFamily="Georgia, serif"
                >
                  {i + 1}
                </text>
              </g>
            ))}
            {/* Dance floor */}
            <rect x="125" y="20" width="45" height="30" rx="4" fill="#FFF8F0" stroke="#D4A574" strokeWidth="0.8" strokeDasharray="2 1.5" />
            <text x="147.5" y="37" textAnchor="middle" fontSize="4.5" fill="#D4A574" fontFamily="Georgia, serif">
              Dance Floor
            </text>
            {/* Stage */}
            <rect x="125" y="62" width="45" height="20" rx="3" fill="#FFF8F0" stroke="#EDE5DD" strokeWidth="0.6" />
            <text x="147.5" y="74" textAnchor="middle" fontSize="4" fill="#C4BABA" fontFamily="Inter, sans-serif">
              Stage
            </text>
          </svg>
        </div>
      </div>
    </div>
  );
}

function DragDropVisual() {
  return (
    <div className="relative w-full max-w-sm mx-auto">
      <div
        className="rounded-card-lg p-5 overflow-hidden shadow-soft"
        style={{
          background: "linear-gradient(145deg, #FFFCF8, #FFF8F0)",
          border: "1px solid #EDE5DD",
        }}
      >
        {/* A table with a guest being dragged */}
        <svg viewBox="0 0 260 140" className="w-full">
          <circle cx="130" cy="70" r="32" fill="#F9E8E8" stroke="#E8B4B8" strokeWidth="1" />
          <text x="130" y="72" textAnchor="middle" fontSize="8" fontWeight="600" fill="#A86A70" fontFamily="Georgia, serif">
            Table 3
          </text>
          {/* Seated guests */}
          {["Emma", "Liam", "Ava", "Noah", "Mia"].map((name, i) => {
            const angle = (i / 6) * Math.PI * 2 - Math.PI / 2;
            const sx = 130 + Math.cos(angle) * 50;
            const sy = 70 + Math.sin(angle) * 50;
            return (
              <g key={i}>
                <circle cx={sx} cy={sy} r="8" fill="white" stroke="#E8B4B8" strokeWidth="0.8" />
                <text x={sx} y={sy + 1} textAnchor="middle" dominantBaseline="middle" fontSize="4.5" fill="#6B5B5B" fontFamily="Inter, sans-serif">
                  {name}
                </text>
              </g>
            );
          })}

          {/* Guest being dragged — with motion trail */}
          <g>
            {/* Trail dots */}
            <circle cx="215" cy="25" r="2" fill="#D4A574" opacity="0.15" />
            <circle cx="210" cy="35" r="2" fill="#D4A574" opacity="0.2" />
            <circle cx="205" cy="45" r="2" fill="#D4A574" opacity="0.25" />
            {/* Dragged guest */}
            <g style={{ filter: "drop-shadow(0 4px 6px rgba(212, 165, 116, 0.3))" }}>
              <circle cx="195" cy="58" r="10" fill="white" stroke="#D4A574" strokeWidth="1.5" />
              <text x="195" y="59.5" textAnchor="middle" dominantBaseline="middle" fontSize="5" fontWeight="500" fill="#C9956B" fontFamily="Inter, sans-serif">
                Eli
              </text>
            </g>
            {/* Empty seat indicator */}
            <circle
              cx={130 + Math.cos((5 / 6) * Math.PI * 2 - Math.PI / 2) * 50}
              cy={70 + Math.sin((5 / 6) * Math.PI * 2 - Math.PI / 2) * 50}
              r="8"
              fill="none"
              stroke="#D4A574"
              strokeWidth="1"
              strokeDasharray="3 2"
              opacity="0.6"
            />
          </g>

          {/* Cursor hint */}
          <svg x="188" y="60" width="12" height="14" viewBox="0 0 24 24" fill="#3D3535" opacity="0.4">
            <path d="M5 3l3.5 20L12 17l6 4L14 3 5 3z" />
          </svg>
        </svg>
      </div>
    </div>
  );
}

function GuestListVisual() {
  const guests = [
    { name: "Sarah Mitchell", meal: "Chicken", rsvp: true, group: "Bride's Family" },
    { name: "James Carter", meal: "Fish", rsvp: true, group: "Bride's Family" },
    { name: "Emily Zhang", meal: "Vegetarian", rsvp: true, group: "College Friends" },
    { name: "Michael Brown", meal: "Pending", rsvp: false, group: "Groom's Family" },
  ];

  return (
    <div className="relative w-full max-w-sm mx-auto">
      <div
        className="rounded-card-lg overflow-hidden shadow-soft"
        style={{
          background: "white",
          border: "1px solid #F0D0D4",
        }}
      >
        {/* Header */}
        <div className="px-4 py-3 flex items-center justify-between" style={{ background: "#FFFCF8", borderBottom: "1px solid #F5F0EB" }}>
          <span className="text-xs font-semibold font-serif" style={{ color: "#3D3535" }}>Guest List</span>
          <span className="text-[10px] px-2 py-0.5 rounded-pill" style={{ background: "#F9E8E8", color: "#A86A70" }}>64 guests</span>
        </div>

        {/* Table header */}
        <div className="grid grid-cols-4 gap-2 px-4 py-2" style={{ background: "#FAF7F4", borderBottom: "1px solid #F5F0EB" }}>
          {["Name", "Meal", "RSVP", "Group"].map((h) => (
            <span key={h} className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: "#8B7D7D" }}>{h}</span>
          ))}
        </div>

        {/* Rows */}
        {guests.map((g, i) => (
          <div
            key={i}
            className="grid grid-cols-4 gap-2 px-4 py-2.5 items-center"
            style={{ borderBottom: i < guests.length - 1 ? "1px solid #F5F0EB" : "none" }}
          >
            <span className="text-[10px] font-medium" style={{ color: "#3D3535" }}>{g.name}</span>
            <span className="text-[10px]" style={{ color: "#6B5B5B" }}>{g.meal}</span>
            <div className="flex items-center">
              <div
                className="w-3.5 h-3.5 rounded-full flex items-center justify-center"
                style={{ background: g.rsvp ? "#E8B4B8" : "#EDE5DD" }}
              >
                {g.rsvp ? (
                  <svg width="6" height="6" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                    <path d="M5 12l5 5L19 7" strokeLinecap="round" />
                  </svg>
                ) : (
                  <span className="text-[6px]" style={{ color: "#8B7D7D" }}>?</span>
                )}
              </div>
            </div>
            <span className="text-[9px]" style={{ color: "#8B7D7D" }}>{g.group}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ExportVisual() {
  return (
    <div className="relative w-full max-w-sm mx-auto">
      <div
        className="rounded-card-lg p-6 flex items-center justify-center shadow-soft"
        style={{
          background: "linear-gradient(145deg, #FFFCF8, #FDF2F2)",
          border: "1px solid #F0D0D4",
        }}
      >
        {/* PDF document mock */}
        <div className="relative">
          {/* Shadow page behind */}
          <div
            className="absolute top-2 left-2 w-44 h-56 rounded-sm"
            style={{ background: "#F5F0EB", border: "1px solid #EDE5DD" }}
          />

          {/* Main page */}
          <div
            className="relative w-44 h-56 rounded-sm p-3 flex flex-col"
            style={{
              background: "white",
              border: "1px solid #EDE5DD",
              boxShadow: "0 4px 16px rgba(61, 53, 53, 0.08)",
            }}
          >
            {/* Title */}
            <div className="text-center mb-3">
              <p className="font-serif text-[8px] font-semibold" style={{ color: "#3D3535" }}>
                Sarah & James Wedding
              </p>
              <p className="text-[6px] mt-0.5" style={{ color: "#8B7D7D" }}>Seating Chart</p>
              <div className="h-px w-12 mx-auto mt-1.5" style={{ background: "#D4A574", opacity: 0.5 }} />
            </div>

            {/* Mini seating chart */}
            <svg viewBox="0 0 140 100" className="w-full flex-1">
              {[
                { x: 25, y: 22 },
                { x: 70, y: 22 },
                { x: 115, y: 22 },
                { x: 25, y: 58 },
                { x: 70, y: 58 },
                { x: 115, y: 58 },
                { x: 47, y: 90 },
                { x: 93, y: 90 },
              ].map((t, i) => (
                <g key={i}>
                  <circle cx={t.x} cy={t.y} r="10" fill="#F9E8E8" stroke="#E8B4B8" strokeWidth="0.5" />
                  <text x={t.x} y={t.y + 1} textAnchor="middle" dominantBaseline="middle" fontSize="4" fill="#A86A70" fontFamily="Georgia, serif">
                    {i + 1}
                  </text>
                  {/* Tiny seats */}
                  {[0, 60, 120, 180, 240, 300].map((angle) => {
                    const rad = (angle * Math.PI) / 180;
                    return (
                      <circle
                        key={angle}
                        cx={t.x + Math.cos(rad) * 14}
                        cy={t.y + Math.sin(rad) * 14}
                        r="1.8"
                        fill="white"
                        stroke="#E8B4B8"
                        strokeWidth="0.3"
                      />
                    );
                  })}
                </g>
              ))}
            </svg>

            {/* PDF badge */}
            <div className="absolute -bottom-2 -right-2 px-2 py-1 rounded-md"
              style={{
                background: "linear-gradient(135deg, #D4A574, #C9956B)",
                boxShadow: "0 2px 8px rgba(212, 165, 116, 0.3)",
              }}
            >
              <span className="text-[8px] font-bold text-white tracking-wide">PDF</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Feature definitions ─── */
const features = [
  {
    title: "Describe Your Venue, Watch It Come to Life",
    description:
      "Tell us about your space, the shape, the size, the vibe, and watch your custom layout appear instantly. No floor plans or measuring tape needed.",
    Visual: VenueVisual,
    imageFirst: true,
  },
  {
    title: "Drag, Drop, Done",
    description:
      "Assign guests to seats with intuitive drag-and-drop. Rearrange tables, move people around, and perfect every detail until it feels just right.",
    Visual: DragDropVisual,
    imageFirst: false,
  },
  {
    title: "Manage Every Detail",
    description:
      "Guest lists, meal preferences, groups, plus-ones, RSVPs. Everything organized in one beautiful place so nothing falls through the cracks.",
    Visual: GuestListVisual,
    imageFirst: true,
  },
  {
    title: "One-Click Export",
    description:
      "Download a gorgeous, print-ready PDF of your seating chart. Perfect for the welcome table, your wedding planner, or the venue coordinator.",
    Visual: ExportVisual,
    imageFirst: false,
  },
];

/* Translucent alternating washes, feathered to transparent at both edges
   so no hard band lines appear — the global gradient always reads through */
const sectionBgs = [
  "linear-gradient(180deg, transparent 0%, rgba(255, 248, 240, 0.45) 30%, rgba(255, 248, 240, 0.45) 70%, transparent 100%)",
  "transparent",
  "linear-gradient(180deg, transparent 0%, rgba(253, 242, 242, 0.45) 30%, rgba(253, 242, 242, 0.45) 70%, transparent 100%)",
  "transparent",
];

export function Features() {
  return (
    <section id="features">
      {/* Section header — eyebrow, serif w600, gold ornament */}
      <div className="py-16 text-center">
        <p className="eyebrow eyebrow-gold mb-4">The Features</p>
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif font-semibold text-warm-gray-900 mb-4">
          Everything You Need
        </h2>
        <p className="text-warm-gray-400 max-w-lg mx-auto text-base">
          Powerful features wrapped in a beautiful, intuitive experience
        </p>
        <div className="ornament-divider mx-auto max-w-[220px] mt-7">
          <span className="ornament-dot" />
        </div>
      </div>

      {/* Alternating feature sections */}
      {features.map((feature, i) => {
        const Visual = feature.Visual;
        const isImageFirst = feature.imageFirst;

        return (
          <div
            key={i}
            className="landing-fade-in py-16 sm:py-20 lg:py-24"
            style={{ background: sectionBgs[i] }}
          >
            <div className="max-w-6xl mx-auto px-6">
              <div
                className={`grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center ${
                  isImageFirst ? "" : "direction-reverse"
                }`}
              >
                {/* Visual */}
                <div className={`${isImageFirst ? "lg:order-1" : "lg:order-2"}`}>
                  <Visual />
                </div>

                {/* Text */}
                <div className={`${isImageFirst ? "lg:order-2" : "lg:order-1"}`}>
                  {/* Feature number — letter-spaced eyebrow beside a hairline */}
                  <span className="flex items-center gap-4 mb-4">
                    <span className="eyebrow eyebrow-gold shrink-0">
                      0{i + 1}
                    </span>
                    <span className="hairline max-w-[72px]" aria-hidden="true" />
                  </span>

                  <h3 className="text-2xl sm:text-3xl lg:text-4xl font-serif font-semibold text-warm-gray-900 mb-4 leading-tight">
                    {feature.title}
                  </h3>

                  <p className="text-base sm:text-lg leading-relaxed max-w-md" style={{ color: "#8B7D7D" }}>
                    {feature.description}
                  </p>

                  {/* Decorative gold line */}
                  <div
                    className="h-px w-16 mt-6"
                    style={{
                      background: "linear-gradient(90deg, #D4A574, transparent)",
                      opacity: 0.5,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </section>
  );
}

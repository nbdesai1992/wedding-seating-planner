"use client";

import React from "react";

/* ─── Tiny sub-components for the mock seating chart ─── */

function MockTable({
  x,
  y,
  radius,
  seats,
  label,
  variant = "round",
}: {
  x: number;
  y: number;
  radius: number;
  seats: string[];
  label: string;
  variant?: "round" | "rect";
}) {
  if (variant === "rect") {
    return (
      <g>
        <rect
          x={x - radius * 1.3}
          y={y - radius * 0.7}
          width={radius * 2.6}
          height={radius * 1.4}
          rx="4"
          fill="#F9E8E8"
          stroke="#E8B4B8"
          strokeWidth="1"
        />
        <text
          x={x}
          y={y + 1}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize="7"
          fontWeight="600"
          fill="#A86A70"
          fontFamily="Georgia, serif"
        >
          {label}
        </text>
        {/* Seats along top and bottom */}
        {seats.map((name, i) => {
          const isTop = i < Math.ceil(seats.length / 2);
          const count = isTop
            ? Math.ceil(seats.length / 2)
            : seats.length - Math.ceil(seats.length / 2);
          const idx = isTop ? i : i - Math.ceil(seats.length / 2);
          const spacing = (radius * 2.2) / (count + 1);
          const sx = x - radius * 1.1 + spacing * (idx + 1);
          const sy = isTop ? y - radius * 0.7 - 12 : y + radius * 0.7 + 12;
          return (
            <g key={i}>
              <circle cx={sx} cy={sy} r="5.5" fill="white" stroke="#E8B4B8" strokeWidth="0.8" />
              <text
                x={sx}
                y={sy + 0.5}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="3.5"
                fill="#8B7D7D"
                fontFamily="Inter, sans-serif"
              >
                {name}
              </text>
            </g>
          );
        })}
      </g>
    );
  }

  return (
    <g>
      <circle cx={x} cy={y} r={radius} fill="#F9E8E8" stroke="#E8B4B8" strokeWidth="1" />
      <text
        x={x}
        y={y + 1}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize="7"
        fontWeight="600"
        fill="#A86A70"
        fontFamily="Georgia, serif"
      >
        {label}
      </text>
      {seats.map((name, i) => {
        const angle = (i / seats.length) * Math.PI * 2 - Math.PI / 2;
        const sx = x + Math.cos(angle) * (radius + 12);
        const sy = y + Math.sin(angle) * (radius + 12);
        return (
          <g key={i}>
            <circle cx={sx} cy={sy} r="5.5" fill="white" stroke="#E8B4B8" strokeWidth="0.8" />
            <text
              x={sx}
              y={sy + 0.5}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize="3.5"
              fill="#8B7D7D"
              fontFamily="Inter, sans-serif"
            >
              {name}
            </text>
          </g>
        );
      })}
    </g>
  );
}

function MockDanceFloor() {
  return (
    <g>
      <rect x="155" y="95" width="70" height="50" rx="6" fill="#FFF8F0" stroke="#D4A574" strokeWidth="1" strokeDasharray="3 2" />
      <text
        x="190"
        y="118"
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize="6.5"
        fontWeight="500"
        fill="#D4A574"
        fontFamily="Georgia, serif"
        letterSpacing="0.5"
      >
        Dance Floor
      </text>
    </g>
  );
}

function MockSidebar() {
  const guests = [
    { name: "Sarah & James", status: "seated" },
    { name: "Emily Chen", status: "seated" },
    { name: "Michael R.", status: "seated" },
    { name: "Lisa Park", status: "unseated" },
    { name: "David Kim", status: "unseated" },
  ];

  return (
    <g>
      {/* Sidebar background */}
      <rect x="330" y="0" width="90" height="240" fill="#FFFCF8" />
      <line x1="330" y1="0" x2="330" y2="240" stroke="#F0ECEC" strokeWidth="1" />

      {/* Title */}
      <text x="344" y="20" fontSize="7" fontWeight="600" fill="#3D3535" fontFamily="Georgia, serif">
        Guest List
      </text>
      <text x="344" y="31" fontSize="5" fill="#8B7D7D" fontFamily="Inter, sans-serif">
        24 of 28 seated
      </text>

      {/* Search bar mock */}
      <rect x="340" y="40" width="72" height="12" rx="3" fill="white" stroke="#EDE5DD" strokeWidth="0.6" />
      <text x="346" y="48" fontSize="4" fill="#C4BABA" fontFamily="Inter, sans-serif">
        Search guests...
      </text>

      {/* Guest list */}
      {guests.map((g, i) => (
        <g key={i}>
          <rect
            x="340"
            y={58 + i * 16}
            width="72"
            height="13"
            rx="2"
            fill={g.status === "unseated" ? "#FFF8F0" : "white"}
            stroke={g.status === "unseated" ? "#D4A574" : "#F5F0EB"}
            strokeWidth="0.5"
          />
          <circle
            cx="347"
            cy={64.5 + i * 16}
            r="3"
            fill={g.status === "seated" ? "#E8B4B8" : "#D4A574"}
            opacity="0.6"
          />
          <text
            x="353"
            y={65.5 + i * 16}
            fontSize="4"
            fill={g.status === "unseated" ? "#C9956B" : "#6B5B5B"}
            fontFamily="Inter, sans-serif"
          >
            {g.name}
          </text>
          {g.status === "seated" && (
            <text x="403" y="65.5" fontSize="3.5" fill="#C4BABA" fontFamily="Inter, sans-serif">
              ✓
            </text>
          )}
        </g>
      ))}
    </g>
  );
}

export function ProductPreview() {
  return (
    <div className="relative w-full max-w-2xl mx-auto">
      {/* Glow behind the frame */}
      <div
        className="absolute -inset-4 rounded-2xl"
        style={{
          background: "radial-gradient(ellipse at center, rgba(232, 180, 184, 0.15) 0%, transparent 70%)",
        }}
      />

      {/* Browser frame */}
      <div
        className="relative rounded-card-lg overflow-hidden"
        style={{
          boxShadow:
            "0 25px 60px -12px rgba(61, 53, 53, 0.18), 0 12px 28px -8px rgba(61, 53, 53, 0.1)",
          transform: "perspective(1200px) rotateY(-2deg) rotateX(1deg)",
        }}
      >
        {/* Browser chrome */}
        <div
          className="flex items-center gap-2 px-4 py-2.5"
          style={{ background: "#FAF7F4", borderBottom: "1px solid #EDE5DD" }}
        >
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#F0D0D4" }} />
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#E0BE96" }} />
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#DDD3C8" }} />
          </div>
          <div
            className="flex-1 mx-4 px-3 py-1 rounded-md text-center"
            style={{
              background: "white",
              border: "1px solid #EDE5DD",
            }}
          >
            <span className="text-[10px] text-warm-gray-300 font-sans">
              app.seated.com/events/sarah-james-wedding
            </span>
          </div>
        </div>

        {/* Canvas area */}
        <div style={{ background: "#FFFCF8" }}>
          <svg
            viewBox="0 0 420 240"
            className="w-full h-auto"
            style={{ display: "block" }}
          >
            {/* Canvas background */}
            <rect width="330" height="240" fill="#FFFCF8" />

            {/* Subtle grid */}
            <defs>
              <pattern id="previewGrid" width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#F0ECEC" strokeWidth="0.3" />
              </pattern>
            </defs>
            <rect width="330" height="240" fill="url(#previewGrid)" />

            {/* Event title bar */}
            <rect x="0" y="0" width="330" height="28" fill="white" opacity="0.9" />
            <text x="12" y="17" fontSize="8" fontWeight="600" fill="#3D3535" fontFamily="Georgia, serif">
              Sarah & James · Grand Ballroom
            </text>
            <rect x="240" y="8" width="38" height="13" rx="3" fill="#E8B4B8" opacity="0.85" />
            <text x="259" y="17" textAnchor="middle" fontSize="4.5" fill="white" fontWeight="500" fontFamily="Inter, sans-serif">
              Export PDF
            </text>
            <rect x="284" y="8" width="38" height="13" rx="3" fill="white" stroke="#EDE5DD" strokeWidth="0.5" />
            <text x="303" y="17" textAnchor="middle" fontSize="4.5" fill="#6B5B5B" fontWeight="500" fontFamily="Inter, sans-serif">
              Auto-Seat
            </text>

            {/* Tables */}
            <MockTable
              x={65}
              y={75}
              radius={22}
              seats={["Emma", "Liam", "Ava", "Noah", "Mia", "Eli"]}
              label="Table 1"
            />
            <MockTable
              x={65}
              y={180}
              radius={22}
              seats={["Zoe", "Jake", "Lily", "Owen", "Chloe", "Ryan"]}
              label="Table 2"
            />
            <MockTable
              x={280}
              y={75}
              radius={22}
              seats={["Sophia", "Ethan", "Aria", "Lucas", "Nora", "Ben"]}
              label="Table 3"
            />
            <MockTable
              x={280}
              y={180}
              radius={22}
              seats={["Grace", "Alex", "Ivy", "Sam", "Ruby", "Max"]}
              label="Table 4"
            />
            <MockTable
              x={190}
              y={190}
              radius={18}
              seats={["Tom", "Amy", "Dan", "Jen"]}
              label="Table 5"
              variant="rect"
            />

            {/* Dance floor */}
            <MockDanceFloor />

            {/* Sidebar */}
            <MockSidebar />
          </svg>
        </div>
      </div>
    </div>
  );
}

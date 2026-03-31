"use client";

import React from "react";
import { Quote } from "lucide-react";

const testimonials = [
  {
    quote:
      "Planning seating for 180 guests felt impossible until I found Seated. I described my venue and had a full layout in seconds. My mother-in-law was actually impressed.",
    name: "Jessica R.",
    location: "Charleston, SC",
  },
  {
    quote:
      "I changed my table arrangement probably fifty times and never once felt frustrated. The drag-and-drop is so smooth. My seating chart PDF looked gorgeous on the welcome table.",
    name: "Priya K.",
    location: "San Francisco, CA",
  },
  {
    quote:
      "We had a rehearsal dinner AND reception to plan. Being able to manage both events separately with their own layouts saved my sanity.",
    name: "Amanda T.",
    location: "Nashville, TN",
  },
];

export function Testimonials() {
  return (
    <section className="relative py-24 sm:py-32">
      <div className="max-w-6xl mx-auto px-6">
        {/* Section header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-serif font-semibold text-warm-gray-800 mb-4">
            Loved by Brides Everywhere
          </h2>
          <div className="divider-gold mx-auto max-w-[200px] mt-5" />
        </div>

        {/* Testimonial cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((testimonial, i) => (
            <div
              key={i}
              className="landing-fade-in relative rounded-card p-8 transition-all duration-300"
              style={{
                background:
                  "linear-gradient(145deg, #FFFCF8 0%, #FDF2F2 100%)",
                border: "1px solid #F0D0D4",
                boxShadow:
                  "0 1px 3px 0 rgba(107, 91, 91, 0.04)",
              }}
            >
              {/* Quote icon */}
              <div className="mb-5">
                <Quote
                  size={28}
                  style={{ color: "#D4A574", opacity: 0.35 }}
                  strokeWidth={1.5}
                />
              </div>

              {/* Quote text */}
              <blockquote className="text-sm text-warm-gray-600 leading-relaxed mb-6 italic">
                &ldquo;{testimonial.quote}&rdquo;
              </blockquote>

              {/* Gold divider */}
              <div
                className="h-px w-12 mb-4"
                style={{
                  background: "#D4A574",
                  opacity: 0.35,
                }}
              />

              {/* Attribution */}
              <div>
                <p
                  className="font-serif font-semibold text-sm"
                  style={{ color: "#3D3535" }}
                >
                  {testimonial.name}
                </p>
                <p className="text-xs text-warm-gray-400 mt-0.5">
                  {testimonial.location}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

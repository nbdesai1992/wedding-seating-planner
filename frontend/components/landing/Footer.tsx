"use client";

import React from "react";
import { Heart } from "lucide-react";

export function Footer() {
  return (
    <footer className="relative pt-12 pb-10">
      {/* Gold divider */}
      <div className="divider-gold mb-10" />

      <div className="max-w-6xl mx-auto px-6 text-center">
        {/* Brand */}
        <div className="flex items-center justify-center gap-2.5 mb-4">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: "#F9E8E8" }}
          >
            <Heart
              size={16}
              style={{ color: "#E8B4B8" }}
              fill="#E8B4B8"
            />
          </div>
          <span className="font-serif text-lg font-semibold text-warm-gray-800 tracking-tight">
            Seated
          </span>
        </div>

        {/* Tagline */}
        <p className="text-sm text-warm-gray-400 mb-6">
          Your wedding, beautifully arranged.
        </p>

        {/* Copyright */}
        <p className="text-xs text-warm-gray-300">
          &copy; {new Date().getFullYear()} Seated. All rights reserved.
        </p>
      </div>
    </footer>
  );
}

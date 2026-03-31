"use client";

import React from "react";
import { Heart } from "lucide-react";

export function Footer() {
  return (
    <footer className="relative pt-12 pb-10" style={{ background: "#FFFCF8" }}>
      {/* Gold divider */}
      <div className="divider-gold mb-10" />

      <div className="max-w-6xl mx-auto px-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          {/* Brand */}
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: "#F9E8E8" }}
            >
              <Heart
                size={14}
                style={{ color: "#E8B4B8" }}
                fill="#E8B4B8"
              />
            </div>
            <span className="font-serif text-lg font-semibold text-warm-gray-800 tracking-tight">
              Seated
            </span>
          </div>

          {/* Links */}
          <div className="flex items-center gap-6">
            <a href="#" className="text-xs text-warm-gray-400 hover:text-warm-gray-600 transition-colors">
              Privacy Policy
            </a>
            <span className="text-warm-gray-200">·</span>
            <a href="#" className="text-xs text-warm-gray-400 hover:text-warm-gray-600 transition-colors">
              Terms of Service
            </a>
            <span className="text-warm-gray-200">·</span>
            <a href="#" className="text-xs text-warm-gray-400 hover:text-warm-gray-600 transition-colors">
              Contact
            </a>
          </div>

          {/* Copyright */}
          <p className="text-xs text-warm-gray-300">
            &copy; {new Date().getFullYear()} Seated. All rights reserved.
          </p>
        </div>

        {/* Tagline */}
        <p className="text-center text-xs text-warm-gray-300 mt-8">
          Your wedding, beautifully arranged.
        </p>
      </div>
    </footer>
  );
}

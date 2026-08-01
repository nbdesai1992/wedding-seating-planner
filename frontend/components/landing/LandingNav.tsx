"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Heart } from "lucide-react";

export function LandingNav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollTo = (id: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 transition-all duration-500"
      style={{
        background: scrolled ? "rgba(255, 252, 248, 0.95)" : "transparent",
        backdropFilter: scrolled ? "blur(12px)" : "none",
        WebkitBackdropFilter: scrolled ? "blur(12px)" : "none",
        boxShadow: scrolled
          ? "0 1px 8px rgba(107, 91, 91, 0.08)"
          : "none",
        borderBottom: scrolled ? "1px solid rgba(237, 229, 221, 0.6)" : "1px solid transparent",
      }}
    >
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center transition-transform duration-300 group-hover:scale-110"
            style={{ background: scrolled ? "#F9E8E8" : "rgba(249, 232, 232, 0.7)" }}
          >
            <Heart size={18} style={{ color: "#E8B4B8" }} fill="#E8B4B8" />
          </div>
          <span className="font-serif text-2xl font-semibold tracking-tight text-warm-gray-800">
            Seated
          </span>
        </Link>

        {/* Center nav links — hidden on mobile */}
        <div className="hidden md:flex items-center gap-8">
          {[
            { label: "Features", id: "features" },
            { label: "How It Works", id: "how-it-works" },
            { label: "Testimonials", id: "testimonials" },
          ].map((link) => (
            <a
              key={link.id}
              href={`#${link.id}`}
              onClick={scrollTo(link.id)}
              className="text-sm font-medium transition-colors duration-200 hover:text-rose-600"
              style={{ color: scrolled ? "#6B5B5B" : "#6B5B5B" }}
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* Right side: Sign In + Get Started */}
        <div className="flex items-center gap-5">
          <Link
            href="/sign-in"
            className="text-sm font-medium transition-colors duration-200 hover:text-rose-600"
            style={{ color: "#6B5B5B" }}
          >
            Sign In
          </Link>
          <Link
            href="/sign-up"
            className="press hidden sm:inline-flex items-center px-5 py-2 rounded-pill text-sm font-medium text-white shadow-btn-gold hover:shadow-btn-gold-hover hover:-translate-y-px transition-[box-shadow,transform,background-color] duration-200 ease-out"
            style={{
              background: "linear-gradient(135deg, #D4A574 0%, #C9956B 100%)",
            }}
          >
            Get Started
          </Link>
        </div>
      </div>
    </nav>
  );
}

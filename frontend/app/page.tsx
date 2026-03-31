"use client";

import React, { useEffect, useRef } from "react";
import { Hero, Features, HowItWorks, Testimonials, Footer } from "@/components/landing";

function useFadeInOnScroll() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = ref.current;
    if (!container) return;

    const elements = container.querySelectorAll(".landing-fade-in");

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            (entry.target as HTMLElement).style.opacity = "1";
            (entry.target as HTMLElement).style.transform = "translateY(0)";
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
    );

    elements.forEach((el, i) => {
      const htmlEl = el as HTMLElement;
      htmlEl.style.opacity = "0";
      htmlEl.style.transform = "translateY(20px)";
      htmlEl.style.transition = `opacity 0.6s ease ${i * 0.1}s, transform 0.6s ease ${i * 0.1}s`;
      observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  return ref;
}

export default function Home() {
  const fadeRef = useFadeInOnScroll();

  return (
    <div ref={fadeRef} className="min-h-screen flex flex-col" style={{ background: "#FFFCF8" }}>
      <Hero />
      <Features />
      <HowItWorks />
      <Testimonials />
      <Footer />
    </div>
  );
}

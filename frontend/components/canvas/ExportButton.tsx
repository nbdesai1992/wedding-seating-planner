"use client";

import React, { useCallback, useState } from "react";
import { Download, FileText, Check, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { exportPDF } from "@/lib/layout";

interface ExportButtonProps {
  eventId: string;
}

export function ExportButton({ eventId }: ExportButtonProps) {
  const [state, setState] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");

  const handleExport = useCallback(async () => {
    if (state === "loading") return;
    setState("loading");

    try {
      const blob = await exportPDF(eventId);

      // Create download link
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `seating-chart-${eventId}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setState("success");
      setTimeout(() => setState("idle"), 2500);
    } catch (err) {
      console.error("PDF export failed:", err);
      setState("error");
      setTimeout(() => setState("idle"), 3000);
    }
  }, [eventId, state]);

  return (
    <button
      onClick={handleExport}
      disabled={state === "loading"}
      className={cn(
        "inline-flex items-center gap-2 px-4 py-2 rounded-lg",
        "text-xs font-medium transition-all duration-200",
        "shadow-sm hover:shadow-md",
        state === "idle" && [
          "bg-gradient-to-b from-gold-400 to-gold-500",
          "text-white",
          "hover:from-gold-500 hover:to-gold-600",
          "border border-gold-500/20",
        ],
        state === "loading" && [
          "bg-gold-400/80 text-white/90 cursor-wait",
          "border border-gold-400/30",
        ],
        state === "success" && [
          "bg-emerald-500 text-white",
          "border border-emerald-600/20",
        ],
        state === "error" && [
          "bg-rose-500 text-white",
          "border border-rose-600/20",
        ]
      )}
      title="Export seating chart as PDF"
    >
      {state === "idle" && (
        <>
          <Download className="w-3.5 h-3.5" />
          <span>Export PDF</span>
        </>
      )}
      {state === "loading" && (
        <>
          <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
          <span>Generating...</span>
        </>
      )}
      {state === "success" && (
        <>
          <Check className="w-3.5 h-3.5" />
          <span>Downloaded</span>
        </>
      )}
      {state === "error" && (
        <>
          <AlertCircle className="w-3.5 h-3.5" />
          <span>Failed</span>
        </>
      )}
    </button>
  );
}

"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Calendar, Users, Pencil, Trash2, MapPin } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import type { Event } from "@/lib/events";

interface EventCardProps {
  event: Event;
  onDelete: (id: string) => void;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "Date TBD";
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function daysUntil(dateStr: string | null): string | null {
  if (!dateStr) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const eventDate = new Date(dateStr + "T00:00:00");
  const diff = Math.ceil((eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return "Past event";
  if (diff === 0) return "Today!";
  if (diff === 1) return "Tomorrow";
  return `${diff} days away`;
}

export function EventCard({ event, onDelete }: EventCardProps) {
  const router = useRouter();
  const [showConfirm, setShowConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const countdown = daysUntil(event.date);

  function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();
    if (!showConfirm) {
      setShowConfirm(true);
      return;
    }
    setIsDeleting(true);
    onDelete(event.id);
  }

  return (
    <Card
      hover
      padding="none"
      className="group relative overflow-hidden"
      onClick={() => router.push(`/events/${event.id}`)}
    >
      <div className="p-7">
        {/* Countdown eyebrow pill */}
        {countdown && (
          <span className="inline-flex items-center gap-1.5 mb-3 px-3 py-1 rounded-pill border border-gold-400/40 bg-gold-400/10 text-gold-600 text-ui-xs font-medium uppercase tracking-[0.14em]">
            {countdown}
          </span>
        )}

        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <h3 className="font-serif text-xl font-medium text-warm-gray-800 truncate flex-1 min-w-0 pr-3">
            {event.name}
          </h3>

          {/* Action buttons */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <button
              onClick={(e) => {
                e.stopPropagation();
                router.push(`/events/${event.id}/edit`);
              }}
              className="p-1.5 rounded-pill text-warm-gray-400 hover:text-warm-gray-600 hover:bg-cream-100 transition-colors duration-150"
              title="Edit event"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className={`p-1.5 rounded-pill transition-colors duration-150 ${
                showConfirm
                  ? "text-red-500 bg-red-50 hover:bg-red-100"
                  : "text-warm-gray-400 hover:text-red-500 hover:bg-red-50"
              }`}
              title={showConfirm ? "Click again to confirm" : "Delete event"}
              onBlur={() => setShowConfirm(false)}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Signature gold rule */}
        <div className="divider-gold mb-5" />

        {/* Details */}
        <div className="space-y-2.5">
          <div className="flex items-center gap-2.5 text-ui text-warm-gray-500">
            <Calendar className="w-4 h-4 text-gold-400 shrink-0" />
            <span>{formatDate(event.date)}</span>
          </div>

          <div className="flex items-center gap-2.5 text-ui text-warm-gray-500">
            <Users className="w-4 h-4 text-gold-400 shrink-0" />
            <span>
              {event.guest_count === 0
                ? "No guests yet"
                : `${event.guest_count} guest${event.guest_count !== 1 ? "s" : ""}`}
            </span>
          </div>

          {event.venue_description && (
            <div className="flex items-start gap-2.5 text-ui text-warm-gray-500">
              <MapPin className="w-4 h-4 text-gold-400 shrink-0 mt-0.5" />
              <span className="line-clamp-2">{event.venue_description}</span>
            </div>
          )}
        </div>

        {/* Confirm delete overlay */}
        {showConfirm && (
          <div
            className="absolute inset-0 bg-white/85 backdrop-blur-sm flex items-center justify-center rounded-card-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center px-6">
              <p className="text-ui font-medium text-warm-gray-700 mb-3">
                Delete &ldquo;{event.name}&rdquo;?
              </p>
              <div className="flex items-center gap-2 justify-center">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowConfirm(false);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  loading={isDeleting}
                  className="!bg-red-500 hover:!bg-red-600 !shadow-none text-white"
                  onClick={handleDelete}
                >
                  Delete
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

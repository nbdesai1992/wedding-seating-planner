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
      className="group relative overflow-hidden"
      onClick={() => router.push(`/events/${event.id}`)}
    >
      {/* Top accent line */}
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-rose-200 via-gold-400 to-rose-200 opacity-60 group-hover:opacity-100 transition-opacity" />

      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1 min-w-0 pr-3">
            <h3 className="font-serif text-lg font-semibold text-warm-gray-800 truncate">
              {event.name}
            </h3>
            {countdown && (
              <span className="inline-block mt-1.5 text-xs font-medium text-gold-500 bg-gold-400/10 px-2 py-0.5 rounded-pill">
                {countdown}
              </span>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => {
                e.stopPropagation();
                router.push(`/events/${event.id}/edit`);
              }}
              className="p-1.5 rounded-soft text-warm-gray-400 hover:text-warm-gray-600 hover:bg-cream-100 transition-colors"
              title="Edit event"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className={`p-1.5 rounded-soft transition-colors ${
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

        {/* Divider */}
        <div className="divider-gold mb-4" />

        {/* Details */}
        <div className="space-y-2.5">
          <div className="flex items-center gap-2.5 text-sm text-warm-gray-500">
            <Calendar className="w-4 h-4 text-gold-400 shrink-0" />
            <span>{formatDate(event.date)}</span>
          </div>

          <div className="flex items-center gap-2.5 text-sm text-warm-gray-500">
            <Users className="w-4 h-4 text-gold-400 shrink-0" />
            <span>
              {event.guest_count === 0
                ? "No guests yet"
                : `${event.guest_count} guest${event.guest_count !== 1 ? "s" : ""}`}
            </span>
          </div>

          {event.venue_description && (
            <div className="flex items-start gap-2.5 text-sm text-warm-gray-500">
              <MapPin className="w-4 h-4 text-gold-400 shrink-0 mt-0.5" />
              <span className="line-clamp-2">{event.venue_description}</span>
            </div>
          )}
        </div>

        {/* Confirm delete overlay */}
        {showConfirm && (
          <div
            className="absolute inset-0 bg-white/90 backdrop-blur-sm flex items-center justify-center rounded-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center px-6">
              <p className="text-sm font-medium text-warm-gray-700 mb-3">
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
                  className="!bg-red-500 hover:!bg-red-600 text-white"
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

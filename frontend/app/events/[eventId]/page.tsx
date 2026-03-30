"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Calendar,
  Users,
  MapPin,
  Pencil,
  Grid3X3,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { getEvent, type Event } from "@/lib/events";

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "Date TBD";
  const date = new Date(dateStr + "T00:00:00");
  return date.toLocaleDateString("en-US", {
    weekday: "long",
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
  const diff = Math.ceil(
    (eventDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );
  if (diff < 0) return "Event has passed";
  if (diff === 0) return "Today is the day!";
  if (diff === 1) return "Tomorrow!";
  return `${diff} days to go`;
}

export default function EventDetailPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.eventId as string;

  const [event, setEvent] = useState<Event | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await getEvent(eventId);
        setEvent(data);
      } catch {
        router.push("/dashboard");
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [eventId, router]);

  if (isLoading || !event) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin h-8 w-8 border-2 border-rose-400 border-t-transparent rounded-full" />
      </div>
    );
  }

  const countdown = daysUntil(event.date);

  return (
    <div className="max-w-3xl animate-fade-in">
      {/* Page title */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-serif font-semibold text-warm-gray-800 mb-1">
            Overview
          </h1>
          <p className="text-sm text-warm-gray-400">
            Event dashboard and quick actions
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          icon={<Pencil className="w-3.5 h-3.5" />}
          onClick={() => router.push(`/events/${eventId}/edit`)}
        >
          Edit
        </Button>
      </div>

      {/* Countdown banner */}
      {countdown && (
        <div className="mb-6 px-5 py-4 rounded-card bg-gradient-to-r from-rose-50 to-cream-100 border border-rose-200/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/80 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-gold-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-warm-gray-700">
                {countdown}
              </p>
              <p className="text-xs text-warm-gray-400">
                {formatDate(event.date)}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <Card padding="md">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-rose-50 flex items-center justify-center">
              <Users className="w-4.5 h-4.5 text-rose-400" />
            </div>
            <div>
              <p className="text-2xl font-serif font-semibold text-warm-gray-800">
                {event.guest_count}
              </p>
              <p className="text-xs text-warm-gray-400">Guests</p>
            </div>
          </div>
        </Card>

        <Card padding="md">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-cream-100 flex items-center justify-center">
              <Calendar className="w-4.5 h-4.5 text-gold-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-warm-gray-700">
                {event.date
                  ? new Date(event.date + "T00:00:00").toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })
                  : "Not set"}
              </p>
              <p className="text-xs text-warm-gray-400">Date</p>
            </div>
          </div>
        </Card>

        <Card padding="md">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-cream-100 flex items-center justify-center">
              <MapPin className="w-4.5 h-4.5 text-gold-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-warm-gray-700 line-clamp-1">
                {event.venue_description || "Not set"}
              </p>
              <p className="text-xs text-warm-gray-400">Venue</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="divider-gold mb-8" />

      {/* Quick actions */}
      <h2 className="font-serif text-lg font-semibold text-warm-gray-800 mb-4">
        Get Started
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card
          hover
          padding="md"
          onClick={() => router.push(`/events/${eventId}/guests`)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center">
                <Users className="w-5 h-5 text-rose-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-warm-gray-700">
                  Manage Guests
                </p>
                <p className="text-xs text-warm-gray-400">
                  Add and organize your guest list
                </p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-warm-gray-300" />
          </div>
        </Card>

        <Card
          hover
          padding="md"
          onClick={() => router.push(`/events/${eventId}/seating`)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-cream-100 flex items-center justify-center">
                <Grid3X3 className="w-5 h-5 text-gold-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-warm-gray-700">
                  Seating Chart
                </p>
                <p className="text-xs text-warm-gray-400">
                  Design your table layout
                </p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-warm-gray-300" />
          </div>
        </Card>
      </div>
    </div>
  );
}

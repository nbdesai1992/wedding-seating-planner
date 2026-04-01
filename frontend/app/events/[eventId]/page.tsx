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
  CheckCircle2,
  Circle,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { getEvent, type Event } from "@/lib/events";
import { getLayout, type Layout } from "@/lib/layout";

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
  const [layout, setLayout] = useState<Layout | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [layoutLoaded, setLayoutLoaded] = useState(false);

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

  useEffect(() => {
    let cancelled = false;
    async function loadLayout() {
      try {
        const data = await getLayout(eventId);
        if (!cancelled) setLayout(data);
      } catch {
        // Layout doesn't exist yet — that's fine
      } finally {
        if (!cancelled) setLayoutLoaded(true);
      }
    }
    loadLayout();
    return () => {
      cancelled = true;
    };
  }, [eventId]);

  if (isLoading || !event) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin h-8 w-8 border-2 border-rose-400 border-t-transparent rounded-full" />
      </div>
    );
  }

  const countdown = daysUntil(event.date);

  // ── Compute state for guided hints ──
  const guestCount = event.guest_count;
  const hasGuests = guestCount > 0;
  const hasLayout = layout !== null && layout.tables.length > 0;
  const tableCount = layout?.tables.length ?? 0;
  const seatedCount =
    layout?.tables.reduce(
      (sum, t) =>
        sum + (t.seats?.filter((s) => s.guest_id !== null).length ?? 0),
      0
    ) ?? 0;

  // "Start here" logic:
  // - No guests yet → badge on Guests card
  // - Has guests but no layout → badge on Seating Chart card
  // - Both exist → no badge needed
  const showGuestBadge = !hasGuests;
  const showSeatingBadge = hasGuests && !hasLayout;

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
                {guestCount}
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
        {/* Guests card — always first */}
        <Card
          hover
          padding="md"
          onClick={() => router.push(`/events/${eventId}/guests`)}
          className={showGuestBadge ? "ring-2 ring-rose-300/60 ring-offset-1" : ""}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center">
                <Users className="w-5 h-5 text-rose-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-warm-gray-700">
                    Manage Guests
                  </p>
                  {showGuestBadge && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide uppercase bg-rose-400 text-white shadow-sm">
                      Start here
                    </span>
                  )}
                </div>
                <p className="text-xs text-warm-gray-400 mt-0.5">
                  {hasGuests
                    ? `${guestCount} guest${guestCount !== 1 ? "s" : ""} added`
                    : "Add your guest list first"}
                </p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-warm-gray-300" />
          </div>
        </Card>

        {/* Seating Chart card — always second */}
        <Card
          hover
          padding="md"
          onClick={() => router.push(`/events/${eventId}/seating`)}
          className={showSeatingBadge ? "ring-2 ring-gold-400/60 ring-offset-1" : ""}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-cream-100 flex items-center justify-center">
                <Grid3X3 className="w-5 h-5 text-gold-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-warm-gray-700">
                    Seating Chart
                  </p>
                  {showSeatingBadge && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wide uppercase bg-gold-400 text-white shadow-sm">
                      Start here
                    </span>
                  )}
                </div>
                <p className="text-xs text-warm-gray-400 mt-0.5">
                  {hasLayout
                    ? `${tableCount} table${tableCount !== 1 ? "s" : ""} set up`
                    : "Create your layout after adding guests"}
                </p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-warm-gray-300" />
          </div>
        </Card>
      </div>

      {/* ── Progress Checklist ── */}
      {layoutLoaded && (
        <>
          <div className="divider-gold my-8" />

          <h2 className="font-serif text-lg font-semibold text-warm-gray-800 mb-4">
            Planning Checklist
          </h2>

          <Card padding="md">
            <ul className="space-y-3">
              {/* Guests check */}
              <li className="flex items-center gap-3">
                {hasGuests ? (
                  <CheckCircle2 className="w-5 h-5 text-rose-400 shrink-0" />
                ) : (
                  <Circle className="w-5 h-5 text-warm-gray-300 shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${hasGuests ? "text-warm-gray-700" : "text-warm-gray-400"}`}>
                    Guests
                  </p>
                  <p className={`text-xs ${hasGuests ? "text-warm-gray-500" : "text-warm-gray-400"}`}>
                    {hasGuests ? `${guestCount} added` : "0 added"}
                  </p>
                </div>
              </li>

              {/* Layout check */}
              <li className="flex items-center gap-3">
                {hasLayout ? (
                  <CheckCircle2 className="w-5 h-5 text-rose-400 shrink-0" />
                ) : (
                  <Circle className="w-5 h-5 text-warm-gray-300 shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${hasLayout ? "text-warm-gray-700" : "text-warm-gray-400"}`}>
                    Layout
                  </p>
                  <p className={`text-xs ${hasLayout ? "text-warm-gray-500" : "text-warm-gray-400"}`}>
                    {hasLayout
                      ? `${tableCount} table${tableCount !== 1 ? "s" : ""} created`
                      : "Not created"}
                  </p>
                </div>
              </li>

              {/* Seating check */}
              <li className="flex items-center gap-3">
                {guestCount > 0 && seatedCount >= guestCount ? (
                  <CheckCircle2 className="w-5 h-5 text-rose-400 shrink-0" />
                ) : (
                  <Circle className="w-5 h-5 text-warm-gray-300 shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${guestCount > 0 && seatedCount >= guestCount ? "text-warm-gray-700" : "text-warm-gray-400"}`}>
                    Seating
                  </p>
                  <p className={`text-xs ${guestCount > 0 && seatedCount >= guestCount ? "text-warm-gray-500" : "text-warm-gray-400"}`}>
                    {guestCount > 0
                      ? `${seatedCount}/${guestCount} seated`
                      : "0/0 seated"}
                  </p>
                </div>
              </li>
            </ul>
          </Card>
        </>
      )}
    </div>
  );
}

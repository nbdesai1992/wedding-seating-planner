"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Plus, Heart, CalendarDays, Users, LayoutGrid } from "lucide-react";
import { UserButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/Button";
import { Eyebrow } from "@/components/ui/Card";
import { EventCard } from "@/components/events/EventCard";
import { useAuth } from "@/lib/auth";
import { getEvents, deleteEvent, type Event } from "@/lib/events";

export default function DashboardPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const hasFetched = useRef(false);

  const fetchEvents = useCallback(async () => {
    try {
      const data = await getEvents();
      setEvents(data);
    } catch {
      setError("Failed to load events. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && user && !hasFetched.current) {
      hasFetched.current = true;
      fetchEvents();
    }
  }, [authLoading, user]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleDelete(id: string) {
    try {
      await deleteEvent(id);
      setEvents((prev) => prev.filter((e) => e.id !== id));
    } catch {
      setError("Failed to delete event. Please try again.");
    }
  }

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-2 border-rose-400 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="eyebrow">Loading your events</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top accent bar — matches auth pages */}
      <div className="h-1 bg-gradient-to-r from-rose-300 via-gold-400 to-rose-300" />

      {/* Header */}
      <header className="border-b border-cream-300/60 bg-cream-50/80 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-rose-100 flex items-center justify-center">
              <Heart className="w-4 h-4 text-rose-400" fill="currentColor" />
            </div>
            <span className="font-serif text-xl font-semibold tracking-tight text-warm-gray-800">
              Seated
            </span>
          </div>

          <div className="flex items-center gap-4">
            {user && (
              <span className="text-ui-sm text-warm-gray-400 hidden sm:block">
                {user.name}
              </span>
            )}
            <UserButton
              appearance={{
                elements: {
                  avatarBox: "w-8 h-8 ring-2 ring-rose-100",
                  userButtonPopoverCard: "shadow-lifted border border-cream-200 rounded-card",
                  userButtonPopoverActionButton: "text-warm-gray-600 hover:bg-cream-50",
                  userButtonPopoverFooter: "hidden",
                },
              }}
            />
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-10 sm:py-14 animate-fade-up">
        {/* Page header — eyebrow + serif title + hairline + action */}
        <div className="mb-10">
          <Eyebrow tone="gold" className="mb-2.5">
            Your celebrations
          </Eyebrow>
          <div className="flex items-center gap-5">
            <h1 className="font-serif text-3xl font-semibold tracking-tight text-warm-gray-800 shrink-0">
              Your Events
            </h1>
            <div className="hairline" aria-hidden="true" />
            <Button
              icon={<Plus className="w-4 h-4" />}
              onClick={() => router.push("/events/new")}
              className="shrink-0"
            >
              New Event
            </Button>
          </div>
          <p className="text-ui text-warm-gray-400 mt-2.5">
            {events.length === 0
              ? "Start by creating your first event"
              : `${events.length} event${events.length !== 1 ? "s" : ""}`}
          </p>
        </div>

        {error && (
          <div className="mb-8 frosted-card !border-rose-200/80 px-5 py-3.5 flex items-center gap-3">
            <span
              className="w-1.5 h-1.5 rotate-45 bg-rose-500 shrink-0"
              aria-hidden="true"
            />
            <p className="text-ui text-warm-gray-600">{error}</p>
          </div>
        )}

        {/* Events grid or empty state */}
        {events.length === 0 ? (
          <EmptyState onCreate={() => router.push("/events/new")} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event) => (
              <EventCard key={event.id} event={event} onDelete={handleDelete} />
            ))}
            {/* Create-event affordance as a peer tile in the grid */}
            <button
              onClick={() => router.push("/events/new")}
              className="group min-h-[220px] rounded-card-lg border border-dashed border-gold-400/50
                         bg-white/30 flex flex-col items-center justify-center gap-3 press
                         transition-[background-color,border-color,box-shadow] duration-300 ease-out
                         hover:bg-white/60 hover:border-gold-500/70 hover:shadow-soft
                         focus-visible:focus-ring-gold"
            >
              <span className="w-11 h-11 rounded-full bg-gold-400/10 border border-gold-400/40 flex items-center justify-center transition-colors duration-300 group-hover:bg-gold-400/20">
                <Plus className="w-5 h-5 text-gold-500" />
              </span>
              <span className="eyebrow eyebrow-gold">New Event</span>
            </button>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="py-8">
        <div className="max-w-xs mx-auto mb-4 ornament-divider">
          <span className="ornament-dot" />
        </div>
        <p className="text-center text-ui-xs text-warm-gray-400">
          Seated — Your wedding, beautifully arranged
        </p>
      </footer>
    </div>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  const steps = [
    {
      number: "01",
      label: "Create your event",
      description: "Name it, set the date",
      icon: <CalendarDays className="w-4 h-4" />,
    },
    {
      number: "02",
      label: "Add your guests",
      description: "One by one or import CSV",
      icon: <Users className="w-4 h-4" />,
    },
    {
      number: "03",
      label: "Design your seating",
      description: "AI arranges your layout",
      icon: <LayoutGrid className="w-4 h-4" />,
    },
  ];

  return (
    <div className="max-w-2xl mx-auto animate-fade-up">
      <div className="frosted-card shadow-lifted px-8 py-12 sm:px-14 sm:py-14 text-center">
        {/* Gold ornament */}
        <div className="ornament-divider mb-8 max-w-[240px] mx-auto">
          <span className="ornament-dot" />
        </div>

        <Eyebrow tone="gold" className="mb-3">
          The first page of your plan
        </Eyebrow>

        <h2 className="font-serif text-2xl sm:text-[28px] font-medium text-warm-gray-800 leading-snug mb-3">
          Every beautiful celebration begins
          <br className="hidden sm:block" /> with a single invitation.
        </h2>
        <p className="text-ui text-warm-gray-400 max-w-md mx-auto mb-10">
          Create your event, and we&apos;ll take care of the rest — from the
          guest list to the last place card.
        </p>

        {/* 3-step journey */}
        <div className="grid grid-cols-3 gap-4 sm:gap-6 mb-10">
          {steps.map((step) => (
            <div key={step.number} className="text-center">
              <p className="font-serif text-lg font-medium text-gold-500 mb-1.5">
                {step.number}
              </p>
              <p className="text-ui-sm font-medium text-warm-gray-700 mb-0.5">
                {step.label}
              </p>
              <p className="text-ui-xs text-warm-gray-400 leading-snug">
                {step.description}
              </p>
            </div>
          ))}
        </div>

        {/* Starter actions — pills */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button size="lg" icon={<Plus className="w-4 h-4" />} onClick={onCreate}>
            Create Your First Event
          </Button>
          <Button
            size="lg"
            variant="secondary"
            onClick={() => (window.location.href = "/#how-it-works")}
          >
            See How It Works
          </Button>
        </div>
      </div>
    </div>
  );
}

"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Plus, Heart, CalendarDays } from "lucide-react";
import { UserButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/Button";
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
    if (!authLoading && !hasFetched.current) {
      hasFetched.current = true;
      fetchEvents();
    }
  }, [authLoading]); // eslint-disable-line react-hooks/exhaustive-deps

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
      <div className="min-h-screen bg-cream-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-2 border-rose-400 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-sm text-warm-gray-400">Loading your events...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream-50 flex flex-col">
      {/* Top accent bar */}
      <div className="h-1 bg-gradient-to-r from-rose-200 via-gold-400 to-rose-200" />

      {/* Header */}
      <header className="border-b border-cream-200 bg-white/60 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center">
              <Heart className="w-4 h-4 text-rose-400" fill="currentColor" />
            </div>
            <span className="font-serif text-lg font-semibold text-warm-gray-800">
              Seated
            </span>
          </div>

          <div className="flex items-center gap-4">
            {user && (
              <span className="text-sm text-warm-gray-400 hidden sm:block">
                {user.name}
              </span>
            )}
            <UserButton
              appearance={{
                elements: {
                  avatarBox: "w-8 h-8 ring-2 ring-rose-100",
                  userButtonPopoverCard: "shadow-card-hover border border-cream-200 rounded-card",
                  userButtonPopoverActionButton: "text-warm-gray-600 hover:bg-cream-50",
                  userButtonPopoverFooter: "hidden",
                },
              }}
            />
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-8 sm:py-10">
        {/* Page header */}
        <div className="flex items-end justify-between mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-serif font-semibold text-warm-gray-800 mb-1">
              Your Events
            </h1>
            <p className="text-sm text-warm-gray-400">
              {events.length === 0
                ? "Start by creating your first event"
                : `${events.length} event${events.length !== 1 ? "s" : ""}`}
            </p>
          </div>

          <Button
            icon={<Plus className="w-4 h-4" />}
            onClick={() => router.push("/events/new")}
          >
            New Event
          </Button>
        </div>

        {error && (
          <div className="mb-6 px-4 py-3 rounded-soft bg-red-50 border border-red-200 text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Events grid or empty state */}
        {events.length === 0 ? (
          <EmptyState onCreate={() => router.push("/events/new")} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {events.map((event) => (
              <EventCard key={event.id} event={event} onDelete={handleDelete} />
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-cream-200 py-6">
        <p className="text-center text-xs text-warm-gray-400">
          Seated — Your wedding, beautifully arranged
        </p>
      </footer>
    </div>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4">
      <div className="w-20 h-20 rounded-full bg-rose-50 flex items-center justify-center mb-6">
        <CalendarDays className="w-10 h-10 text-rose-300" />
      </div>

      <h2 className="font-serif text-xl font-semibold text-warm-gray-800 mb-2">
        No events yet
      </h2>
      <p className="text-sm text-warm-gray-400 text-center max-w-sm mb-8">
        Create your first event to start planning the seating arrangement for
        your special day.
      </p>

      <Button
        size="lg"
        icon={<Plus className="w-4 h-4" />}
        onClick={onCreate}
      >
        Create Your First Event
      </Button>

      {/* Decorative divider */}
      <div className="divider-gold mt-12 max-w-xs" />
    </div>
  );
}

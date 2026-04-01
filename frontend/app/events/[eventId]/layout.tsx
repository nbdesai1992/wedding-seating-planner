"use client";

import React, { useEffect, useState } from "react";
import { useParams, usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Heart,
  LayoutDashboard,
  Users,
  Grid3X3,
  FileDown,
  ArrowLeft,
  Calendar,
  MapPin,
  Pencil,
} from "lucide-react";
import { getEvent, type Event } from "@/lib/events";
import { ProgressIndicator } from "@/components/events/ProgressIndicator";

const navItems = [
  { label: "Overview", href: "", icon: LayoutDashboard },
  { label: "Guests", href: "/guests", icon: Users },
  { label: "Seating Chart", href: "/seating", icon: Grid3X3 },
  { label: "Export", href: "/export", icon: FileDown },
];

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

export default function EventLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const pathname = usePathname();
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-cream-50 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-rose-400 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!event) return null;

  // Check if we're on the edit page — render without sidebar
  const isEditPage = pathname.endsWith("/edit");
  if (isEditPage) {
    return <>{children}</>;
  }

  const basePath = `/events/${eventId}`;

  return (
    <div className="min-h-screen bg-cream-50 flex flex-col">
      {/* Top accent bar */}
      <div className="h-1 bg-gradient-to-r from-rose-200 via-gold-400 to-rose-200" />

      {/* Header */}
      <header className="border-b border-cream-200 bg-white/60 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center hover:bg-rose-200 transition-colors"
            >
              <Heart className="w-4 h-4 text-rose-400" fill="currentColor" />
            </Link>
            <span className="font-serif text-lg font-semibold text-warm-gray-800">
              Seated
            </span>
          </div>

          <Link
            href="/dashboard"
            className="text-sm text-warm-gray-400 hover:text-warm-gray-600 transition-colors flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            All Events
          </Link>
        </div>
      </header>

      <div className="flex-1 flex max-w-7xl mx-auto w-full">
        {/* Sidebar */}
        <aside className="w-64 shrink-0 border-r border-cream-200 bg-cream-50/50 hidden md:block">
          <div className="p-6">
            {/* Event info */}
            <div className="mb-6">
              <div className="flex items-start justify-between mb-2">
                <h2 className="font-serif text-lg font-semibold text-warm-gray-800 leading-snug pr-2">
                  {event.name}
                </h2>
                <button
                  onClick={() => router.push(`${basePath}/edit`)}
                  className="p-1 rounded-soft text-warm-gray-400 hover:text-warm-gray-600 hover:bg-cream-200 transition-colors shrink-0"
                  title="Edit event"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="space-y-2 mt-3">
                <div className="flex items-center gap-2 text-xs text-warm-gray-500">
                  <Calendar className="w-3.5 h-3.5 text-gold-400" />
                  <span>{formatDate(event.date)}</span>
                </div>
                {event.venue_description && (
                  <div className="flex items-start gap-2 text-xs text-warm-gray-500">
                    <MapPin className="w-3.5 h-3.5 text-gold-400 shrink-0 mt-0.5" />
                    <span className="line-clamp-3">{event.venue_description}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-xs text-warm-gray-500">
                  <Users className="w-3.5 h-3.5 text-gold-400" />
                  <span>
                    {event.guest_count === 0
                      ? "No guests yet"
                      : `${event.guest_count} guest${event.guest_count !== 1 ? "s" : ""}`}
                  </span>
                </div>
              </div>
            </div>

            <div className="divider-gold mb-6" />

            {/* Progress indicator */}
            <ProgressIndicator
              eventId={eventId}
              guestCount={event.guest_count}
            />

            <div className="divider-gold mb-6" />

            {/* Navigation */}
            <nav className="space-y-1">
              {navItems.map((item) => {
                const href = basePath + item.href;
                const isActive =
                  item.href === ""
                    ? pathname === basePath
                    : pathname.startsWith(href);
                const Icon = item.icon;

                return (
                  <Link
                    key={item.label}
                    href={href}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-soft text-sm transition-colors ${
                      isActive
                        ? "bg-rose-100 text-rose-700 font-medium"
                        : "text-warm-gray-500 hover:text-warm-gray-700 hover:bg-cream-200"
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? "text-rose-500" : "text-warm-gray-400"}`} />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </aside>

        {/* Mobile nav */}
        <div className="md:hidden border-b border-cream-200 bg-white w-full fixed top-[calc(1px+56px)] z-10">
          <div className="px-4 pt-2 pb-1">
            <ProgressIndicator
              eventId={eventId}
              guestCount={event.guest_count}
            />
          </div>
          <div className="flex items-center gap-1 px-4 py-2 overflow-x-auto">
            {navItems.map((item) => {
              const href = basePath + item.href;
              const isActive =
                item.href === ""
                  ? pathname === basePath
                  : pathname.startsWith(href);
              const Icon = item.icon;

              return (
                <Link
                  key={item.label}
                  href={href}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-pill text-xs whitespace-nowrap transition-colors ${
                    isActive
                      ? "bg-rose-100 text-rose-700 font-medium"
                      : "text-warm-gray-500 hover:bg-cream-100"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Main content */}
        <main className="flex-1 min-w-0 md:p-8 p-6 pt-16 md:pt-8">
          {children}
        </main>
      </div>
    </div>
  );
}

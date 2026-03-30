"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { EventForm } from "@/components/events/EventForm";
import { getEvent, updateEvent, type Event } from "@/lib/events";

export default function EditEventPage() {
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

  async function handleUpdate(data: {
    name: string;
    date: string | null;
    venue_description: string | null;
  }) {
    await updateEvent(eventId, data);
    router.push(`/events/${eventId}`);
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-cream-50 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-rose-400 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!event) return null;

  return (
    <EventForm
      initialData={{
        name: event.name,
        date: event.date,
        venue_description: event.venue_description,
      }}
      onSubmit={handleUpdate}
      submitLabel="Save Changes"
      title="Edit Event"
      subtitle="Update your event details"
    />
  );
}

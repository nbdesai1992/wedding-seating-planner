"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { EventForm } from "@/components/events/EventForm";
import { createEvent } from "@/lib/events";
import { ToastProvider, useToast } from "@/components/providers/ToastProvider";

function NewEventContent() {
  const router = useRouter();
  const { success, error } = useToast();

  async function handleCreate(data: {
    name: string;
    date: string | null;
    venue_description: string | null;
  }) {
    try {
      const event = await createEvent(data);
      success("Event created! Head to Guests to add your guest list.");
      // Brief delay so the toast is visible before navigation
      setTimeout(() => router.push(`/events/${event.id}`), 600);
    } catch {
      error("Failed to create event. Please try again.");
    }
  }

  return (
    <EventForm
      onSubmit={handleCreate}
      submitLabel="Create Event"
      title="Create a New Event"
      subtitle="Set up the basics — you can always change these later"
    />
  );
}

export default function NewEventPage() {
  return (
    <ToastProvider>
      <NewEventContent />
    </ToastProvider>
  );
}

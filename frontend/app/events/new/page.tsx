"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { EventForm } from "@/components/events/EventForm";
import { createEvent } from "@/lib/events";

export default function NewEventPage() {
  const router = useRouter();

  async function handleCreate(data: {
    name: string;
    date: string | null;
    venue_description: string | null;
  }) {
    const event = await createEvent(data);
    router.push(`/events/${event.id}`);
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

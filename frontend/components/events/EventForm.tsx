"use client";

import React, { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { ApiError } from "@/lib/api";

interface EventFormProps {
  initialData?: {
    name: string;
    date: string | null;
    venue_description: string | null;
  };
  onSubmit: (data: {
    name: string;
    date: string | null;
    venue_description: string | null;
  }) => Promise<void>;
  submitLabel: string;
  title: string;
  subtitle: string;
}

export function EventForm({
  initialData,
  onSubmit,
  submitLabel,
  title,
  subtitle,
}: EventFormProps) {
  const router = useRouter();
  const [name, setName] = useState(initialData?.name || "");
  const [date, setDate] = useState(initialData?.date || "");
  const [venueDescription, setVenueDescription] = useState(
    initialData?.venue_description || ""
  );
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Please give your event a name.");
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        date: date || null,
        venue_description: venueDescription.trim() || null,
      });
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Something went wrong. Please try again.");
      }
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-cream-50 flex flex-col">
      {/* Top accent bar */}
      <div className="h-1 bg-gradient-to-r from-rose-200 via-gold-400 to-rose-200" />

      <div className="flex-1 flex items-start justify-center px-4 py-12 sm:py-16">
        <div className="w-full max-w-lg">
          {/* Header */}
          <div className="mb-8">
            <button
              type="button"
              onClick={() => router.back()}
              className="text-sm text-warm-gray-400 hover:text-warm-gray-600 transition-colors mb-6 flex items-center gap-1.5"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.75 19.5L8.25 12l7.5-7.5"
                />
              </svg>
              Back
            </button>
            <h1 className="text-2xl font-serif font-semibold text-warm-gray-800 mb-1">
              {title}
            </h1>
            <p className="text-sm text-warm-gray-400">{subtitle}</p>
          </div>

          {/* Form Card */}
          <Card padding="lg">
            <div className="divider-gold mb-7" />

            {error && (
              <div className="mb-6 px-4 py-3 rounded-soft bg-red-50 border border-red-200 text-red-700 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <Input
                label="Event Name"
                type="text"
                placeholder="Our Wedding Reception"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoFocus
              />

              <Input
                label="Date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                hint="You can set this later if you haven't decided yet"
              />

              <div className="divider-gold my-1" />

              <div className="flex items-center gap-3 pt-1">
                <Button
                  type="submit"
                  size="lg"
                  loading={isSubmitting}
                  className="flex-1"
                >
                  {submitLabel}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="lg"
                  onClick={() => router.back()}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}

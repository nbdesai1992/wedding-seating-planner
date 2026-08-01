"use client";

import React, { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
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
    <div className="min-h-screen flex flex-col">
      {/* Top accent bar — matches auth pages */}
      <div className="h-1 bg-gradient-to-r from-rose-300 via-gold-400 to-rose-300" />

      <div className="flex-1 flex items-start justify-center px-4 py-14 sm:py-20">
        <div className="w-full max-w-lg animate-fade-up">
          {/* Header */}
          <div className="mb-8">
            <button
              type="button"
              onClick={() => router.back()}
              className="text-ui-sm text-warm-gray-400 hover:text-warm-gray-600 transition-colors duration-150 mb-8 flex items-center gap-1.5"
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
            <p className="eyebrow eyebrow-gold mb-2.5">Your Celebration</p>
            <h1 className="font-serif text-3xl font-semibold tracking-tight text-warm-gray-800 mb-2">
              {title}
            </h1>
            <p className="text-ui text-warm-gray-400">{subtitle}</p>
          </div>

          {/* Form Card — frosted, like the auth surfaces */}
          <div className="frosted-card shadow-lifted px-8 py-8 sm:px-10 sm:py-10">
            <div className="ornament-divider mb-8">
              <span className="ornament-dot" />
            </div>

            {error && (
              <div className="mb-6 px-4 py-3 rounded-card bg-red-50/80 border border-red-200 text-red-700 text-ui">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-7">
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
          </div>
        </div>
      </div>
    </div>
  );
}

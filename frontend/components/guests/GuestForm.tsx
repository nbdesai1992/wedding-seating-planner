"use client";

import React, { useState, FormEvent } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { ApiError } from "@/lib/api";
import type { Guest, CreateGuestData, UpdateGuestData } from "@/lib/guests";

interface GuestFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: CreateGuestData | UpdateGuestData) => Promise<void>;
  guest?: Guest | null;
}

const MEAL_OPTIONS = [
  "",
  "Chicken",
  "Beef",
  "Fish",
  "Vegetarian",
  "Vegan",
  "Kosher",
  "Halal",
  "Kids Meal",
  "Other",
];

export function GuestForm({ open, onClose, onSubmit, guest }: GuestFormProps) {
  const isEdit = !!guest;

  const [name, setName] = useState(guest?.name || "");
  const [email, setEmail] = useState(guest?.email || "");
  const [mealPreference, setMealPreference] = useState(
    guest?.meal_preference || ""
  );
  const [isPlusOne, setIsPlusOne] = useState(guest?.is_plus_one || false);
  const [groupTag, setGroupTag] = useState(guest?.group_tag || "");
  const [notes, setNotes] = useState(guest?.notes || "");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form when guest changes
  React.useEffect(() => {
    if (open) {
      setName(guest?.name || "");
      setEmail(guest?.email || "");
      setMealPreference(guest?.meal_preference || "");
      setIsPlusOne(guest?.is_plus_one || false);
      setGroupTag(guest?.group_tag || "");
      setNotes(guest?.notes || "");
      setError("");
      setIsSubmitting(false);
    }
  }, [open, guest]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Guest name is required.");
      return;
    }

    const data: CreateGuestData = {
      name: name.trim(),
      email: email.trim() || null,
      meal_preference: mealPreference || null,
      is_plus_one: isPlusOne,
      group_tag: groupTag.trim() || null,
      notes: notes.trim() || null,
    };

    setIsSubmitting(true);
    try {
      await onSubmit(data);
      onClose();
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
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? "Edit Guest" : "Add Guest"}
      size="md"
    >
      {error && (
        <div className="mb-5 px-4 py-3 rounded-card bg-red-50/80 border border-red-200 text-red-700 text-ui">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <Input
          label="Name"
          type="text"
          placeholder="Full name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          autoFocus
        />

        <Input
          label="Email"
          type="email"
          placeholder="guest@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          hint="Optional — for sending updates"
        />

        <div className="flex flex-col gap-1.5">
          <label className="text-ui-sm font-medium text-warm-gray-700">
            Meal Preference
          </label>
          <div className="relative">
            <select
              value={mealPreference}
              onChange={(e) => setMealPreference(e.target.value)}
              className="w-full px-3.5 py-2 pr-8 text-ui bg-white border border-cream-300 rounded-[10px] text-warm-gray-800 hover:border-rose-200 focus:border-rose-400 focus:ring-2 focus:ring-rose-200 focus:ring-offset-1 focus:outline-none transition-[border-color,box-shadow] duration-150 ease-out appearance-none cursor-pointer"
            >
              {MEAL_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt || "No preference"}
                </option>
              ))}
            </select>
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
              <svg className="w-4 h-4 text-warm-gray-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
              </svg>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-ui-sm font-medium text-warm-gray-700">
            Group / Tag
          </label>
          <Input
            type="text"
            placeholder="e.g., Bride's Family, College Friends"
            value={groupTag}
            onChange={(e) => setGroupTag(e.target.value)}
            hint="Helps with seating suggestions"
          />
        </div>

        <div className="flex items-center gap-3">
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={isPlusOne}
              onChange={(e) => setIsPlusOne(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-cream-200 rounded-pill peer peer-checked:bg-rose-400 transition-colors after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full" />
          </label>
          <span className="text-ui text-warm-gray-700">Plus one</span>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-ui-sm font-medium text-warm-gray-700">
            Notes
          </label>
          <textarea
            placeholder="Any special requirements, dietary notes, accessibility needs..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full px-3.5 py-2 text-ui bg-white border border-cream-300 rounded-[10px] text-warm-gray-800 placeholder:text-warm-gray-400 hover:border-rose-200 focus:border-rose-400 focus:ring-2 focus:ring-rose-200 focus:ring-offset-1 focus:outline-none transition-[border-color,box-shadow] duration-150 ease-out resize-none"
          />
        </div>

        <div className="divider-gold my-1" />

        <div className="flex items-center gap-3 pt-1">
          <Button
            type="submit"
            size="lg"
            loading={isSubmitting}
            className="flex-1"
          >
            {isEdit ? "Save Changes" : "Add Guest"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="lg"
            onClick={onClose}
          >
            Cancel
          </Button>
        </div>
      </form>
    </Modal>
  );
}

"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import {
  getGuests,
  createGuest,
  updateGuest,
  deleteGuest,
  importCSV,
  type Guest,
  type CreateGuestData,
  type UpdateGuestData,
} from "@/lib/guests";
import { GuestTable } from "@/components/guests/GuestTable";
import { GuestForm } from "@/components/guests/GuestForm";
import { CSVImport } from "@/components/guests/CSVImport";
import { ToastProvider, useToast } from "@/components/providers/ToastProvider";

export default function GuestsPage() {
  return (
    <ToastProvider>
      <GuestsContent />
    </ToastProvider>
  );
}

function GuestsContent() {
  const params = useParams();
  const eventId = params.eventId as string;
  const toast = useToast();

  const [guests, setGuests] = useState<Guest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  // Modal states
  const [showForm, setShowForm] = useState(false);
  const [editGuest, setEditGuest] = useState<Guest | null>(null);
  const [showCSV, setShowCSV] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<Guest | null>(
    null
  );

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const loadGuests = useCallback(async () => {
    try {
      const data = await getGuests(eventId);
      setGuests(data);
      setError("");
    } catch {
      setError("Failed to load guests. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    loadGuests();
  }, [loadGuests]);

  // Handlers
  async function handleCreateGuest(data: CreateGuestData | UpdateGuestData) {
    await createGuest(eventId, data as CreateGuestData);
    await loadGuests();
    toast.success("Guest added successfully");
  }

  async function handleUpdateGuest(data: CreateGuestData | UpdateGuestData) {
    if (!editGuest) return;
    await updateGuest(eventId, editGuest.id, data as UpdateGuestData);
    await loadGuests();
    toast.success("Guest updated");
  }

  async function handleDeleteGuest(guest: Guest) {
    setShowDeleteConfirm(guest);
  }

  async function confirmDelete() {
    if (!showDeleteConfirm) return;
    try {
      await deleteGuest(eventId, showDeleteConfirm.id);
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(showDeleteConfirm.id);
        return next;
      });
      await loadGuests();
      toast.success("Guest removed");
    } catch {
      toast.error("Failed to delete guest. Please try again.");
    } finally {
      setShowDeleteConfirm(null);
    }
  }

  async function handleBulkDelete() {
    if (selectedIds.size === 0) return;

    const confirmed = window.confirm(
      `Delete ${selectedIds.size} selected guest${selectedIds.size !== 1 ? "s" : ""}? This cannot be undone.`
    );
    if (!confirmed) return;

    const count = selectedIds.size;
    try {
      await Promise.all(
        Array.from(selectedIds).map((id) => deleteGuest(eventId, id))
      );
      setSelectedIds(new Set());
      await loadGuests();
      toast.success(`${count} guest${count !== 1 ? "s" : ""} removed`);
    } catch {
      toast.error("Some deletions failed. Please try again.");
      await loadGuests();
    }
  }

  async function handleCSVImport(file: File): Promise<number> {
    const imported = await importCSV(eventId, file);
    await loadGuests();
    const count = imported.length;
    toast.success(`Imported ${count} guest${count !== 1 ? "s" : ""}!`);
    return count;
  }

  function handleToggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function handleToggleSelectAll() {
    if (selectedIds.size === guests.length && guests.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(guests.map((g) => g.id)));
    }
  }

  function handleOpenAdd() {
    setEditGuest(null);
    setShowForm(true);
  }

  function handleOpenEdit(guest: Guest) {
    setEditGuest(guest);
    setShowForm(true);
  }

  function handleCloseForm() {
    setShowForm(false);
    setEditGuest(null);
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin h-8 w-8 border-2 border-rose-400 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl animate-fade-up">
      {/* Page header — eyebrow + serif + hairline */}
      <div className="mb-8">
        <p className="eyebrow eyebrow-gold mb-2">Who&apos;s Coming</p>
        <div className="flex items-center gap-5">
          <h1 className="font-serif text-2xl font-semibold tracking-tight text-warm-gray-800 shrink-0">
            Guest List
          </h1>
          <div className="hairline" aria-hidden="true" />
        </div>
        <p className="text-ui text-warm-gray-400 mt-2">
          Manage your guest list, meal preferences, and groups
        </p>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mb-6 frosted-card !border-rose-200/80 px-5 py-3.5 flex items-center gap-3">
          <span
            className="w-1.5 h-1.5 rotate-45 bg-rose-500 shrink-0"
            aria-hidden="true"
          />
          <p className="text-ui text-warm-gray-600">{error}</p>
        </div>
      )}

      {/* Guest table */}
      <GuestTable
        guests={guests}
        onEdit={handleOpenEdit}
        onDelete={handleDeleteGuest}
        onAdd={handleOpenAdd}
        onImportCSV={() => setShowCSV(true)}
        selectedIds={selectedIds}
        onToggleSelect={handleToggleSelect}
        onToggleSelectAll={handleToggleSelectAll}
        onBulkDelete={handleBulkDelete}
      />

      {/* Add/Edit Guest Modal */}
      <GuestForm
        open={showForm}
        onClose={handleCloseForm}
        onSubmit={editGuest ? handleUpdateGuest : handleCreateGuest}
        guest={editGuest}
      />

      {/* CSV Import Modal */}
      <CSVImport
        open={showCSV}
        onClose={() => setShowCSV(false)}
        onImport={handleCSVImport}
      />

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-warm-gray-900/30 backdrop-blur-modal animate-fade-in"
            onClick={() => setShowDeleteConfirm(null)}
          />
          <div className="relative w-full max-w-sm bg-white rounded-card-lg shadow-modal border border-cream-200/80 animate-fade-in p-7">
            <h3 className="font-serif text-lg font-medium text-warm-gray-800 mb-2">
              Delete Guest
            </h3>
            <div className="divider-gold mb-4" />
            <p className="text-ui text-warm-gray-500 mb-6">
              Are you sure you want to delete{" "}
              <span className="font-medium text-warm-gray-700">
                {showDeleteConfirm.name}
              </span>
              ? This action cannot be undone.
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={confirmDelete}
                className="press flex-1 px-4 py-2 text-ui-sm font-medium bg-red-500 text-white rounded-pill hover:bg-red-600 transition-[background-color,transform] duration-200 ease-out"
              >
                Delete
              </button>
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="press flex-1 px-4 py-2 text-ui-sm font-medium bg-white text-warm-gray-700 border border-cream-300 rounded-pill hover:bg-cream-100 transition-[background-color,transform] duration-200 ease-out"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

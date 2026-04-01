"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { Users } from "lucide-react";
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
    <div className="max-w-5xl animate-fade-in">
      {/* Page header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-8 h-8 rounded-full bg-rose-50 flex items-center justify-center">
              <Users className="w-4 h-4 text-rose-400" />
            </div>
            <h1 className="text-2xl font-serif font-semibold text-warm-gray-800">
              Guest List
            </h1>
          </div>
          <p className="text-sm text-warm-gray-400 ml-[42px]">
            Manage your guest list, meal preferences, and groups
          </p>
        </div>
      </div>

      <div className="divider-gold mb-6" />

      {/* Error banner */}
      {error && (
        <div className="mb-4 px-4 py-3 rounded-soft bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
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
          <div className="relative w-full max-w-sm bg-white rounded-card shadow-modal border border-cream-200 animate-fade-in p-6">
            <h3 className="font-serif text-lg font-semibold text-warm-gray-800 mb-2">
              Delete Guest
            </h3>
            <p className="text-sm text-warm-gray-500 mb-5">
              Are you sure you want to delete{" "}
              <span className="font-medium text-warm-gray-700">
                {showDeleteConfirm.name}
              </span>
              ? This action cannot be undone.
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={confirmDelete}
                className="flex-1 px-4 py-2 text-sm font-medium bg-red-500 text-white rounded-soft hover:bg-red-600 transition-colors"
              >
                Delete
              </button>
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="flex-1 px-4 py-2 text-sm font-medium bg-cream-100 text-warm-gray-700 border border-cream-300 rounded-soft hover:bg-cream-200 transition-colors"
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

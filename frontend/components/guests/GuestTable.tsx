"use client";

import React, { useState, useMemo } from "react";
import {
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Pencil,
  Trash2,
  UserPlus,
  Check,
  X,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Guest } from "@/lib/guests";

type SortField = "name" | "email" | "meal_preference" | "group_tag" | "status";
type SortDirection = "asc" | "desc";

interface GuestTableProps {
  guests: Guest[];
  onEdit: (guest: Guest) => void;
  onDelete: (guest: Guest) => void;
  onAdd: () => void;
  onImportCSV: () => void;
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: () => void;
  onBulkDelete: () => void;
}

function getSeatedStatus(guest: Guest): "seated" | "unseated" {
  return guest.table_id ? "seated" : "unseated";
}

export function GuestTable({
  guests,
  onEdit,
  onDelete,
  onAdd,
  onImportCSV,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  onBulkDelete,
}: GuestTableProps) {
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDir, setSortDir] = useState<SortDirection>("asc");

  const filteredGuests = useMemo(() => {
    const q = search.toLowerCase().trim();
    let result = guests;

    if (q) {
      result = result.filter(
        (g) =>
          g.name.toLowerCase().includes(q) ||
          (g.email && g.email.toLowerCase().includes(q)) ||
          (g.group_tag && g.group_tag.toLowerCase().includes(q))
      );
    }

    result = [...result].sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "name":
          cmp = a.name.localeCompare(b.name);
          break;
        case "email":
          cmp = (a.email || "").localeCompare(b.email || "");
          break;
        case "meal_preference":
          cmp = (a.meal_preference || "").localeCompare(
            b.meal_preference || ""
          );
          break;
        case "group_tag":
          cmp = (a.group_tag || "").localeCompare(b.group_tag || "");
          break;
        case "status": {
          const sa = getSeatedStatus(a);
          const sb = getSeatedStatus(b);
          cmp = sa.localeCompare(sb);
          break;
        }
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

    return result;
  }, [guests, search, sortField, sortDir]);

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  }

  function SortIcon({ field }: { field: SortField }) {
    if (sortField !== field)
      return <ArrowUpDown className="w-3 h-3 text-warm-gray-300" />;
    return sortDir === "asc" ? (
      <ArrowUp className="w-3 h-3 text-rose-400" />
    ) : (
      <ArrowDown className="w-3 h-3 text-rose-400" />
    );
  }

  const seatedCount = guests.filter((g) => g.table_id).length;
  const unseatedCount = guests.length - seatedCount;
  const allFilteredSelected =
    filteredGuests.length > 0 &&
    filteredGuests.every((g) => selectedIds.has(g.id));

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="flex items-center gap-4 text-xs text-warm-gray-500">
        <span className="flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5 text-gold-400" />
          <span className="font-medium text-warm-gray-700">
            {guests.length}
          </span>{" "}
          guest{guests.length !== 1 ? "s" : ""} total
        </span>
        <span className="h-3 w-px bg-cream-300" />
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          {seatedCount} seated
        </span>
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
          {unseatedCount} unseated
        </span>
      </div>

      {/* Search + actions bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-warm-gray-400" />
          <input
            type="text"
            placeholder="Search by name, email, or group..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={cn(
              "w-full pl-9 pr-3 py-2 text-sm",
              "bg-white border border-cream-300 rounded-soft",
              "text-warm-gray-800 placeholder:text-warm-gray-400",
              "hover:border-rose-200 focus:border-rose-400 focus:ring-2 focus:ring-rose-200 focus:ring-offset-1 focus:outline-none",
              "transition-all duration-150"
            )}
          />
        </div>

        <div className="flex items-center gap-2 ml-auto">
          {selectedIds.size > 0 && (
            <button
              onClick={onBulkDelete}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium",
                "bg-red-50 text-red-600 border border-red-200 rounded-soft",
                "hover:bg-red-100 transition-colors"
              )}
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete ({selectedIds.size})
            </button>
          )}

          <button
            onClick={onImportCSV}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium",
              "bg-cream-100 text-warm-gray-700 border border-cream-300 rounded-soft",
              "hover:bg-cream-200 transition-colors"
            )}
          >
            Import CSV
          </button>

          <button
            onClick={onAdd}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium",
              "bg-rose-500 text-white rounded-soft shadow-sm",
              "hover:bg-rose-600 transition-colors"
            )}
          >
            <UserPlus className="w-3.5 h-3.5" />
            Add Guest
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-card border border-cream-200 shadow-card overflow-hidden">
        {filteredGuests.length === 0 ? (
          <div className="px-6 py-16 text-center">
            {guests.length === 0 ? (
              <>
                <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-rose-50 flex items-center justify-center">
                  <Users className="w-7 h-7 text-rose-300" />
                </div>
                <p className="text-sm font-medium text-warm-gray-700 mb-1">
                  No guests yet
                </p>
                <p className="text-xs text-warm-gray-400 mb-5">
                  Start building your guest list by adding guests individually
                  or importing a CSV file.
                </p>
                <div className="flex items-center justify-center gap-3">
                  <button
                    onClick={onAdd}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-rose-500 text-white rounded-soft shadow-sm hover:bg-rose-600 transition-colors"
                  >
                    <UserPlus className="w-4 h-4" />
                    Add First Guest
                  </button>
                  <button
                    onClick={onImportCSV}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-cream-100 text-warm-gray-700 border border-cream-300 rounded-soft hover:bg-cream-200 transition-colors"
                  >
                    Import CSV
                  </button>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-warm-gray-500">
                  No guests match &ldquo;{search}&rdquo;
                </p>
              </>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-cream-200 bg-cream-50/50">
                  <th className="w-10 px-4 py-3">
                    <input
                      type="checkbox"
                      checked={allFilteredSelected}
                      onChange={onToggleSelectAll}
                      className="w-3.5 h-3.5 rounded border-cream-300 text-rose-400 focus:ring-rose-200 cursor-pointer accent-rose-400"
                    />
                  </th>
                  {(
                    [
                      ["name", "Name"],
                      ["email", "Email"],
                      ["meal_preference", "Meal"],
                      ["group_tag", "Group"],
                      ["status", "Status"],
                    ] as [SortField, string][]
                  ).map(([field, label]) => (
                    <th
                      key={field}
                      className="px-4 py-3 text-left font-medium text-warm-gray-500 cursor-pointer select-none hover:text-warm-gray-700 transition-colors"
                      onClick={() => handleSort(field)}
                    >
                      <span className="inline-flex items-center gap-1.5">
                        {label}
                        <SortIcon field={field} />
                      </span>
                    </th>
                  ))}
                  <th className="w-24 px-4 py-3 text-right font-medium text-warm-gray-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cream-100">
                {filteredGuests.map((guest) => {
                  const seated = getSeatedStatus(guest) === "seated";
                  const isSelected = selectedIds.has(guest.id);

                  return (
                    <tr
                      key={guest.id}
                      className={cn(
                        "group transition-colors",
                        isSelected
                          ? "bg-rose-50/50"
                          : "hover:bg-cream-50/60"
                      )}
                    >
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => onToggleSelect(guest.id)}
                          className="w-3.5 h-3.5 rounded border-cream-300 text-rose-400 focus:ring-rose-200 cursor-pointer accent-rose-400"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-warm-gray-800">
                            {guest.name}
                          </span>
                          {guest.is_plus_one && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium rounded-pill bg-gold-300/20 text-gold-600">
                              +1
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-warm-gray-500">
                        {guest.email || (
                          <span className="text-warm-gray-300">&mdash;</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-warm-gray-500">
                        {guest.meal_preference ? (
                          <span className="inline-flex px-2 py-0.5 text-xs rounded-pill bg-cream-100 text-warm-gray-600 border border-cream-200">
                            {guest.meal_preference}
                          </span>
                        ) : (
                          <span className="text-warm-gray-300">&mdash;</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-warm-gray-500">
                        {guest.group_tag ? (
                          <span className="inline-flex px-2 py-0.5 text-xs rounded-pill bg-rose-50 text-rose-600 border border-rose-200/60">
                            {guest.group_tag}
                          </span>
                        ) : (
                          <span className="text-warm-gray-300">&mdash;</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {seated ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
                            <Check className="w-3 h-3" />
                            Seated
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600">
                            <X className="w-3 h-3" />
                            Unseated
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => onEdit(guest)}
                            className="p-1.5 rounded-soft text-warm-gray-400 hover:text-warm-gray-700 hover:bg-cream-100 transition-colors"
                            title="Edit guest"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onDelete(guest)}
                            className="p-1.5 rounded-soft text-warm-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                            title="Delete guest"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

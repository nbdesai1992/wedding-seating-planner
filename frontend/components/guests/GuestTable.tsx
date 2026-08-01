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
  Upload,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/Button";
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
    <div className="space-y-5">
      {/* Summary bar — pill status chips */}
      <div className="flex items-center gap-3 text-ui-xs text-warm-gray-500">
        <span className="flex items-center gap-1.5">
          <Users className="w-3.5 h-3.5 text-gold-400" />
          <span className="font-medium text-warm-gray-700">
            {guests.length}
          </span>{" "}
          guest{guests.length !== 1 ? "s" : ""} total
        </span>
        <span className="h-3 w-px bg-cream-300" aria-hidden="true" />
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-pill bg-emerald-50 border border-emerald-200/70 text-emerald-700">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          {seatedCount} seated
        </span>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-pill bg-amber-50 border border-amber-200/70 text-amber-700">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
          {unseatedCount} unseated
        </span>
      </div>

      {/* Search + actions bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-warm-gray-400" />
          <input
            type="text"
            placeholder="Search by name, email, or group..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={cn(
              "w-full pl-10 pr-4 py-2 text-ui",
              "bg-white/80 border border-cream-300 rounded-pill",
              "text-warm-gray-800 placeholder:text-warm-gray-400",
              "hover:border-rose-200 focus:border-rose-400 focus:ring-2 focus:ring-rose-200 focus:ring-offset-1 focus:ring-offset-cream-50 focus:outline-none",
              "transition-[border-color,box-shadow] duration-150 ease-out"
            )}
          />
        </div>

        <div className="flex items-center gap-2 ml-auto">
          {selectedIds.size > 0 && (
            <button
              onClick={onBulkDelete}
              className={cn(
                "press inline-flex items-center gap-1.5 px-3.5 py-1.5 text-ui-xs font-medium",
                "bg-red-50 text-red-600 border border-red-200 rounded-pill",
                "hover:bg-red-100 transition-[background-color,transform] duration-200 ease-out"
              )}
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete ({selectedIds.size})
            </button>
          )}

          <Button variant="secondary" size="sm" onClick={onImportCSV}>
            Import CSV
          </Button>

          <Button
            size="sm"
            icon={<UserPlus className="w-3.5 h-3.5" />}
            onClick={onAdd}
          >
            Add Guest
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-card-lg border border-cream-200/80 shadow-soft overflow-hidden">
        {filteredGuests.length === 0 ? (
          <div className="px-6 py-16 text-center">
            {guests.length === 0 ? (
              <>
                {/* Designed table empty state */}
                <div className="ornament-divider mb-8 max-w-[200px] mx-auto">
                  <span className="ornament-dot" />
                </div>

                <p className="eyebrow eyebrow-gold mb-3">The Guest Book Awaits</p>
                <h3 className="font-serif text-xl font-medium text-warm-gray-800 mb-2">
                  Your guest list starts here
                </h3>
                <p className="text-ui-sm text-warm-gray-400 max-w-sm mx-auto mb-8 leading-relaxed">
                  Add guests one at a time, or import your full list from a
                  spreadsheet. You&apos;ll need guests before you can create a
                  seating chart.
                </p>

                {/* Starter pill actions */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-6">
                  <Button
                    size="lg"
                    icon={<UserPlus className="w-4 h-4" />}
                    onClick={onAdd}
                  >
                    Add Guest
                  </Button>
                  <Button
                    size="lg"
                    variant="secondary"
                    icon={<Upload className="w-4 h-4 text-gold-400" />}
                    onClick={onImportCSV}
                  >
                    Import CSV
                  </Button>
                </div>

                {/* Hint */}
                <p className="text-ui-xs text-warm-gray-400">
                  After adding guests, head to the Seating tab to assign them
                </p>
              </>
            ) : (
              <>
                <p className="text-ui text-warm-gray-500">
                  No guests match &ldquo;{search}&rdquo;
                </p>
              </>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-ui">
              <thead>
                <tr className="border-b border-cream-200">
                  <th className="w-10 px-5 py-3.5">
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
                      className="px-5 py-3.5 text-left text-ui-xs font-medium uppercase tracking-[0.14em] text-warm-gray-400 cursor-pointer select-none hover:text-warm-gray-600 transition-colors duration-150"
                      onClick={() => handleSort(field)}
                    >
                      <span className="inline-flex items-center gap-1.5">
                        {label}
                        <SortIcon field={field} />
                      </span>
                    </th>
                  ))}
                  <th className="w-24 px-5 py-3.5 text-right text-ui-xs font-medium uppercase tracking-[0.14em] text-warm-gray-400">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cream-200/70">
                {filteredGuests.map((guest) => {
                  const seated = getSeatedStatus(guest) === "seated";
                  const isSelected = selectedIds.has(guest.id);

                  return (
                    <tr
                      key={guest.id}
                      className={cn(
                        "group transition-colors duration-150",
                        isSelected
                          ? "bg-rose-50/50"
                          : "hover:bg-cream-50/60"
                      )}
                    >
                      <td className="px-5 py-3.5">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => onToggleSelect(guest.id)}
                          className="w-3.5 h-3.5 rounded border-cream-300 text-rose-400 focus:ring-rose-200 cursor-pointer accent-rose-400"
                        />
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-warm-gray-800">
                            {guest.name}
                          </span>
                          {guest.is_plus_one && (
                            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 text-[10px] font-medium rounded-pill bg-gold-400/10 border border-gold-400/40 text-gold-600">
                              +1
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-warm-gray-500">
                        {guest.email || (
                          <span className="text-warm-gray-300">&mdash;</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-warm-gray-500">
                        {guest.meal_preference ? (
                          <span className="inline-flex px-2.5 py-0.5 text-ui-xs rounded-pill bg-cream-100 text-warm-gray-600 border border-cream-300/80">
                            {guest.meal_preference}
                          </span>
                        ) : (
                          <span className="text-warm-gray-300">&mdash;</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-warm-gray-500">
                        {guest.group_tag ? (
                          <span className="inline-flex px-2.5 py-0.5 text-ui-xs rounded-pill bg-rose-50 text-rose-600 border border-rose-200/60">
                            {guest.group_tag}
                          </span>
                        ) : (
                          <span className="text-warm-gray-300">&mdash;</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        {seated ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-ui-xs font-medium rounded-pill bg-emerald-50 border border-emerald-200/70 text-emerald-700">
                            <Check className="w-3 h-3" />
                            Seated
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-ui-xs font-medium rounded-pill bg-amber-50 border border-amber-200/70 text-amber-700">
                            <X className="w-3 h-3" />
                            Unseated
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                          <button
                            onClick={() => onEdit(guest)}
                            className="p-1.5 rounded-pill text-warm-gray-400 hover:text-warm-gray-700 hover:bg-cream-100 transition-colors duration-150"
                            title="Edit guest"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onDelete(guest)}
                            className="p-1.5 rounded-pill text-warm-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors duration-150"
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

"use client";

import React, { useState, useCallback, useRef } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Upload, FileText, CheckCircle, AlertCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { ApiError } from "@/lib/api";

interface CSVImportProps {
  open: boolean;
  onClose: () => void;
  onImport: (file: File) => Promise<number>;
}

interface CSVPreview {
  headers: string[];
  rows: string[][];
  totalRows: number;
}

function parseCSVPreview(text: string): CSVPreview {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) {
    return { headers: [], rows: [], totalRows: 0 };
  }

  const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
  const rows = lines.slice(1).map((line) =>
    line.split(",").map((cell) => cell.trim().replace(/^"|"$/g, ""))
  );

  return {
    headers,
    rows: rows.slice(0, 5), // Preview first 5 rows
    totalRows: rows.length,
  };
}

export function CSVImport({ open, onClose, onImport }: CSVImportProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<CSVPreview | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [result, setResult] = useState<{ count: number } | null>(null);
  const [error, setError] = useState("");

  const reset = useCallback(() => {
    setFile(null);
    setPreview(null);
    setIsDragging(false);
    setIsImporting(false);
    setResult(null);
    setError("");
  }, []);

  React.useEffect(() => {
    if (open) reset();
  }, [open, reset]);

  async function handleFile(selectedFile: File) {
    if (!selectedFile.name.endsWith(".csv")) {
      setError("Please select a CSV file.");
      return;
    }

    setError("");
    setFile(selectedFile);

    try {
      const text = await selectedFile.text();
      const parsed = parseCSVPreview(text);

      if (parsed.headers.length === 0) {
        setError("The CSV file appears to be empty.");
        setFile(null);
        return;
      }

      const hasNameColumn = parsed.headers.some(
        (h) => h.toLowerCase() === "name"
      );
      if (!hasNameColumn) {
        setError('CSV must include a "name" column. Found: ' + parsed.headers.join(", "));
        setFile(null);
        return;
      }

      setPreview(parsed);
    } catch {
      setError("Could not read the file. Please try again.");
      setFile(null);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) handleFile(droppedFile);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave() {
    setIsDragging(false);
  }

  async function handleImport() {
    if (!file) return;

    setIsImporting(true);
    setError("");

    try {
      const count = await onImport(file);
      setResult({ count });
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Import failed. Please check your file and try again.");
      }
      setIsImporting(false);
    }
  }

  function handleDone() {
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="Import Guests from CSV" size="lg">
      {/* Success state */}
      {result ? (
        <div className="text-center py-6">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-50 flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-emerald-500" />
          </div>
          <p className="text-lg font-serif font-semibold text-warm-gray-800 mb-1">
            Import Complete
          </p>
          <p className="text-sm text-warm-gray-500 mb-6">
            Successfully imported{" "}
            <span className="font-medium text-warm-gray-700">
              {result.count}
            </span>{" "}
            guest{result.count !== 1 ? "s" : ""}.
          </p>
          <Button onClick={handleDone} size="lg">
            Done
          </Button>
        </div>
      ) : (
        <>
          {error && (
            <div className="mb-5 px-4 py-3 rounded-card bg-red-50/80 border border-red-200 text-red-700 text-ui flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Dropzone or preview */}
          {!preview ? (
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "border border-dashed rounded-card-lg p-10 text-center cursor-pointer",
                "transition-[border-color,background-color] duration-200 ease-out",
                isDragging
                  ? "border-rose-400 bg-rose-50/50"
                  : "border-gold-400/50 bg-cream-50/50 hover:border-gold-500/70 hover:bg-cream-100/50"
              )}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                }}
              />
              <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gold-400/10 border border-gold-400/40 flex items-center justify-center">
                <Upload className="w-5 h-5 text-gold-500" />
              </div>
              <p className="font-serif text-lg font-medium text-warm-gray-800 mb-1">
                Drop your CSV file here
              </p>
              <p className="text-ui-xs text-warm-gray-400">
                or click to browse. Required column:{" "}
                <span className="font-medium">name</span>. Optional: email,
                meal_preference, group_tag, notes
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* File info */}
              <div className="flex items-center gap-3 px-4 py-3 rounded-card bg-cream-50 border border-cream-200">
                <FileText className="w-5 h-5 text-gold-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-ui font-medium text-warm-gray-700 truncate">
                    {file?.name}
                  </p>
                  <p className="text-ui-xs text-warm-gray-400">
                    {preview.totalRows} row{preview.totalRows !== 1 ? "s" : ""}{" "}
                    found
                  </p>
                </div>
                <button
                  onClick={reset}
                  className="p-1 rounded-pill text-warm-gray-400 hover:text-warm-gray-600 hover:bg-cream-200 transition-colors duration-150"
                  title="Remove file"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Preview table */}
              <div className="border border-cream-200 rounded-card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-ui-xs">
                    <thead>
                      <tr className="border-b border-cream-200">
                        {preview.headers.map((h) => (
                          <th
                            key={h}
                            className="px-3 py-2 text-left font-medium uppercase tracking-[0.14em] text-warm-gray-400"
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-cream-200/70">
                      {preview.rows.map((row, i) => (
                        <tr key={i}>
                          {row.map((cell, j) => (
                            <td
                              key={j}
                              className="px-3 py-2 text-warm-gray-600 max-w-[200px] truncate"
                            >
                              {cell || (
                                <span className="text-warm-gray-300">
                                  &mdash;
                                </span>
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {preview.totalRows > 5 && (
                  <div className="px-3 py-2 border-t border-cream-200 bg-cream-50/50 text-ui-xs text-warm-gray-400 text-center">
                    Showing first 5 of {preview.totalRows} rows
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 pt-1">
                <Button
                  onClick={handleImport}
                  size="lg"
                  loading={isImporting}
                  className="flex-1"
                >
                  Import {preview.totalRows} Guest
                  {preview.totalRows !== 1 ? "s" : ""}
                </Button>
                <Button variant="ghost" size="lg" onClick={onClose}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </Modal>
  );
}

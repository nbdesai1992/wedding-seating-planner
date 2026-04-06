import { api, BASE_URL, getToken } from "./api";

// ── Types ──────────────────────────────────────────────────

export interface Seat {
  id: string;
  table_id: string;
  seat_index: number;
  guest_id: string | null;
  guest_name: string | null;
  x_offset: number;
  y_offset: number;
}

export interface Table {
  id: string;
  layout_id: string;
  name: string;
  shape: "round" | "rectangle" | "sweetheart";
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  seat_count: number;
  seats: Seat[];
}

export interface Feature {
  id: string;
  layout_id: string;
  name: string;
  type: string; // "dance_floor", "stage", "bar", "entrance", "buffet", etc.
  shape: string; // "rectangle" | "circle"
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
}

export interface Layout {
  id: string;
  event_id: string;
  canvas_width: number;
  canvas_height: number;
  tables: Table[];
  features: Feature[];
}

export interface SeatingAssignment {
  seat_id: string;
  guest_id: string;
}

export interface SeatingSuggestion {
  assignments: SeatingAssignment[];
  reasoning: string;
}

// ── Layout CRUD ────────────────────────────────────────────

export async function getLayout(eventId: string): Promise<Layout> {
  return api.get<Layout>(`/api/events/${eventId}/layout`);
}

export async function updateLayout(
  eventId: string,
  data: { canvas_width?: number; canvas_height?: number }
): Promise<Layout> {
  return api.put<Layout>(`/api/events/${eventId}/layout`, data);
}

// ── Layout Config (Deterministic) ──────────────────────────

export interface LayoutConfig {
  table_count: number;
  table_shape: "round" | "rectangle";
  seats_per_table: number;
  include_sweetheart: boolean;
  include_dance_floor: boolean;
  dance_floor_position: "center" | "front" | "left" | "right";
  include_bar: boolean;
  include_stage: boolean;
  include_cake_table: boolean;
}

export async function generateLayoutFromConfig(
  eventId: string,
  config: LayoutConfig
): Promise<Layout> {
  return api.post<Layout>(
    `/api/events/${eventId}/layout/generate-config`,
    config
  );
}

export async function generateLayout(
  eventId: string,
  description: string
): Promise<Layout> {
  return api.post<Layout>(`/api/events/${eventId}/layout/generate`, {
    description,
  });
}

export async function modifyLayout(
  eventId: string,
  prompt: string
): Promise<Layout> {
  return api.post<Layout>(`/api/events/${eventId}/layout/modify`, {
    prompt,
  });
}

// ── Table CRUD ─────────────────────────────────────────────

export async function createTable(
  eventId: string,
  data: Partial<Omit<Table, "id" | "seats">>
): Promise<Table> {
  return api.post<Table>(`/api/events/${eventId}/layout/tables`, data);
}

export async function updateTable(
  eventId: string,
  tableId: string,
  data: Partial<Omit<Table, "id" | "seats">>
): Promise<Table> {
  return api.put<Table>(`/api/events/${eventId}/layout/tables/${tableId}`, data);
}

export async function deleteTable(
  eventId: string,
  tableId: string
): Promise<void> {
  return api.delete<void>(`/api/events/${eventId}/layout/tables/${tableId}`);
}

// ── Feature CRUD ───────────────────────────────────────────

export async function createFeature(
  eventId: string,
  data: Partial<Omit<Feature, "id">>
): Promise<Feature> {
  return api.post<Feature>(`/api/events/${eventId}/layout/features`, data);
}

export async function updateFeature(
  eventId: string,
  featureId: string,
  data: Partial<Omit<Feature, "id">>
): Promise<Feature> {
  return api.put<Feature>(
    `/api/events/${eventId}/layout/features/${featureId}`,
    data
  );
}

export async function deleteFeature(
  eventId: string,
  featureId: string
): Promise<void> {
  return api.delete<void>(
    `/api/events/${eventId}/layout/features/${featureId}`
  );
}

// ── Seat Assignment ────────────────────────────────────────

export async function assignSeat(
  eventId: string,
  seatId: string,
  guestId: string
): Promise<Seat> {
  return api.put<Seat>(`/api/events/${eventId}/layout/seats/${seatId}/assign`, {
    guest_id: guestId,
  });
}

export async function unassignSeat(
  eventId: string,
  seatId: string
): Promise<Seat> {
  return api.put<Seat>(
    `/api/events/${eventId}/layout/seats/${seatId}/unassign`
  );
}

// ── AI Seating ─────────────────────────────────────────────

export async function suggestSeating(
  eventId: string,
  constraints?: string
): Promise<SeatingSuggestion> {
  return api.post<SeatingSuggestion>(
    `/api/events/${eventId}/seating/suggest`,
    constraints ? { constraints } : undefined
  );
}

export async function applySeating(
  eventId: string,
  assignments: SeatingAssignment[]
): Promise<void> {
  return api.post<void>(`/api/events/${eventId}/seating/apply`, {
    assignments,
  });
}

// ── Export ──────────────────────────────────────────────────

export async function exportPDF(eventId: string): Promise<Blob> {
  const token = await getToken();

  const res = await fetch(`${BASE_URL}/api/events/${eventId}/export/pdf`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!res.ok) {
    throw new Error(`PDF export failed: ${res.status}`);
  }

  return res.blob();
}

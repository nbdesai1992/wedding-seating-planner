import { api, ApiError, BASE_URL, getToken } from "./api";

export interface Guest {
  id: string;
  event_id: string;
  name: string;
  email: string | null;
  meal_preference: string | null;
  is_plus_one: boolean;
  plus_one_of: string | null;
  group_tag: string | null;
  notes: string | null;
  table_id: string | null;
  seat_index: number | null;
  created_at: string;
  updated_at: string;
}

export interface CreateGuestData {
  name: string;
  email?: string | null;
  meal_preference?: string | null;
  is_plus_one?: boolean;
  plus_one_of?: string | null;
  group_tag?: string | null;
  notes?: string | null;
}

export interface UpdateGuestData {
  name?: string | null;
  email?: string | null;
  meal_preference?: string | null;
  is_plus_one?: boolean;
  plus_one_of?: string | null;
  group_tag?: string | null;
  notes?: string | null;
}

export async function getGuests(eventId: string): Promise<Guest[]> {
  return api.get<Guest[]>(`/api/events/${eventId}/guests`);
}

export async function createGuest(
  eventId: string,
  data: CreateGuestData
): Promise<Guest> {
  return api.post<Guest>(`/api/events/${eventId}/guests`, data);
}

export async function updateGuest(
  eventId: string,
  guestId: string,
  data: UpdateGuestData
): Promise<Guest> {
  return api.put<Guest>(`/api/events/${eventId}/guests/${guestId}`, data);
}

export async function deleteGuest(
  eventId: string,
  guestId: string
): Promise<void> {
  await api.delete(`/api/events/${eventId}/guests/${guestId}`);
}

export async function importCSV(
  eventId: string,
  file: File
): Promise<Guest[]> {
  const formData = new FormData();
  formData.append("file", file);

  const headers: Record<string, string> = {};
  const token = await getToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(
    `${BASE_URL}/api/events/${eventId}/guests/import-csv`,
    {
      method: "POST",
      headers,
      body: formData,
    }
  );

  if (res.status === 401) {
    throw new ApiError("Unauthorized", 401);
  }

  const data = await res.json();

  if (!res.ok) {
    const message =
      (data as Record<string, unknown>)?.detail as string ||
      (data as Record<string, unknown>)?.message as string ||
      `Import failed with status ${res.status}`;
    throw new ApiError(message, res.status, data);
  }

  return data as Guest[];
}

export { ApiError };

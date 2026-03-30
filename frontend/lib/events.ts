import { api } from "./api";

export interface Event {
  id: string;
  name: string;
  date: string | null;
  venue_description: string | null;
  created_at: string;
  updated_at: string;
  guest_count: number;
}

export interface CreateEventData {
  name: string;
  date?: string | null;
  venue_description?: string | null;
}

export interface UpdateEventData {
  name?: string | null;
  date?: string | null;
  venue_description?: string | null;
}

export async function getEvents(): Promise<Event[]> {
  return api.get<Event[]>("/api/events");
}

export async function getEvent(id: string): Promise<Event> {
  return api.get<Event>(`/api/events/${id}`);
}

export async function createEvent(data: CreateEventData): Promise<Event> {
  return api.post<Event>("/api/events", data);
}

export async function updateEvent(id: string, data: UpdateEventData): Promise<Event> {
  return api.put<Event>(`/api/events/${id}`, data);
}

export async function deleteEvent(id: string): Promise<void> {
  await api.delete(`/api/events/${id}`);
}

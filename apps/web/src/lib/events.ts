import { getAccessToken } from "@/lib/auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export type EventStatus = "ACTIVE" | "INACTIVE";

export type EventItem = {
  id: string;
  organizationId: string;
  templateId: string | null;
  name: string;
  description: string | null;
  date: string;
  location: string | null;
  registrationToken: string;
  status: EventStatus;
  createdAt: string;
  updatedAt: string;
  template?: {
    id: string;
    name: string;
    templateType: string;
    titleText: string;
    isActive: boolean;
  } | null;
  _count?: {
    participants: number;
  };
};

export type ParticipantItem = {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  createdAt: string;
};

export type EventInput = {
  name: string;
  description?: string;
  date: string;
  location?: string;
  status?: EventStatus;
  templateId?: string | null;
};

function authHeaders() {
  const token = getAccessToken();
  if (!token) throw new Error("Not authenticated");
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

async function parseResponse(response: Response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      typeof data.message === "string"
        ? data.message
        : Array.isArray(data.message)
          ? data.message.join(", ")
          : "Request failed",
    );
  }
  return data;
}

export async function listEvents(): Promise<EventItem[]> {
  const response = await fetch(`${API_URL}/events`, {
    headers: authHeaders(),
  });
  return (await parseResponse(response)) as EventItem[];
}

export async function getEvent(id: string): Promise<EventItem> {
  const response = await fetch(`${API_URL}/events/${id}`, {
    headers: authHeaders(),
  });
  return (await parseResponse(response)) as EventItem;
}

export async function createEvent(input: EventInput) {
  const response = await fetch(`${API_URL}/events`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(input),
  });
  return (await parseResponse(response)) as {
    message: string;
    event: EventItem;
  };
}

export async function updateEvent(id: string, input: Partial<EventInput>) {
  const response = await fetch(`${API_URL}/events/${id}`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify(input),
  });
  return (await parseResponse(response)) as {
    message: string;
    event: EventItem;
  };
}

export async function deleteEvent(id: string) {
  const response = await fetch(`${API_URL}/events/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  return (await parseResponse(response)) as { message: string };
}

export async function activateEvent(id: string) {
  const response = await fetch(`${API_URL}/events/${id}/activate`, {
    method: "PATCH",
    headers: authHeaders(),
  });
  return (await parseResponse(response)) as {
    message: string;
    event: EventItem;
  };
}

export async function deactivateEvent(id: string) {
  const response = await fetch(`${API_URL}/events/${id}/deactivate`, {
    method: "PATCH",
    headers: authHeaders(),
  });
  return (await parseResponse(response)) as {
    message: string;
    event: EventItem;
  };
}

export async function listParticipants(eventId: string): Promise<ParticipantItem[]> {
  const response = await fetch(`${API_URL}/events/${eventId}/participants`, {
    headers: authHeaders(),
  });
  return (await parseResponse(response)) as ParticipantItem[];
}

export function registrationPath(token: string) {
  return `/register/${token}`;
}

import { getAccessToken } from "@/lib/auth";
import { getApiBase } from "@/lib/api";

export type EventStatus = "ACTIVE" | "INACTIVE";
export type EventKind = "WORKSHOP" | "SPORTS_MEET";
export type Placement = "FIRST" | "SECOND" | "THIRD";

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
  kind?: EventKind;
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
    games?: number;
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
  kind?: EventKind;
  templateId?: string | null;
};

export type GameResultItem = {
  id: string;
  placement: Placement;
  teamLabel: string | null;
  participant: { id: string; fullName: string; email: string };
  certificate: {
    id: string;
    certificateNumber: string;
    status: string;
  } | null;
};

export type EventGameItem = {
  id: string;
  name: string;
  category: string | null;
  sortOrder: number;
  _count?: { results: number };
  results: GameResultItem[];
};

export type ImportParticipantsResult = {
  message: string;
  summary: {
    created: number;
    skipped: number;
    failed: number;
    total: number;
  };
  results: Array<{
    row: number;
    email: string;
    status: "created" | "skipped" | "failed";
    message: string;
    certificateNumber?: string;
  }>;
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
  const response = await fetch(`${getApiBase()}/events`, {
    headers: authHeaders(),
  });
  return (await parseResponse(response)) as EventItem[];
}

export async function getEvent(id: string): Promise<EventItem> {
  const response = await fetch(`${getApiBase()}/events/${id}`, {
    headers: authHeaders(),
  });
  return (await parseResponse(response)) as EventItem;
}

export async function createEvent(input: EventInput) {
  const response = await fetch(`${getApiBase()}/events`, {
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
  const response = await fetch(`${getApiBase()}/events/${id}`, {
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
  const response = await fetch(`${getApiBase()}/events/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  return (await parseResponse(response)) as { message: string };
}

export async function activateEvent(id: string) {
  const response = await fetch(`${getApiBase()}/events/${id}/activate`, {
    method: "PATCH",
    headers: authHeaders(),
  });
  return (await parseResponse(response)) as {
    message: string;
    event: EventItem;
  };
}

export async function deactivateEvent(id: string) {
  const response = await fetch(`${getApiBase()}/events/${id}/deactivate`, {
    method: "PATCH",
    headers: authHeaders(),
  });
  return (await parseResponse(response)) as {
    message: string;
    event: EventItem;
  };
}

export async function listParticipants(
  eventId: string,
): Promise<ParticipantItem[]> {
  const response = await fetch(
    `${getApiBase()}/events/${eventId}/participants`,
    {
      headers: authHeaders(),
    },
  );
  return (await parseResponse(response)) as ParticipantItem[];
}

export async function importParticipantsCsv(
  eventId: string,
  csv: string,
): Promise<ImportParticipantsResult> {
  const response = await fetch(
    `${getApiBase()}/events/${eventId}/participants/import`,
    {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ csv }),
    },
  );
  return (await parseResponse(response)) as ImportParticipantsResult;
}

export function registrationPath(token: string) {
  return `/register/${token}`;
}

export async function listEventGames(eventId: string): Promise<EventGameItem[]> {
  const response = await fetch(`${getApiBase()}/events/${eventId}/games`, {
    headers: authHeaders(),
  });
  return (await parseResponse(response)) as EventGameItem[];
}

export async function createEventGame(
  eventId: string,
  input: { name: string; category?: string },
) {
  const response = await fetch(`${getApiBase()}/events/${eventId}/games`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(input),
  });
  return (await parseResponse(response)) as {
    message: string;
    game: EventGameItem;
  };
}

export async function deleteEventGame(eventId: string, gameId: string) {
  const response = await fetch(
    `${getApiBase()}/events/${eventId}/games/${gameId}`,
    {
      method: "DELETE",
      headers: authHeaders(),
    },
  );
  return (await parseResponse(response)) as { message: string };
}

export async function upsertGameResult(
  eventId: string,
  gameId: string,
  input: {
    email: string;
    fullName?: string;
    placement: Placement;
    teamLabel?: string;
  },
) {
  const response = await fetch(
    `${getApiBase()}/events/${eventId}/games/${gameId}/results`,
    {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ ...input, issueCertificate: true }),
    },
  );
  return (await parseResponse(response)) as {
    message: string;
    certificate?: { certificateNumber: string };
  };
}

export async function importGameResultsCsv(
  eventId: string,
  gameId: string,
  csv: string,
) {
  const response = await fetch(
    `${getApiBase()}/events/${eventId}/games/${gameId}/results/import`,
    {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({ csv }),
    },
  );
  return (await parseResponse(response)) as ImportParticipantsResult;
}

export function placementLabel(placement: Placement) {
  if (placement === "FIRST") return "1st";
  if (placement === "SECOND") return "2nd";
  return "3rd";
}

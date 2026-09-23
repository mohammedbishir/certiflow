import { getApiBase } from "@/lib/api";

export type PublicEvent = {
  id: string;
  name: string;
  description: string | null;
  date: string;
  location: string | null;
  organizationName: string;
  organizationLogo: string | null;
};

export type RegisterInput = {
  fullName: string;
  email: string;
  phone?: string;
};

export async function getPublicEvent(token: string): Promise<PublicEvent> {
  const response = await fetch(`${getApiBase()}/public/events/${token}`, {
    cache: "no-store",
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      typeof data.message === "string"
        ? data.message
        : "Registration link is invalid",
    );
  }

  return data as PublicEvent;
}

export async function registerParticipant(token: string, input: RegisterInput) {
  const response = await fetch(
    `${getApiBase()}/public/events/${token}/register`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
  );
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      typeof data.message === "string"
        ? data.message
        : Array.isArray(data.message)
          ? data.message.join(", ")
          : "Registration failed",
    );
  }

  return data as {
    message: string;
    participant: {
      id: string;
      fullName: string;
      email: string;
      phone: string | null;
    };
    event: { id: string; name: string };
    certificate: {
      certificateNumber: string;
      downloadUrl: string;
    };
  };
}

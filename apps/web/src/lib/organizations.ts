import { getAccessToken } from "@/lib/auth";
import { getApiBase } from "@/lib/api";

export type Organization = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  logo: string | null;
  website: string | null;
  signatoryName: string | null;
  signatoryDesignation: string | null;
  signatureUrl: string | null;
  createdAt: string;
  updatedAt: string;
};

export type DashboardStats = {
  organization: {
    id: string;
    name: string;
  };
  counts: {
    eventsTotal: number;
    eventsActive: number;
    participantsTotal: number;
    certificatesTotal: number;
    certificatesValid: number;
    certificatesRevoked: number;
    templatesActive: number;
  };
  recentEvents: Array<{
    id: string;
    name: string;
    date: string;
    status: "ACTIVE" | "INACTIVE";
    location: string | null;
    _count: {
      participants: number;
      certificates: number;
    };
  }>;
};

export type UpdateOrganizationInput = {
  name?: string;
  email?: string;
  phone?: string;
  logo?: string;
  website?: string;
  signatoryName?: string;
  signatoryDesignation?: string;
  signatureUrl?: string;
};

function authHeaders() {
  const token = getAccessToken();
  if (!token) {
    throw new Error("Not authenticated");
  }

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

export async function getOrganization(): Promise<Organization> {
  const response = await fetch(`${getApiBase()}/organizations/me`, {
    headers: authHeaders(),
  });
  return (await parseResponse(response)) as Organization;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const response = await fetch(`${getApiBase()}/organizations/me/dashboard`, {
    headers: authHeaders(),
  });
  return (await parseResponse(response)) as DashboardStats;
}

export async function updateOrganization(input: UpdateOrganizationInput) {
  const response = await fetch(`${getApiBase()}/organizations/me`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify(input),
  });
  return (await parseResponse(response)) as {
    message: string;
    organization: Organization;
  };
}

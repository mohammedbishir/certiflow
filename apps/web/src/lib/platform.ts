import { getApiBase } from "@/lib/api";
import { getAccessToken, type OrganizationStatus } from "@/lib/auth";

export type PlatformOrganization = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  website: string | null;
  status: OrganizationStatus;
  reviewedAt: string | null;
  createdAt: string;
  users: Array<{ name: string; email: string }>;
  _count: { events: number; templates: number };
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getAccessToken();
  if (!token) throw new Error("Not authenticated");
  const response = await fetch(`${getApiBase()}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      typeof data.message === "string" ? data.message : "Request failed",
    );
  }
  return data as T;
}

export function listOrganizations(status?: OrganizationStatus) {
  const query = status ? `?status=${status}` : "";
  return request<PlatformOrganization[]>(`/platform/organizations${query}`);
}

export function reviewOrganization(
  id: string,
  decision: "approve" | "reject",
) {
  return request<{ message: string }>(
    `/platform/organizations/${id}/${decision}`,
    { method: "PATCH" },
  );
}

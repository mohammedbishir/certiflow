import { getApiBase } from "@/lib/api";

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: "ADMIN" | "STAFF";
  organizationId: string;
};

export type AuthResponse = {
  message: string;
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
};

const ACCESS_KEY = "certiflow_access_token";
const REFRESH_KEY = "certiflow_refresh_token";

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACCESS_KEY);
}

export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(REFRESH_KEY);
}

export function saveTokens(accessToken: string, refreshToken: string) {
  localStorage.setItem(ACCESS_KEY, accessToken);
  localStorage.setItem(REFRESH_KEY, refreshToken);
}

export function clearTokens() {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

export async function loginRequest(
  email: string,
  password: string,
): Promise<AuthResponse> {
  const response = await fetch(`${getApiBase()}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      typeof data.message === "string"
        ? data.message
        : Array.isArray(data.message)
          ? data.message.join(", ")
          : "Login failed",
    );
  }

  return data as AuthResponse;
}

export async function meRequest(accessToken: string) {
  const response = await fetch(`${getApiBase()}/auth/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      typeof data.message === "string" ? data.message : "Failed to load profile",
    );
  }

  return data;
}

export async function logoutRequest(accessToken: string) {
  await fetch(`${getApiBase()}/auth/logout`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

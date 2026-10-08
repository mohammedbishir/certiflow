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

export type RegisterOrgInput = {
  organizationName: string;
  organizationEmail: string;
  organizationPhone?: string;
  name: string;
  email: string;
  password: string;
};

export async function registerRequest(
  input: RegisterOrgInput,
): Promise<AuthResponse> {
  const response = await fetch(`${getApiBase()}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

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

  return data as AuthResponse;
}

export type OrganizationStatus = "PENDING" | "APPROVED" | "REJECTED";

export type MeResponse = AuthUser & {
  createdAt: string;
  isPlatformAdmin: boolean;
  organization: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    logo: string | null;
    website: string | null;
    signatoryName: string | null;
    signatoryDesignation: string | null;
    signatureUrl: string | null;
    status: OrganizationStatus;
    isDemo: boolean;
  };
};

export async function meRequest(accessToken: string): Promise<MeResponse> {
  const response = await fetch(`${getApiBase()}/auth/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      typeof data.message === "string" ? data.message : "Failed to load profile",
    );
  }

  return data as MeResponse;
}

export async function demoLoginRequest(): Promise<AuthResponse> {
  const response = await fetch(`${getApiBase()}/auth/demo`, { method: "POST" });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      typeof data.message === "string"
        ? data.message
        : "The live demo is not available right now",
    );
  }
  return data as AuthResponse;
}

export type AuthConfig = {
  signupMode: "approval" | "closed";
  demoEnabled: boolean;
};

export async function getAuthConfig(): Promise<AuthConfig> {
  const response = await fetch(`${getApiBase()}/auth/config`, {
    cache: "no-store",
  });
  if (!response.ok) {
    return { signupMode: "approval", demoEnabled: false };
  }
  return (await response.json()) as AuthConfig;
}

export async function logoutRequest(accessToken: string) {
  await fetch(`${getApiBase()}/auth/logout`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

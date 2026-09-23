import { getAccessToken } from "@/lib/auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export type TemplateType = "PARTICIPATION" | "COMPLETION" | "ACHIEVEMENT";

export type CertificateTemplate = {
  id: string;
  organizationId: string;
  name: string;
  templateType: TemplateType;
  backgroundUrl: string | null;
  titleText: string;
  subtitleText: string | null;
  bodyText: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type TemplateInput = {
  name: string;
  templateType?: TemplateType;
  backgroundUrl?: string;
  titleText?: string;
  subtitleText?: string;
  bodyText?: string;
  isActive?: boolean;
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

export async function listTemplates(): Promise<CertificateTemplate[]> {
  const response = await fetch(`${API_URL}/templates`, {
    headers: authHeaders(),
  });
  return (await parseResponse(response)) as CertificateTemplate[];
}

export async function listActiveTemplates(): Promise<CertificateTemplate[]> {
  const response = await fetch(`${API_URL}/templates/active`, {
    headers: authHeaders(),
  });
  return (await parseResponse(response)) as CertificateTemplate[];
}

export async function seedDefaultTemplates(): Promise<CertificateTemplate[]> {
  const response = await fetch(`${API_URL}/templates/seed-defaults`, {
    method: "POST",
    headers: authHeaders(),
  });
  return (await parseResponse(response)) as CertificateTemplate[];
}

export async function getTemplate(id: string): Promise<CertificateTemplate> {
  const response = await fetch(`${API_URL}/templates/${id}`, {
    headers: authHeaders(),
  });
  return (await parseResponse(response)) as CertificateTemplate;
}

export async function createTemplate(input: TemplateInput) {
  const response = await fetch(`${API_URL}/templates`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(input),
  });
  return (await parseResponse(response)) as {
    message: string;
    template: CertificateTemplate;
  };
}

export async function updateTemplate(id: string, input: Partial<TemplateInput>) {
  const response = await fetch(`${API_URL}/templates/${id}`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify(input),
  });
  return (await parseResponse(response)) as {
    message: string;
    template: CertificateTemplate;
  };
}

export async function deleteTemplate(id: string) {
  const response = await fetch(`${API_URL}/templates/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  return (await parseResponse(response)) as { message: string };
}

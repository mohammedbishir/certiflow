import { getAccessToken } from "@/lib/auth";
import { getApiBase } from "@/lib/api";

export type TemplateType = "PARTICIPATION" | "COMPLETION" | "ACHIEVEMENT";

export type CertificateTemplate = {
  id: string;
  organizationId: string;
  name: string;
  templateType: TemplateType;
  backgroundUrl: string | null;
  templatePdfUrl: string | null;
  designJson: Record<string, unknown> | null;
  nameXPercent: number;
  nameYPercent: number;
  nameFontSize: number;
  nameColor: string;
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
  backgroundUrl?: string | null;
  titleText?: string;
  subtitleText?: string;
  bodyText?: string;
  nameXPercent?: number;
  nameYPercent?: number;
  nameFontSize?: number;
  nameColor?: string;
  designJson?: Record<string, unknown>;
  isActive?: boolean;
};

function authHeaders(json = true) {
  const token = getAccessToken();
  if (!token) throw new Error("Not authenticated");
  return json
    ? {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      }
    : {
        Authorization: `Bearer ${token}`,
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

export function templateAssetUrl(path: string | null | undefined) {
  if (!path) return null;
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }
  return `${getApiBase()}${path.startsWith("/") ? path : `/${path}`}`;
}

export async function listTemplates(): Promise<CertificateTemplate[]> {
  const response = await fetch(`${getApiBase()}/templates`, {
    headers: authHeaders(),
  });
  return (await parseResponse(response)) as CertificateTemplate[];
}

export async function listActiveTemplates(): Promise<CertificateTemplate[]> {
  const response = await fetch(`${getApiBase()}/templates/active`, {
    headers: authHeaders(),
  });
  return (await parseResponse(response)) as CertificateTemplate[];
}

export async function seedDefaultTemplates(): Promise<CertificateTemplate[]> {
  const existing = await listTemplates();
  const byName = new Map(existing.map((item) => [item.name, item]));

  const { DEFAULT_TEMPLATE_DEFS } = await import("@/lib/certificate-presets");

  for (const def of DEFAULT_TEMPLATE_DEFS) {
    const current = byName.get(def.name);
    const designJson = def.create() as unknown as Record<string, unknown>;
    const payload = {
      templateType: def.templateType,
      titleText: def.titleText,
      subtitleText: def.subtitleText,
      bodyText: def.bodyText,
      nameColor: def.nameColor,
      designJson,
      isActive: true,
    };

    if (current) {
      // Refresh design so layout/logo fixes apply to existing defaults.
      await updateTemplate(current.id, payload);
      continue;
    }

    await createTemplate({
      name: def.name,
      ...payload,
    });
  }

  return listTemplates();
}

export async function getTemplate(id: string): Promise<CertificateTemplate> {
  const response = await fetch(`${getApiBase()}/templates/${id}`, {
    headers: authHeaders(),
  });
  return (await parseResponse(response)) as CertificateTemplate;
}

export async function createTemplate(input: TemplateInput) {
  const response = await fetch(`${getApiBase()}/templates`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(input),
  });
  return (await parseResponse(response)) as {
    message: string;
    template: CertificateTemplate;
  };
}

export async function updateTemplate(
  id: string,
  input: Partial<TemplateInput>,
) {
  const response = await fetch(`${getApiBase()}/templates/${id}`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify(input),
  });
  return (await parseResponse(response)) as {
    message: string;
    template: CertificateTemplate;
  };
}

export async function uploadDesignAsset(
  file: File,
  options?: {
    name?: string;
    category?: "seals" | "shapes" | "signatures" | "other";
    removeBg?: boolean;
  },
) {
  const body = new FormData();
  body.append("file", file);
  if (options?.name) body.append("name", options.name);
  if (options?.category) body.append("category", options.category);
  if (options?.removeBg) body.append("removeBg", "true");

  const response = await fetch(`${getApiBase()}/templates/design-assets`, {
    method: "POST",
    headers: authHeaders(false),
    body,
  });
  return (await parseResponse(response)) as {
    message: string;
    url: string;
    asset: DesignAsset;
  };
}

export type DesignAsset = {
  id: string;
  organizationId: string;
  name: string;
  category: string;
  url: string;
  removeBg: boolean;
  createdAt: string;
  updatedAt: string;
};

export async function listDesignAssets(category?: string) {
  const qs = category && category !== "all" ? `?category=${category}` : "";
  const response = await fetch(`${getApiBase()}/templates/design-assets${qs}`, {
    headers: authHeaders(),
  });
  return (await parseResponse(response)) as DesignAsset[];
}

export async function deleteDesignAsset(assetId: string) {
  const response = await fetch(
    `${getApiBase()}/templates/design-assets/${assetId}`,
    {
      method: "DELETE",
      headers: authHeaders(),
    },
  );
  return (await parseResponse(response)) as { message: string };
}

export async function uploadTemplateBackground(id: string, file: File) {
  const body = new FormData();
  body.append("file", file);

  const response = await fetch(`${getApiBase()}/templates/${id}/background`, {
    method: "POST",
    headers: authHeaders(false),
    body,
  });
  return (await parseResponse(response)) as {
    message: string;
    template: CertificateTemplate;
  };
}

export async function clearTemplateBackground(id: string) {
  const response = await fetch(`${getApiBase()}/templates/${id}/background`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  return (await parseResponse(response)) as {
    message: string;
    template: CertificateTemplate;
  };
}

export async function uploadTemplatePdf(id: string, file: File) {
  const body = new FormData();
  body.append("file", file);

  const response = await fetch(`${getApiBase()}/templates/${id}/pdf`, {
    method: "POST",
    headers: authHeaders(false),
    body,
  });
  return (await parseResponse(response)) as {
    message: string;
    template: CertificateTemplate;
  };
}

export async function clearTemplatePdf(id: string) {
  const response = await fetch(`${getApiBase()}/templates/${id}/pdf`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  return (await parseResponse(response)) as {
    message: string;
    template: CertificateTemplate;
  };
}

export async function previewTemplateCertificate(
  id: string,
  input: {
    sampleName?: string;
    eventName?: string;
    eventDate?: string;
    eventLocation?: string;
    nameXPercent?: number;
    nameYPercent?: number;
    nameFontSize?: number;
    nameColor?: string;
  } = {},
) {
  const response = await fetch(`${getApiBase()}/templates/${id}/preview`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(
      typeof data.message === "string"
        ? data.message
        : "Failed to generate preview",
    );
  }

  return response.blob();
}

export async function deleteTemplate(id: string) {
  const response = await fetch(`${getApiBase()}/templates/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  return (await parseResponse(response)) as { message: string };
}

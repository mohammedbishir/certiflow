import { getAccessToken } from "@/lib/auth";
import { getApiBase } from "@/lib/api";

export type CertificateStatus = "VALID" | "REVOKED";

export type CertificateItem = {
  id: string;
  certificateNumber: string;
  status: CertificateStatus;
  issuedAt: string;
  participant: {
    id: string;
    fullName: string;
    email: string;
  };
  gameResult?: {
    id: string;
    placement: "FIRST" | "SECOND" | "THIRD";
    teamLabel: string | null;
    game: {
      id: string;
      name: string;
      category: string | null;
    };
  } | null;
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

export async function listCertificates(
  eventId: string,
): Promise<CertificateItem[]> {
  const response = await fetch(
    `${getApiBase()}/events/${eventId}/certificates`,
    {
      headers: authHeaders(),
    },
  );
  return (await parseResponse(response)) as CertificateItem[];
}

export async function revokeCertificate(certificateId: string) {
  const response = await fetch(
    `${getApiBase()}/certificates/${certificateId}/revoke`,
    {
      method: "PATCH",
      headers: authHeaders(),
    },
  );
  return (await parseResponse(response)) as {
    message: string;
    certificate: CertificateItem;
  };
}

export async function restoreCertificate(certificateId: string) {
  const response = await fetch(
    `${getApiBase()}/certificates/${certificateId}/restore`,
    {
      method: "PATCH",
      headers: authHeaders(),
    },
  );
  return (await parseResponse(response)) as {
    message: string;
    certificate: CertificateItem;
  };
}

export async function updateCertificate(
  certificateId: string,
  input: {
    fullName?: string;
    email?: string;
    placement?: "FIRST" | "SECOND" | "THIRD";
    teamLabel?: string | null;
  },
) {
  const response = await fetch(
    `${getApiBase()}/certificates/${certificateId}`,
    {
      method: "PATCH",
      headers: authHeaders(),
      body: JSON.stringify(input),
    },
  );
  return (await parseResponse(response)) as {
    message: string;
    certificate: CertificateItem;
  };
}

export function certificateDownloadUrl(certificateNumber: string) {
  return `/backend/public/certificates/${certificateNumber}/download`;
}

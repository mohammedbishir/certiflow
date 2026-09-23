import { getApiBase } from "@/lib/api";

export type VerifyResult = {
  valid: boolean;
  status: "VALID" | "REVOKED";
  certificateNumber: string;
  issuedAt: string;
  participantName: string;
  eventName: string;
  eventDate: string;
  eventLocation: string | null;
  organizationName: string;
  downloadUrl: string;
};

export async function verifyCertificate(code: string): Promise<VerifyResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(
      `${getApiBase()}/public/verify/${encodeURIComponent(code)}`,
      { cache: "no-store", signal: controller.signal },
    );
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        typeof data.message === "string"
          ? data.message
          : "Certificate not found or invalid",
      );
    }

    return data as VerifyResult;
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error(
        "Verification timed out. Check that the API is running and you are on the same Wi‑Fi.",
      );
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

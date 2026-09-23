"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ThemeToggle } from "@/components/theme-toggle";
import { verifyCertificate, type VerifyResult } from "@/lib/verify";

function formatDate(value: string) {
  return new Date(value).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function VerifyCertificatePage() {
  const params = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<VerifyResult | null>(null);

  useEffect(() => {
    verifyCertificate(params.token)
      .then(setResult)
      .catch((err) => {
        setError(
          err instanceof Error ? err.message : "Certificate not found or invalid",
        );
      })
      .finally(() => setLoading(false));
  }, [params.token]);

  return (
    <div className="page-shell flex min-h-full flex-1 flex-col">
      <div className="flex items-center justify-between px-6 py-4">
        <Link
          href="/"
          className="text-lg font-semibold tracking-tight text-foreground"
        >
          CertiFlow
        </Link>
        <ThemeToggle />
      </div>

      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center px-6 pb-16">
        {loading ? (
          <p className="text-center text-muted">Verifying certificate...</p>
        ) : error ? (
          <div className="rounded-2xl border border-border bg-surface p-8 text-center shadow-[var(--shadow)]">
            <p className="text-sm font-medium text-red-600 dark:text-red-400">
              Invalid
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-foreground">
              Certificate not found
            </h1>
            <p className="mt-3 text-muted">{error}</p>
          </div>
        ) : result ? (
          <div className="rounded-2xl border border-border bg-surface p-8 shadow-[var(--shadow)]">
            <p
              className={`text-sm font-medium ${
                result.valid
                  ? "text-accent"
                  : "text-red-600 dark:text-red-400"
              }`}
            >
              {result.valid ? "Valid certificate" : "Revoked certificate"}
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
              {result.participantName}
            </h1>
            <p className="mt-3 text-muted">
              Issued by <strong>{result.organizationName}</strong> for{" "}
              <strong>{result.eventName}</strong>
            </p>

            <dl className="mt-8 space-y-3 text-sm">
              <div className="flex justify-between gap-4 border-b border-border pb-3">
                <dt className="text-muted">Certificate ID</dt>
                <dd className="font-medium text-foreground">
                  {result.certificateNumber}
                </dd>
              </div>
              <div className="flex justify-between gap-4 border-b border-border pb-3">
                <dt className="text-muted">Status</dt>
                <dd className="font-medium text-foreground">{result.status}</dd>
              </div>
              <div className="flex justify-between gap-4 border-b border-border pb-3">
                <dt className="text-muted">Event date</dt>
                <dd className="font-medium text-foreground">
                  {formatDate(result.eventDate)}
                </dd>
              </div>
              {result.eventLocation ? (
                <div className="flex justify-between gap-4 border-b border-border pb-3">
                  <dt className="text-muted">Location</dt>
                  <dd className="font-medium text-foreground">
                    {result.eventLocation}
                  </dd>
                </div>
              ) : null}
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Issued at</dt>
                <dd className="font-medium text-foreground">
                  {formatDate(result.issuedAt)}
                </dd>
              </div>
            </dl>

            {result.valid ? (
              <a
                href={`/backend${result.downloadUrl}`}
                className="mt-8 inline-flex w-full items-center justify-center rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-accent-foreground transition hover:opacity-90"
              >
                Download certificate PDF
              </a>
            ) : null}
          </div>
        ) : null}
      </main>
    </div>
  );
}

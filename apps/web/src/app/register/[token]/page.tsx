"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { toast } from "react-toastify";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  getPublicEvent,
  registerParticipant,
  type PublicEvent,
} from "@/lib/public-registration";

function formatDate(value: string) {
  return new Date(value).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function PublicRegisterPage() {
  const params = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [event, setEvent] = useState<PublicEvent | null>(null);
  const [successName, setSuccessName] = useState<string | null>(null);
  const [certificateNumber, setCertificateNumber] = useState<string | null>(
    null,
  );
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
  });

  useEffect(() => {
    getPublicEvent(params.token)
      .then(setEvent)
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Invalid registration link");
      })
      .finally(() => setLoading(false));
  }, [params.token]);

  async function onSubmit(submitEvent: FormEvent<HTMLFormElement>) {
    submitEvent.preventDefault();
    setSubmitting(true);

    try {
      const result = await registerParticipant(params.token, {
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || undefined,
      });
      setSuccessName(result.participant.fullName);
      if (result.certificate) {
        setCertificateNumber(result.certificate.certificateNumber);
        setDownloadUrl(`/backend${result.certificate.downloadUrl}`);
      } else {
        setCertificateNumber(null);
        setDownloadUrl(null);
      }
      toast.success(result.message);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Registration failed";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="page-shell flex min-h-full flex-1 flex-col">
      <div className="flex items-center justify-between px-6 py-4">
        <p className="text-lg font-semibold tracking-tight text-foreground">
          CertiFlow
        </p>
        <ThemeToggle />
      </div>

      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center px-6 pb-16">
        {loading ? (
          <p className="text-center text-muted">Loading registration...</p>
        ) : error ? (
          <div className="rounded-2xl border border-border bg-surface p-8 text-center shadow-[var(--shadow)]">
            <h1 className="text-2xl font-semibold text-foreground">
              Registration unavailable
            </h1>
            <p className="mt-3 text-muted">{error}</p>
          </div>
        ) : successName && event ? (
          <div className="rounded-2xl border border-border bg-surface p-8 text-center shadow-[var(--shadow)]">
            <p className="text-sm font-medium text-accent">You are registered</p>
            <h1 className="mt-2 text-3xl font-semibold text-foreground">
              Thank you, {successName}
            </h1>
            <p className="mt-3 text-muted">
              Your registration for <strong>{event.name}</strong> is confirmed.
            </p>
            {certificateNumber ? (
              <p className="mt-2 text-sm text-muted">
                Certificate ID: {certificateNumber}
              </p>
            ) : event.kind === "SPORTS_MEET" ? (
              <p className="mt-3 text-sm text-muted">
                Certificates are issued after results are recorded (1st / 2nd /
                3rd place per game).
              </p>
            ) : null}
            {downloadUrl ? (
              <a
                href={downloadUrl}
                className="mt-6 inline-flex rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-accent-foreground transition hover:opacity-90"
              >
                Download certificate PDF
              </a>
            ) : null}
          </div>
        ) : event ? (
          <div className="rounded-2xl border border-border bg-surface p-6 shadow-[var(--shadow)] md:p-8">
            <p className="text-sm font-medium text-accent">
              {event.organizationName}
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
              {event.name}
            </h1>
            <p className="mt-2 text-sm text-muted">
              {formatDate(event.date)}
              {event.location ? ` · ${event.location}` : ""}
            </p>
            {event.description ? (
              <p className="mt-4 text-sm leading-6 text-foreground/80">
                {event.description}
              </p>
            ) : null}

            <form onSubmit={onSubmit} className="mt-8 space-y-4">
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-foreground">
                  Full name
                </span>
                <input
                  required
                  value={form.fullName}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, fullName: e.target.value }))
                  }
                  className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-foreground outline-none ring-accent focus:ring-2"
                  placeholder="Your full name"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-foreground">
                  Email
                </span>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, email: e.target.value }))
                  }
                  className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-foreground outline-none ring-accent focus:ring-2"
                  placeholder="you@example.com"
                />
              </label>

              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-foreground">
                  Phone
                </span>
                <input
                  value={form.phone}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, phone: e.target.value }))
                  }
                  className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-foreground outline-none ring-accent focus:ring-2"
                  placeholder="Optional"
                />
              </label>

              <button
                type="submit"
                disabled={submitting}
                data-tooltip={
                  event.kind === "SPORTS_MEET"
                    ? "Join the sports meet roster"
                    : "Submit registration and receive your certificate"
                }
                className="w-full rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-accent-foreground transition hover:opacity-90 disabled:opacity-60"
              >
                {submitting
                  ? "Submitting..."
                  : event.kind === "SPORTS_MEET"
                    ? "Register for sports meet"
                    : "Get certificate access"}
              </button>
            </form>
          </div>
        ) : null}
      </main>
    </div>
  );
}

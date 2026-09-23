"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { AppShell } from "@/components/app-shell";
import { getAccessToken } from "@/lib/auth";
import {
  certificateDownloadUrl,
  listCertificates,
  restoreCertificate,
  revokeCertificate,
  type CertificateItem,
} from "@/lib/certificates";
import {
  getEvent,
  importParticipantsCsv,
  listParticipants,
  registrationPath,
  updateEvent,
  type EventItem,
  type ImportParticipantsResult,
  type ParticipantItem,
} from "@/lib/events";
import {
  listActiveTemplates,
  type CertificateTemplate,
} from "@/lib/templates";

function toLocalInputValue(iso: string) {
  const date = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function EditEventPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [origin, setOrigin] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [event, setEvent] = useState<EventItem | null>(null);
  const [participants, setParticipants] = useState<ParticipantItem[]>([]);
  const [certificates, setCertificates] = useState<CertificateItem[]>([]);
  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] =
    useState<ImportParticipantsResult | null>(null);
  const [templates, setTemplates] = useState<CertificateTemplate[]>([]);
  const [form, setForm] = useState({
    name: "",
    description: "",
    date: "",
    location: "",
    status: "ACTIVE" as "ACTIVE" | "INACTIVE",
    templateId: "",
  });

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      router.replace("/login");
      return;
    }

    getEvent(params.id)
      .then(async (data) => {
        setEvent(data);
        setForm({
          name: data.name,
          description: data.description ?? "",
          date: toLocalInputValue(data.date),
          location: data.location ?? "",
          status: data.status,
          templateId: data.templateId ?? "",
        });
        const [activeTemplates, eventParticipants, eventCertificates] =
          await Promise.all([
            listActiveTemplates(),
            listParticipants(params.id),
            listCertificates(params.id),
          ]);
        setTemplates(activeTemplates);
        setParticipants(eventParticipants);
        setCertificates(eventCertificates);
      })
      .catch(() => {
        toast.error("Event not found");
        router.replace("/events");
      })
      .finally(() => setLoading(false));
  }, [params.id, router]);

  async function onSubmit(submitEvent: FormEvent<HTMLFormElement>) {
    submitEvent.preventDefault();
    setSaving(true);

    try {
      const result = await updateEvent(params.id, {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        date: new Date(form.date).toISOString(),
        location: form.location.trim() || undefined,
        status: form.status,
        templateId: form.templateId || null,
      });
      toast.success(result.message);
      setEvent(result.event);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    } finally {
      setSaving(false);
    }
  }

  async function copyLink() {
    if (!event) return;
    const url = `${window.location.origin}${registrationPath(event.registrationToken)}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Registration link copied");
    } catch {
      toast.error("Could not copy link");
    }
  }

  async function onToggleCertificateStatus(certificate: CertificateItem) {
    setStatusUpdatingId(certificate.id);
    try {
      const result =
        certificate.status === "VALID"
          ? await revokeCertificate(certificate.id)
          : await restoreCertificate(certificate.id);
      toast.success(result.message);
      setCertificates(await listCertificates(params.id));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    } finally {
      setStatusUpdatingId(null);
    }
  }

  async function onCsvSelected(file: File | null) {
    if (!file) return;
    setImporting(true);
    setImportResult(null);

    try {
      const csv = await file.text();
      const result = await importParticipantsCsv(params.id, csv);
      setImportResult(result);
      toast.success(result.message);
      const [eventParticipants, eventCertificates] = await Promise.all([
        listParticipants(params.id),
        listCertificates(params.id),
      ]);
      setParticipants(eventParticipants);
      setCertificates(eventCertificates);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "CSV import failed");
    } finally {
      setImporting(false);
    }
  }

  if (loading) {
    return (
      <div className="page-shell flex flex-1 items-center justify-center px-6">
        <p className="text-muted">Loading event...</p>
      </div>
    );
  }

  return (
    <AppShell
      title="Edit event"
      subtitle="Update event details and share the registration link."
      actions={
        <Link
          href="/events"
          className="inline-flex h-10 items-center rounded-full border border-border bg-surface px-4 text-sm font-medium text-foreground transition hover:bg-surface-muted"
        >
          Back
        </Link>
      }
    >
      <div className="grid gap-6 lg:grid-cols-[1.4fr_0.8fr]">
        <form
          onSubmit={onSubmit}
          className="space-y-4 rounded-2xl border border-border bg-surface p-6 shadow-[var(--shadow)] md:p-8"
        >
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-foreground">
              Event name
            </span>
            <input
              required
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-foreground outline-none ring-accent focus:ring-2"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-foreground">
              Description
            </span>
            <textarea
              value={form.description}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, description: e.target.value }))
              }
              rows={4}
              className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-foreground outline-none ring-accent focus:ring-2"
            />
          </label>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-foreground">
                Date
              </span>
              <input
                type="datetime-local"
                required
                value={form.date}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, date: e.target.value }))
                }
                className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-foreground outline-none ring-accent focus:ring-2"
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-foreground">
                Location
              </span>
              <input
                value={form.location}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, location: e.target.value }))
                }
                className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-foreground outline-none ring-accent focus:ring-2"
              />
            </label>
          </div>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-foreground">
              Certificate template
            </span>
            <select
              value={form.templateId}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, templateId: e.target.value }))
              }
              className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-foreground outline-none ring-accent focus:ring-2"
            >
              <option value="">No template</option>
              {templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name} · {template.templateType}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-foreground">
              Status
            </span>
            <select
              value={form.status}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  status: e.target.value as "ACTIVE" | "INACTIVE",
                }))
              }
              className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-foreground outline-none ring-accent focus:ring-2"
            >
              <option value="ACTIVE">ACTIVE</option>
              <option value="INACTIVE">INACTIVE</option>
            </select>
          </label>

          <button
            type="submit"
            disabled={saving}
            className="rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-accent-foreground transition hover:opacity-90 disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save changes"}
          </button>
        </form>

        <aside className="space-y-4 lg:self-start">
          <div className="rounded-2xl border border-border bg-surface p-6 shadow-[var(--shadow)]">
            <p className="text-sm font-medium text-accent">Registration</p>
            <h2 className="mt-1 text-lg font-semibold text-foreground">
              Participant link
            </h2>
            <p className="mt-3 break-all rounded-xl bg-background px-3 py-3 text-sm text-muted">
              {event
                ? `${origin}${registrationPath(event.registrationToken)}`
                : "—"}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={copyLink}
                className="rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-surface-muted"
              >
                Copy link
              </button>
              {event ? (
                <a
                  href={registrationPath(event.registrationToken)}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90"
                >
                  Open page
                </a>
              ) : null}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-surface p-6 shadow-[var(--shadow)]">
            <p className="text-sm font-medium text-accent">Bulk import</p>
            <h2 className="mt-1 text-lg font-semibold text-foreground">
              CSV participants
            </h2>
            <p className="mt-2 text-sm text-muted">
              Upload a CSV with columns{" "}
              <code className="text-foreground">fullName,email,phone</code>.
              Certificates are issued automatically.
            </p>
            <label className="mt-4 inline-flex cursor-pointer rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-surface-muted">
              {importing ? "Importing..." : "Choose CSV file"}
              <input
                type="file"
                accept=".csv,text/csv"
                disabled={importing}
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0] ?? null;
                  void onCsvSelected(file);
                  e.target.value = "";
                }}
              />
            </label>
            <a
              href={`data:text/csv;charset=utf-8,${encodeURIComponent(
                "fullName,email,phone\nJane Doe,jane@example.com,+91 98765 43210\n",
              )}`}
              download="participants-sample.csv"
              className="ml-2 inline-flex text-sm font-medium text-accent hover:underline"
            >
              Sample CSV
            </a>
            {importResult ? (
              <div className="mt-4 rounded-xl border border-border bg-background px-3 py-3 text-sm">
                <p className="font-medium text-foreground">
                  {importResult.summary.created} created ·{" "}
                  {importResult.summary.skipped} skipped ·{" "}
                  {importResult.summary.failed} failed
                </p>
                <ul className="mt-2 max-h-40 space-y-1 overflow-auto text-xs text-muted">
                  {importResult.results.slice(0, 20).map((row) => (
                    <li key={`${row.row}-${row.email}`}>
                      Row {row.row}: {row.email} — {row.status}
                      {row.certificateNumber
                        ? ` (${row.certificateNumber})`
                        : ""}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>

          <div className="rounded-2xl border border-border bg-surface p-6 shadow-[var(--shadow)]">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-lg font-semibold text-foreground">
                Participants
              </h2>
              <span className="text-sm text-muted">{participants.length}</span>
            </div>
            {participants.length === 0 ? (
              <p className="mt-3 text-sm text-muted">No registrations yet.</p>
            ) : (
              <ul className="mt-4 space-y-3">
                {participants.map((participant) => (
                  <li
                    key={participant.id}
                    className="rounded-xl border border-border bg-background px-3 py-3"
                  >
                    <p className="font-medium text-foreground">
                      {participant.fullName}
                    </p>
                    <p className="text-sm text-muted">{participant.email}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-surface p-6 shadow-[var(--shadow)]">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-lg font-semibold text-foreground">
                Certificates
              </h2>
              <span className="text-sm text-muted">{certificates.length}</span>
            </div>
            {certificates.length === 0 ? (
              <p className="mt-3 text-sm text-muted">No certificates yet.</p>
            ) : (
              <ul className="mt-4 space-y-3">
                {certificates.map((certificate) => (
                  <li
                    key={certificate.id}
                    className="rounded-xl border border-border bg-background px-3 py-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium text-foreground">
                          {certificate.participant.fullName}
                        </p>
                        <p className="text-sm text-muted">
                          {certificate.certificateNumber}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                          certificate.status === "VALID"
                            ? "bg-accent/15 text-accent"
                            : "bg-red-500/15 text-red-600 dark:text-red-400"
                        }`}
                      >
                        {certificate.status}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {certificate.status === "VALID" ? (
                        <a
                          href={certificateDownloadUrl(
                            certificate.certificateNumber,
                          )}
                          className="rounded-full border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-surface-muted"
                        >
                          Download PDF
                        </a>
                      ) : null}
                      <button
                        type="button"
                        disabled={statusUpdatingId === certificate.id}
                        onClick={() => onToggleCertificateStatus(certificate)}
                        className="rounded-full border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-surface-muted disabled:opacity-60"
                      >
                        {statusUpdatingId === certificate.id
                          ? "Updating..."
                          : certificate.status === "VALID"
                            ? "Revoke"
                            : "Restore"}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      </div>
    </AppShell>
  );
}

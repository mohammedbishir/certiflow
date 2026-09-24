"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { AppShell } from "@/components/app-shell";
import { useConfirm } from "@/components/confirm-modal";
import { TablePager, usePagedList } from "@/components/table-pager";
import { getAccessToken } from "@/lib/auth";
import {
  certificateDownloadUrl,
  listCertificates,
  restoreCertificate,
  revokeCertificate,
  type CertificateItem,
} from "@/lib/certificates";
import {
  activateEvent,
  deactivateEvent,
  getEvent,
  importParticipantsCsv,
  listParticipants,
  registrationPath,
  type EventItem,
  type ImportParticipantsResult,
  type ParticipantItem,
} from "@/lib/events";
import { exportRowsToPdf, exportRowsToXlsx } from "@/lib/export-table";
import { previewTemplateCertificate } from "@/lib/templates";

function formatDateTime(value: string) {
  return new Date(value).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatShortDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function EventDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const { confirm, confirmDialog } = useConfirm();
  const [origin, setOrigin] = useState("");
  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState<EventItem | null>(null);
  const [participants, setParticipants] = useState<ParticipantItem[]>([]);
  const [certificates, setCertificates] = useState<CertificateItem[]>([]);
  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null);
  const [togglingStatus, setTogglingStatus] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] =
    useState<ImportParticipantsResult | null>(null);

  const [participantQuery, setParticipantQuery] = useState("");
  const [certQuery, setCertQuery] = useState("");
  const [certStatusFilter, setCertStatusFilter] = useState<
    "ALL" | "VALID" | "REVOKED"
  >("ALL");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState("");
  const [previewingId, setPreviewingId] = useState<string | null>(null);
  const [previewingEvent, setPreviewingEvent] = useState(false);

  const filteredParticipants = useMemo(() => {
    const q = participantQuery.toLowerCase().trim();
    if (!q) return participants;
    return participants.filter((p) =>
      `${p.fullName} ${p.email} ${p.phone ?? ""}`.toLowerCase().includes(q),
    );
  }, [participants, participantQuery]);

  const filteredCertificates = useMemo(() => {
    const q = certQuery.toLowerCase().trim();
    return certificates.filter((c) => {
      if (certStatusFilter !== "ALL" && c.status !== certStatusFilter) {
        return false;
      }
      if (!q) return true;
      return `${c.participant.fullName} ${c.participant.email} ${c.certificateNumber}`
        .toLowerCase()
        .includes(q);
    });
  }, [certificates, certQuery, certStatusFilter]);

  const participantPager = usePagedList(filteredParticipants);
  const certPager = usePagedList(filteredCertificates);

  async function refreshLists() {
    const [eventParticipants, eventCertificates] = await Promise.all([
      listParticipants(params.id),
      listCertificates(params.id),
    ]);
    setParticipants(eventParticipants);
    setCertificates(eventCertificates);
  }

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      router.replace("/login");
      return;
    }

    getEvent(params.id)
      .then(async (data) => {
        setEvent(data);
        await refreshLists();
      })
      .catch(() => {
        toast.error("Event not found");
        router.replace("/events");
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id, router]);

  // Reset to page 1 when filters change
  useEffect(() => {
    participantPager.setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [participantQuery]);

  useEffect(() => {
    certPager.setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [certQuery, certStatusFilter]);

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

  async function onToggleEventStatus() {
    if (!event) return;
    if (event.status !== "ACTIVE" && !event.templateId) {
      toast.error("Select a certificate template before activating this event");
      return;
    }

    const activating = event.status !== "ACTIVE";
    const ok = await confirm({
      title: activating ? "Activate this event?" : "Deactivate this event?",
      message: activating
        ? "Participant registration will open with the assigned certificate template."
        : "Registration will close. Existing certificates stay available.",
      confirmLabel: activating ? "Yes, activate" : "Yes, deactivate",
      cancelLabel: "No",
      tone: activating ? "default" : "danger",
    });
    if (!ok) return;

    setTogglingStatus(true);
    try {
      const result = activating
        ? await activateEvent(event.id)
        : await deactivateEvent(event.id);
      toast.success(result.message);
      setEvent(result.event);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    } finally {
      setTogglingStatus(false);
    }
  }

  async function onToggleCertificateStatus(certificate: CertificateItem) {
    const revoking = certificate.status === "VALID";
    const ok = await confirm({
      title: revoking ? "Revoke this certificate?" : "Restore this certificate?",
      message: revoking
        ? `${certificate.participant.fullName}’s certificate (${certificate.certificateNumber}) will no longer be valid for download or verification.`
        : `${certificate.participant.fullName}’s certificate (${certificate.certificateNumber}) will become valid again.`,
      confirmLabel: revoking ? "Yes, revoke" : "Yes, restore",
      cancelLabel: "No",
      tone: revoking ? "danger" : "default",
    });
    if (!ok) return;

    setStatusUpdatingId(certificate.id);
    try {
      const result = revoking
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

  function closePreview() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setPreviewTitle("");
  }

  async function onPreviewCertificate(certificate: CertificateItem) {
    setPreviewingId(certificate.id);
    try {
      const response = await fetch(
        certificateDownloadUrl(certificate.certificateNumber),
      );
      if (!response.ok) {
        throw new Error("Could not load certificate PDF");
      }
      const blob = await response.blob();
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(URL.createObjectURL(blob));
      setPreviewTitle(
        `${certificate.participant.fullName} · ${certificate.certificateNumber}`,
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Preview failed");
    } finally {
      setPreviewingId(null);
    }
  }

  async function onPreviewEventCertificate() {
    if (!event) return;

    if (!event.templateId) {
      toast.error("Assign a certificate template first");
      return;
    }

    setPreviewingEvent(true);
    try {
      const sampleName =
        participants[0]?.fullName?.trim() || "Recipient Name";
      const blob = await previewTemplateCertificate(event.templateId, {
        sampleName,
        eventName: event.name,
        eventDate: event.date,
        eventLocation: event.location || undefined,
      });
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(URL.createObjectURL(blob));
      setPreviewTitle(
        `${event.template?.name ?? "Template"} · ${event.name}`,
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Preview failed");
    } finally {
      setPreviewingEvent(false);
    }
  }

  async function onCsvSelected(file: File | null) {
    if (!file) return;

    const ok = await confirm({
      title: "Import participants from CSV?",
      message: `Import “${file.name}” and issue certificates for new participants?`,
      confirmLabel: "Yes, import",
      cancelLabel: "No",
    });
    if (!ok) return;

    setImporting(true);
    setImportResult(null);

    try {
      const csv = await file.text();
      const result = await importParticipantsCsv(params.id, csv);
      setImportResult(result);
      toast.success(result.message);
      await refreshLists();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "CSV import failed");
    } finally {
      setImporting(false);
    }
  }

  function exportParticipants(format: "xlsx" | "pdf") {
    if (!event || filteredParticipants.length === 0) {
      toast.info("Nothing to export");
      return;
    }
    const rows = filteredParticipants.map((p, index) => ({
      no: index + 1,
      fullName: p.fullName,
      email: p.email,
      phone: p.phone || "",
      registered: formatShortDate(p.createdAt),
    }));
    const columns = [
      { header: "#", key: "no" },
      { header: "Name", key: "fullName" },
      { header: "Email", key: "email" },
      { header: "Phone", key: "phone" },
      { header: "Registered", key: "registered" },
    ];
    const baseName = `${event.name}-participants`;
    try {
      if (format === "xlsx") {
        exportRowsToXlsx(rows, columns, {
          fileName: baseName,
          sheetName: "Participants",
        });
      } else {
        exportRowsToPdf(rows, columns, {
          fileName: baseName,
          title: `${event.name} — Participants`,
          subtitle: `${rows.length} participant${rows.length === 1 ? "" : "s"} · exported ${new Date().toLocaleDateString()}`,
        });
      }
      toast.success(format === "xlsx" ? "Excel downloaded" : "PDF downloaded");
    } catch {
      toast.error("Export failed");
    }
  }

  function exportCertificates(format: "xlsx" | "pdf") {
    if (!event || filteredCertificates.length === 0) {
      toast.info("Nothing to export");
      return;
    }
    const rows = filteredCertificates.map((c, index) => ({
      no: index + 1,
      fullName: c.participant.fullName,
      email: c.participant.email,
      certificateNumber: c.certificateNumber,
      issued: formatShortDate(c.issuedAt),
      status: c.status,
    }));
    const columns = [
      { header: "#", key: "no" },
      { header: "Participant", key: "fullName" },
      { header: "Email", key: "email" },
      { header: "Certificate #", key: "certificateNumber" },
      { header: "Issued", key: "issued" },
      { header: "Status", key: "status" },
    ];
    const baseName = `${event.name}-certificates`;
    try {
      if (format === "xlsx") {
        exportRowsToXlsx(rows, columns, {
          fileName: baseName,
          sheetName: "Certificates",
        });
      } else {
        exportRowsToPdf(rows, columns, {
          fileName: baseName,
          title: `${event.name} — Certificates`,
          subtitle: `${rows.length} certificate${rows.length === 1 ? "" : "s"} · exported ${new Date().toLocaleDateString()}`,
        });
      }
      toast.success(format === "xlsx" ? "Excel downloaded" : "PDF downloaded");
    } catch {
      toast.error("Export failed");
    }
  }

  if (loading || !event) {
    return (
      <div className="page-shell flex flex-1 items-center justify-center px-6">
        <p className="text-muted">Loading event...</p>
      </div>
    );
  }

  const registrationUrl = `${origin}${registrationPath(event.registrationToken)}`;
  const validCount = certificates.filter((c) => c.status === "VALID").length;
  const revokedCount = certificates.filter((c) => c.status === "REVOKED").length;
  const hasTemplate = Boolean(event.templateId);
  const registrationReady = hasTemplate && event.status === "ACTIVE";

  return (
    <AppShell
      title={event.name}
      subtitle="Event overview, participants, and certificates."
      actions={
        <>
          <Link
            href="/events"
            className="inline-flex h-10 items-center rounded-full border border-border bg-surface px-4 text-sm font-medium text-foreground transition hover:bg-surface-muted"
          >
            All events
          </Link>
          <button
            type="button"
            disabled={previewingEvent || !hasTemplate}
            onClick={() => void onPreviewEventCertificate()}
            className="inline-flex h-10 items-center rounded-full border border-border bg-surface px-4 text-sm font-medium text-foreground transition hover:bg-surface-muted disabled:opacity-60"
          >
            {previewingEvent ? "Loading…" : "Preview certificate"}
          </button>
          <Link
            href={`/events/${event.id}/edit`}
            className="inline-flex h-10 items-center rounded-full bg-accent px-4 text-sm font-medium text-accent-foreground transition hover:opacity-90"
          >
            Edit event
          </Link>
        </>
      }
    >
      <div className="space-y-6">
        {!hasTemplate ? (
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-5 py-4 text-sm text-foreground">
            <p className="font-medium">Select a certificate template</p>
            <p className="mt-1 text-muted">
              Registration stays closed until a template is assigned. Then you
              can activate the event.
            </p>
            <Link
              href={`/events/${event.id}/edit`}
              className="mt-3 inline-flex rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90"
            >
              Choose template
            </Link>
          </div>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-[1.4fr_0.8fr]">
          <section className="rounded-2xl border border-border bg-surface p-6 shadow-[var(--shadow)] md:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                      event.status === "ACTIVE"
                        ? "bg-accent/15 text-accent"
                        : "bg-surface-muted text-muted"
                    }`}
                  >
                    {event.status}
                  </span>
                  {event.template ? (
                    <span className="rounded-full border border-border px-2.5 py-1 text-xs font-medium text-muted">
                      {event.template.name} · {event.template.templateType}
                    </span>
                  ) : (
                    <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-800 dark:text-amber-200">
                      No template
                    </span>
                  )}
                </div>
                <dl className="mt-5 grid gap-4 sm:grid-cols-2">
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-wide text-muted">
                      Date
                    </dt>
                    <dd className="mt-1 text-sm font-medium text-foreground">
                      {formatDateTime(event.date)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-wide text-muted">
                      Location
                    </dt>
                    <dd className="mt-1 text-sm font-medium text-foreground">
                      {event.location || "—"}
                    </dd>
                  </div>
                </dl>
                {event.description ? (
                  <p className="mt-5 max-w-3xl text-sm leading-6 text-foreground/80">
                    {event.description}
                  </p>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={previewingEvent || !hasTemplate}
                  onClick={() => void onPreviewEventCertificate()}
                  className="rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-surface-muted disabled:opacity-60"
                >
                  {previewingEvent ? "Loading…" : "Preview certificate"}
                </button>
                <Link
                  href={`/events/${event.id}/edit`}
                  className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90"
                >
                  Edit event details
                </Link>
                <button
                  type="button"
                  disabled={
                    togglingStatus ||
                    (event.status !== "ACTIVE" && !hasTemplate)
                  }
                  onClick={onToggleEventStatus}
                  className="rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-surface-muted disabled:opacity-60"
                  title={
                    event.status !== "ACTIVE" && !hasTemplate
                      ? "Select a certificate template first"
                      : undefined
                  }
                >
                  {togglingStatus
                    ? "Updating..."
                    : event.status === "ACTIVE"
                      ? "Deactivate"
                      : "Activate"}
                </button>
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-border bg-background px-4 py-4">
                <p className="text-xs font-medium uppercase tracking-wide text-muted">
                  Participants
                </p>
                <p className="mt-2 text-2xl font-semibold text-foreground">
                  {participants.length}
                </p>
              </div>
              <div className="rounded-xl border border-border bg-background px-4 py-4">
                <p className="text-xs font-medium uppercase tracking-wide text-muted">
                  Valid certificates
                </p>
                <p className="mt-2 text-2xl font-semibold text-foreground">
                  {validCount}
                </p>
              </div>
              <div className="rounded-xl border border-border bg-background px-4 py-4">
                <p className="text-xs font-medium uppercase tracking-wide text-muted">
                  Revoked
                </p>
                <p className="mt-2 text-2xl font-semibold text-foreground">
                  {revokedCount}
                </p>
              </div>
            </div>
          </section>

          <aside className="space-y-4">
            <div className="rounded-2xl border border-border bg-surface p-6 shadow-[var(--shadow)]">
              <p className="text-sm font-medium text-accent">Registration</p>
              <h2 className="mt-1 text-lg font-semibold text-foreground">
                Participant link
              </h2>
              {!registrationReady ? (
                <p className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-3 text-sm text-foreground">
                  {!hasTemplate
                    ? "Select a certificate template, then activate the event to open registration."
                    : "Event is inactive — activate it to open registration."}
                </p>
              ) : null}
              <p className="mt-3 break-all rounded-xl bg-background px-3 py-3 text-sm text-muted">
                {registrationUrl || "—"}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={copyLink}
                  disabled={!registrationReady}
                  className="rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-surface-muted disabled:opacity-40"
                >
                  Copy link
                </button>
                <a
                  href={
                    registrationReady
                      ? registrationPath(event.registrationToken)
                      : undefined
                  }
                  target="_blank"
                  rel="noreferrer"
                  aria-disabled={!registrationReady}
                  onClick={(e) => {
                    if (!registrationReady) e.preventDefault();
                  }}
                  className={`rounded-full px-4 py-2 text-sm font-medium ${
                    registrationReady
                      ? "bg-accent text-accent-foreground hover:opacity-90"
                      : "cursor-not-allowed bg-surface-muted text-muted opacity-60"
                  }`}
                >
                  Open page
                </a>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-surface p-6 shadow-[var(--shadow)]">
              <p className="text-sm font-medium text-accent">Bulk import</p>
              <h2 className="mt-1 text-lg font-semibold text-foreground">
                CSV participants
              </h2>
              <p className="mt-2 text-sm text-muted">
                Columns:{" "}
                <code className="text-foreground">fullName,email,phone</code>
              </p>
              {!hasTemplate ? (
                <p className="mt-3 text-sm text-muted">
                  Select a certificate template before importing participants.
                </p>
              ) : null}
              <label
                className={`mt-4 inline-flex rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground ${
                  importing || !hasTemplate
                    ? "cursor-not-allowed opacity-40"
                    : "cursor-pointer hover:bg-surface-muted"
                }`}
              >
                {importing ? "Importing..." : "Choose CSV file"}
                <input
                  type="file"
                  accept=".csv,text/csv"
                  disabled={importing || !hasTemplate}
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
                </div>
              ) : null}
            </div>
          </aside>
        </div>

        <section className="rounded-2xl border border-border bg-surface p-6 shadow-[var(--shadow)]">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="shrink-0">
              <p className="text-sm font-medium text-accent">Participants</p>
              <h2 className="mt-1 text-lg font-semibold text-foreground">
                Registrations
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="search"
                value={participantQuery}
                onChange={(e) => setParticipantQuery(e.target.value)}
                placeholder="Search name, email, phone…"
                className="h-10 min-w-0 flex-1 rounded-xl border border-border bg-background px-3.5 text-sm text-foreground outline-none ring-accent focus:ring-2 sm:w-64 sm:flex-none"
              />
              <button
                type="button"
                disabled={filteredParticipants.length === 0}
                onClick={() => exportParticipants("xlsx")}
                className="inline-flex h-10 shrink-0 items-center rounded-full border border-border px-4 text-sm font-medium text-foreground hover:bg-surface-muted disabled:opacity-40"
              >
                Excel
              </button>
              <button
                type="button"
                disabled={filteredParticipants.length === 0}
                onClick={() => exportParticipants("pdf")}
                className="inline-flex h-10 shrink-0 items-center rounded-full border border-border px-4 text-sm font-medium text-foreground hover:bg-surface-muted disabled:opacity-40"
              >
                PDF
              </button>
            </div>
          </div>

          {participants.length === 0 ? (
            <p className="mt-4 text-sm text-muted">No registrations yet.</p>
          ) : filteredParticipants.length === 0 ? (
            <p className="mt-4 text-sm text-muted">
              No participants match your search.
            </p>
          ) : (
            <>
              <div className="mt-4 overflow-x-auto rounded-xl border border-border">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-surface-muted/70 text-xs uppercase tracking-wide text-muted">
                    <tr>
                      <th className="px-4 py-3 font-medium">#</th>
                      <th className="px-4 py-3 font-medium">Name</th>
                      <th className="px-4 py-3 font-medium">Email</th>
                      <th className="px-4 py-3 font-medium">Phone</th>
                      <th className="px-4 py-3 font-medium">Registered</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {participantPager.pageItems.map((participant, index) => (
                      <tr key={participant.id} className="bg-surface">
                        <td className="px-4 py-3 text-muted">
                          {participantPager.rowOffset + index + 1}
                        </td>
                        <td className="px-4 py-3 font-medium text-foreground">
                          {participant.fullName}
                        </td>
                        <td className="px-4 py-3 text-muted">
                          {participant.email}
                        </td>
                        <td className="px-4 py-3 text-muted">
                          {participant.phone || "—"}
                        </td>
                        <td className="px-4 py-3 text-muted">
                          {formatShortDate(participant.createdAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <TablePager
                from={participantPager.from}
                to={participantPager.to}
                total={participantPager.total}
                page={participantPager.page}
                totalPages={participantPager.totalPages}
                pageSize={participantPager.pageSize}
                pageSizes={participantPager.pageSizes}
                onPageChange={participantPager.setPage}
                onPageSizeChange={participantPager.setPageSize}
              />
            </>
          )}
        </section>

        <section className="rounded-2xl border border-border bg-surface p-6 shadow-[var(--shadow)]">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="shrink-0">
              <p className="text-sm font-medium text-accent">Certificates</p>
              <h2 className="mt-1 text-lg font-semibold text-foreground">
                Issued certificates
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={certStatusFilter}
                onChange={(e) =>
                  setCertStatusFilter(
                    e.target.value as "ALL" | "VALID" | "REVOKED",
                  )
                }
                className="h-10 shrink-0 rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none"
              >
                <option value="ALL">All status</option>
                <option value="VALID">Valid only</option>
                <option value="REVOKED">Revoked only</option>
              </select>
              <input
                type="search"
                value={certQuery}
                onChange={(e) => setCertQuery(e.target.value)}
                placeholder="Search name, email, cert #…"
                className="h-10 min-w-0 flex-1 rounded-xl border border-border bg-background px-3.5 text-sm text-foreground outline-none ring-accent focus:ring-2 sm:w-56 sm:flex-none"
              />
              <button
                type="button"
                disabled={filteredCertificates.length === 0}
                onClick={() => exportCertificates("xlsx")}
                className="inline-flex h-10 shrink-0 items-center rounded-full border border-border px-4 text-sm font-medium text-foreground hover:bg-surface-muted disabled:opacity-40"
              >
                Excel
              </button>
              <button
                type="button"
                disabled={filteredCertificates.length === 0}
                onClick={() => exportCertificates("pdf")}
                className="inline-flex h-10 shrink-0 items-center rounded-full border border-border px-4 text-sm font-medium text-foreground hover:bg-surface-muted disabled:opacity-40"
              >
                PDF
              </button>
            </div>
          </div>

          {certificates.length === 0 ? (
            <p className="mt-4 text-sm text-muted">No certificates yet.</p>
          ) : filteredCertificates.length === 0 ? (
            <p className="mt-4 text-sm text-muted">
              No certificates match your filters.
            </p>
          ) : (
            <>
              <div className="mt-4 overflow-x-auto rounded-xl border border-border">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-surface-muted/70 text-xs uppercase tracking-wide text-muted">
                    <tr>
                      <th className="px-4 py-3 font-medium">#</th>
                      <th className="px-4 py-3 font-medium">Participant</th>
                      <th className="px-4 py-3 font-medium">Certificate #</th>
                      <th className="px-4 py-3 font-medium">Issued</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {certPager.pageItems.map((certificate, index) => (
                      <tr key={certificate.id} className="bg-surface">
                        <td className="px-4 py-3 text-muted">
                          {certPager.rowOffset + index + 1}
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-foreground">
                            {certificate.participant.fullName}
                          </p>
                          <p className="text-xs text-muted">
                            {certificate.participant.email}
                          </p>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-foreground">
                          {certificate.certificateNumber}
                        </td>
                        <td className="px-4 py-3 text-muted">
                          {formatShortDate(certificate.issuedAt)}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                              certificate.status === "VALID"
                                ? "bg-accent/15 text-accent"
                                : "bg-red-500/15 text-red-600 dark:text-red-400"
                            }`}
                          >
                            {certificate.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-2">
                            {certificate.status === "VALID" ? (
                              <>
                                <button
                                  type="button"
                                  disabled={previewingId === certificate.id}
                                  onClick={() =>
                                    onPreviewCertificate(certificate)
                                  }
                                  className="rounded-full border border-border px-3 py-1 text-xs font-medium text-foreground hover:bg-surface-muted disabled:opacity-60"
                                >
                                  {previewingId === certificate.id
                                    ? "…"
                                    : "Preview"}
                                </button>
                                <a
                                  href={certificateDownloadUrl(
                                    certificate.certificateNumber,
                                  )}
                                  className="rounded-full border border-border px-3 py-1 text-xs font-medium text-foreground hover:bg-surface-muted"
                                >
                                  Download
                                </a>
                              </>
                            ) : null}
                            <button
                              type="button"
                              disabled={statusUpdatingId === certificate.id}
                              onClick={() =>
                                onToggleCertificateStatus(certificate)
                              }
                              className="rounded-full border border-border px-3 py-1 text-xs font-medium text-foreground hover:bg-surface-muted disabled:opacity-60"
                            >
                              {statusUpdatingId === certificate.id
                                ? "…"
                                : certificate.status === "VALID"
                                  ? "Revoke"
                                  : "Restore"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <TablePager
                from={certPager.from}
                to={certPager.to}
                total={certPager.total}
                page={certPager.page}
                totalPages={certPager.totalPages}
                pageSize={certPager.pageSize}
                pageSizes={certPager.pageSizes}
                onPageChange={certPager.setPage}
                onPageSizeChange={certPager.setPageSize}
              />
            </>
          )}
        </section>
      </div>

      {previewUrl ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-6"
          onClick={closePreview}
        >
          <div
            className="flex h-[min(720px,100%)] w-[min(960px,100%)] flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-[var(--shadow)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wide text-accent">
                  Certificate preview
                </p>
                <h2 className="truncate text-sm font-semibold text-foreground">
                  {previewTitle}
                </h2>
              </div>
              <button
                type="button"
                onClick={closePreview}
                className="shrink-0 rounded-full border border-border px-4 py-1.5 text-sm font-medium text-foreground hover:bg-surface-muted"
              >
                Close
              </button>
            </div>
            <iframe
              title="Certificate preview"
              src={previewUrl}
              className="min-h-0 flex-1 w-full bg-background"
            />
          </div>
        </div>
      ) : null}
      {confirmDialog}
    </AppShell>
  );
}

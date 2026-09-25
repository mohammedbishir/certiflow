"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { AppShell } from "@/components/app-shell";
import { useConfirm } from "@/components/confirm-modal";
import { InfoTip } from "@/components/tooltip";
import { getAccessToken } from "@/lib/auth";
import {
  activateEvent,
  deactivateEvent,
  deleteEvent,
  listEvents,
  registrationPath,
  type EventItem,
} from "@/lib/events";

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function EventsPage() {
  const router = useRouter();
  const { confirm, confirmDialog } = useConfirm();
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<EventItem[]>([]);

  async function loadEvents() {
    const data = await listEvents();
    setEvents(data);
  }

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      router.replace("/login");
      return;
    }

    loadEvents()
      .catch(() => {
        toast.error("Failed to load events");
        router.replace("/login");
      })
      .finally(() => setLoading(false));
  }, [router]);

  async function onToggleStatus(event: EventItem) {
    const activating = event.status !== "ACTIVE";
    const ok = await confirm({
      title: activating ? "Activate this event?" : "Deactivate this event?",
      message: activating
        ? `“${event.name}” will open for participant registration.`
        : `“${event.name}” registration will be closed.`,
      confirmLabel: activating ? "Yes, activate" : "Yes, deactivate",
      cancelLabel: "No",
      tone: activating ? "default" : "danger",
    });
    if (!ok) return;

    try {
      const result = activating
        ? await activateEvent(event.id)
        : await deactivateEvent(event.id);
      toast.success(result.message);
      await loadEvents();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    }
  }

  async function onDelete(event: EventItem) {
    const ok = await confirm({
      title: "Delete this event?",
      message: `“${event.name}” and its participants/certificates will be permanently removed.`,
      confirmLabel: "Yes, delete",
      cancelLabel: "No",
      tone: "danger",
    });
    if (!ok) return;

    try {
      const result = await deleteEvent(event.id);
      toast.success(result.message);
      await loadEvents();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    }
  }

  async function copyRegistrationLink(token: string) {
    const url = `${window.location.origin}${registrationPath(token)}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Registration link copied");
    } catch {
      toast.error("Could not copy link");
    }
  }

  if (loading) {
    return (
      <div className="page-shell flex flex-1 items-center justify-center px-6">
        <p className="text-muted">Loading events...</p>
      </div>
    );
  }

  return (
    <AppShell
      title="Events"
      subtitle="Workshops and sports meets — registration links and certificates."
      actions={
        <>
          <Link
            href="/dashboard"
            className="inline-flex h-10 items-center rounded-full border border-border bg-surface px-4 text-sm font-medium text-foreground transition hover:bg-surface-muted"
          >
            Dashboard
          </Link>
          <Link
            href="/events/new"
            className="inline-flex h-10 items-center rounded-full bg-accent px-4 text-sm font-medium text-accent-foreground transition hover:opacity-90"
          >
            New event
          </Link>
        </>
      }
    >
      {events.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-surface px-6 py-16 text-center shadow-[var(--shadow)]">
          <p className="text-lg font-semibold text-foreground">No events yet</p>
          <p className="mt-2 text-sm text-muted">
            Create your first workshop or sports meet to start issuing certificates.
          </p>
          <Link
            href="/events/new"
            className="mt-6 inline-flex rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-accent-foreground"
          >
            Create event
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {events.map((event) => (
            <article
              key={event.id}
              className="rounded-2xl border border-border bg-surface p-5 shadow-[var(--shadow)] md:p-6"
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xl font-semibold text-foreground">
                      {event.name}
                    </h2>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                        event.status === "ACTIVE"
                          ? "bg-accent/15 text-accent"
                          : "bg-surface-muted text-muted"
                      }`}
                    >
                      {event.status}
                    </span>
                    <span
                      className="rounded-full bg-surface-muted px-2.5 py-1 text-xs font-medium text-muted"
                    >
                      {event.kind === "SPORTS_MEET" ? "Sports meet" : "Workshop"}
                    </span>
                    <InfoTip text="Manage registration, participants, and certificates for this event" />
                  </div>
                  <p className="mt-2 text-sm text-muted">
                    {formatDate(event.date)}
                    {event.location ? ` · ${event.location}` : ""}
                    {event.template ? ` · ${event.template.name}` : ""}
                    {typeof event._count?.participants === "number"
                      ? ` · ${event._count.participants} participants`
                      : ""}
                  </p>
                  {event.description ? (
                    <p className="mt-3 max-w-2xl text-sm leading-6 text-foreground/80">
                      {event.description}
                    </p>
                  ) : null}
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => copyRegistrationLink(event.registrationToken)}
                    className="rounded-full border border-border px-3.5 py-2 text-sm font-medium text-foreground hover:bg-surface-muted"
                  >
                    Copy link
                  </button>
                  <Link
                    href={`/events/${event.id}`}
                    className="rounded-full border border-border px-3.5 py-2 text-sm font-medium text-foreground hover:bg-surface-muted"
                  >
                    View
                  </Link>
                  <Link
                    href={`/events/${event.id}/edit`}
                    className="rounded-full border border-border px-3.5 py-2 text-sm font-medium text-foreground hover:bg-surface-muted"
                  >
                    Edit
                  </Link>
                  <button
                    type="button"
                    onClick={() => onToggleStatus(event)}
                    className="rounded-full border border-border px-3.5 py-2 text-sm font-medium text-foreground hover:bg-surface-muted"
                  >
                    {event.status === "ACTIVE" ? "Deactivate" : "Activate"}
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(event)}
                    className="rounded-full border border-border px-3.5 py-2 text-sm font-medium text-danger hover:bg-danger-soft"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
      {confirmDialog}
    </AppShell>
  );
}

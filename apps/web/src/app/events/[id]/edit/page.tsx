"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { AppShell } from "@/components/app-shell";
import { useConfirm } from "@/components/confirm-modal";
import { getAccessToken } from "@/lib/auth";
import { getEvent, updateEvent } from "@/lib/events";
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
  const { confirm, confirmDialog } = useConfirm();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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
    const token = getAccessToken();
    if (!token) {
      router.replace("/login");
      return;
    }

    Promise.all([getEvent(params.id), listActiveTemplates()])
      .then(([data, activeTemplates]) => {
        setForm({
          name: data.name,
          description: data.description ?? "",
          date: toLocalInputValue(data.date),
          location: data.location ?? "",
          status: data.status,
          templateId: data.templateId ?? "",
        });
        setTemplates(activeTemplates);
      })
      .catch(() => {
        toast.error("Event not found");
        router.replace("/events");
      })
      .finally(() => setLoading(false));
  }, [params.id, router]);

  async function onSubmit(submitEvent: FormEvent<HTMLFormElement>) {
    submitEvent.preventDefault();

    if (form.status === "ACTIVE" && !form.templateId) {
      toast.error("Select a certificate template before activating");
      return;
    }

    const ok = await confirm({
      title: "Save event changes?",
      message: "Update this event’s details, template, and status?",
      confirmLabel: "Yes, save",
      cancelLabel: "No",
    });
    if (!ok) return;

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
      router.push(`/events/${params.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    } finally {
      setSaving(false);
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
      subtitle="Update name, schedule, template, and status."
      actions={
        <>
          <Link
            href={`/events/${params.id}`}
            className="inline-flex h-10 items-center rounded-full border border-border bg-surface px-4 text-sm font-medium text-foreground transition hover:bg-surface-muted"
          >
            Event details
          </Link>
          <Link
            href="/events"
            className="inline-flex h-10 items-center rounded-full border border-border bg-surface px-4 text-sm font-medium text-foreground transition hover:bg-surface-muted"
          >
            All events
          </Link>
        </>
      }
    >
      <form
        onSubmit={onSubmit}
        className="mx-auto max-w-2xl space-y-4 rounded-2xl border border-border bg-surface p-6 shadow-[var(--shadow)] md:p-8"
      >
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-foreground">
            Event name
          </span>
          <input
            required
            value={form.name}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, name: e.target.value }))
            }
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
            onChange={(e) => {
              const templateId = e.target.value;
              setForm((prev) => ({
                ...prev,
                templateId,
                status:
                  !templateId && prev.status === "ACTIVE"
                    ? "INACTIVE"
                    : prev.status,
              }));
            }}
            className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-foreground outline-none ring-accent focus:ring-2"
          >
            <option value="">Select a template</option>
            {templates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name} · {template.templateType}
              </option>
            ))}
          </select>
          <p className="mt-1.5 text-xs text-muted">
            Required to activate the event and open participant registration.
          </p>
        </label>

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-foreground">
            Status
          </span>
          <select
            value={form.status}
            onChange={(e) => {
              const status = e.target.value as "ACTIVE" | "INACTIVE";
              if (status === "ACTIVE" && !form.templateId) {
                toast.error(
                  "Select a certificate template before activating",
                );
                return;
              }
              setForm((prev) => ({ ...prev, status }));
            }}
            className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-foreground outline-none ring-accent focus:ring-2"
          >
            <option value="INACTIVE">INACTIVE</option>
            <option value="ACTIVE" disabled={!form.templateId}>
              ACTIVE
            </option>
          </select>
          {!form.templateId ? (
            <p className="mt-1.5 text-xs text-muted">
              Choose a certificate template to enable ACTIVE status.
            </p>
          ) : null}
        </label>

        <div className="flex flex-wrap gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-accent-foreground transition hover:opacity-90 disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save changes"}
          </button>
          <Link
            href={`/events/${params.id}`}
            className="rounded-full border border-border px-5 py-2.5 text-sm font-medium text-foreground hover:bg-surface-muted"
          >
            Cancel
          </Link>
        </div>
      </form>
      {confirmDialog}
    </AppShell>
  );
}

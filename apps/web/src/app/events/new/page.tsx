"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { AppShell } from "@/components/app-shell";
import { useConfirm } from "@/components/confirm-modal";
import { InfoTip } from "@/components/tooltip";
import { createEvent } from "@/lib/events";
import {
  listActiveTemplates,
  seedDefaultTemplates,
  type CertificateTemplate,
} from "@/lib/templates";

export default function NewEventPage() {
  const router = useRouter();
  const { confirm, confirmDialog } = useConfirm();
  const [saving, setSaving] = useState(false);
  const [templates, setTemplates] = useState<CertificateTemplate[]>([]);
  const [form, setForm] = useState({
    name: "",
    description: "",
    date: "",
    location: "",
    status: "INACTIVE" as "ACTIVE" | "INACTIVE",
    kind: "WORKSHOP" as "WORKSHOP" | "SPORTS_MEET",
    templateId: "",
  });

  useEffect(() => {
    listActiveTemplates()
      .then(async (data) => {
        if (data.length === 0) {
          const seeded = await seedDefaultTemplates();
          setTemplates(seeded.filter((item) => item.isActive));
          return;
        }
        setTemplates(data);
      })
      .catch(() => {
        // Templates are optional at create time.
      });
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (form.status === "ACTIVE" && !form.templateId) {
      toast.error("Select a certificate template before activating");
      return;
    }

    const ok = await confirm({
      title: "Create this event?",
      message: `Create “${form.name.trim()}”${form.status === "ACTIVE" ? " and open registration" : " as inactive"}?`,
      confirmLabel: "Yes, create",
      cancelLabel: "No",
    });
    if (!ok) return;

    setSaving(true);

    try {
      const result = await createEvent({
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        date: new Date(form.date).toISOString(),
        location: form.location.trim() || undefined,
        status: form.status,
        kind: form.kind,
        templateId: form.templateId || undefined,
      });
      toast.success(result.message);
      router.push(`/events/${result.event.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Create failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell
      title="New event"
      subtitle="Create a workshop (one certificate each) or a school sports meet (games + 1st/2nd/3rd)."
      actions={
        <Link
          href="/events"
          data-tooltip="Back to events list"
          data-tooltip-pos="bottom"
          className="inline-flex h-10 items-center rounded-full border border-border bg-surface px-4 text-sm font-medium text-foreground transition hover:bg-surface-muted"
        >
          Back
        </Link>
      }
    >
      <form
        onSubmit={onSubmit}
        className="max-w-2xl space-y-4 rounded-2xl border border-border bg-surface p-6 shadow-[var(--shadow)] md:p-8"
      >
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-foreground">
            Event type
            <InfoTip text="Sports meet: many games under one event, with 1st / 2nd / 3rd certificates per game" />
          </span>
          <select
            value={form.kind}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                kind: e.target.value as "WORKSHOP" | "SPORTS_MEET",
              }))
            }
            className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-foreground outline-none ring-accent focus:ring-2"
          >
            <option value="WORKSHOP">Workshop / seminar (1 cert per person)</option>
            <option value="SPORTS_MEET">
              Sports meet (games + 1st / 2nd / 3rd per game)
            </option>
          </select>
        </label>

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-foreground">
            Event name
          </span>
          <input
            required
            value={form.name}
            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-foreground outline-none ring-accent focus:ring-2"
            placeholder={
              form.kind === "SPORTS_MEET"
                ? "Annual Sports Meet 2026"
                : "AI & Web Development Workshop"
            }
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
            placeholder="One-day hands-on workshop..."
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
              placeholder="Kochi"
            />
          </label>
        </div>

        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-foreground">
            Certificate template
            <InfoTip text="Required before you can activate registration" />
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
            data-tooltip="Choose the certificate layout for this event"
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
            data-tooltip="Create this event"
            className="rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-accent-foreground transition hover:opacity-90 disabled:opacity-60"
          >
            {saving ? "Creating..." : "Create event"}
          </button>
          <Link
            href="/events"
            data-tooltip="Cancel and return to events"
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

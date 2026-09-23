"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { AppShell } from "@/components/app-shell";
import { createEvent } from "@/lib/events";
import {
  listActiveTemplates,
  seedDefaultTemplates,
  type CertificateTemplate,
} from "@/lib/templates";

export default function NewEventPage() {
  const router = useRouter();
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
    setSaving(true);

    try {
      const result = await createEvent({
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        date: new Date(form.date).toISOString(),
        location: form.location.trim() || undefined,
        status: form.status,
        templateId: form.templateId || undefined,
      });
      toast.success(result.message);
      router.push("/events");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Create failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell
      title="New event"
      subtitle="Create a workshop or seminar and generate a registration link."
      actions={
        <Link
          href="/events"
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
            Event name
          </span>
          <input
            required
            value={form.name}
            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-foreground outline-none ring-accent focus:ring-2"
            placeholder="AI & Web Development Workshop"
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
          </span>
          <select
            value={form.templateId}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, templateId: e.target.value }))
            }
            className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-foreground outline-none ring-accent focus:ring-2"
          >
            <option value="">Select template (optional)</option>
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

        <div className="flex flex-wrap gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-accent-foreground transition hover:opacity-90 disabled:opacity-60"
          >
            {saving ? "Creating..." : "Create event"}
          </button>
          <Link
            href="/events"
            className="rounded-full border border-border px-5 py-2.5 text-sm font-medium text-foreground hover:bg-surface-muted"
          >
            Cancel
          </Link>
        </div>
      </form>
    </AppShell>
  );
}

"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { AppShell } from "@/components/app-shell";
import { createTemplate, type TemplateType } from "@/lib/templates";

export default function NewTemplatePage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    templateType: "PARTICIPATION" as TemplateType,
    backgroundUrl: "",
    titleText: "Certificate of Participation",
    subtitleText: "This is to certify that",
    bodyText: "has successfully participated in",
    isActive: true,
  });

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);

    try {
      const result = await createTemplate({
        name: form.name.trim(),
        templateType: form.templateType,
        backgroundUrl: form.backgroundUrl.trim() || undefined,
        titleText: form.titleText.trim(),
        subtitleText: form.subtitleText.trim(),
        bodyText: form.bodyText.trim(),
        isActive: form.isActive,
      });
      toast.success(result.message);
      router.push("/templates");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Create failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell
      title="New template"
      subtitle="Configure certificate text and style."
      actions={
        <Link
          href="/templates"
          className="inline-flex h-10 items-center rounded-full border border-border bg-surface px-4 text-sm font-medium text-foreground transition hover:bg-surface-muted"
        >
          Back
        </Link>
      }
    >
      <div className="grid gap-6 lg:grid-cols-[1.3fr_0.9fr]">
        <form
          onSubmit={onSubmit}
          className="space-y-4 rounded-2xl border border-border bg-surface p-6 shadow-[var(--shadow)] md:p-8"
        >
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-foreground">Name</span>
            <input
              required
              value={form.name}
              onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
              className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-foreground outline-none ring-accent focus:ring-2"
              placeholder="Workshop Participation"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-foreground">Type</span>
            <select
              value={form.templateType}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  templateType: e.target.value as TemplateType,
                }))
              }
              className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-foreground outline-none ring-accent focus:ring-2"
            >
              <option value="PARTICIPATION">PARTICIPATION</option>
              <option value="COMPLETION">COMPLETION</option>
              <option value="ACHIEVEMENT">ACHIEVEMENT</option>
            </select>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-foreground">Title text</span>
            <input
              required
              value={form.titleText}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, titleText: e.target.value }))
              }
              className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-foreground outline-none ring-accent focus:ring-2"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-foreground">Subtitle</span>
            <input
              value={form.subtitleText}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, subtitleText: e.target.value }))
              }
              className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-foreground outline-none ring-accent focus:ring-2"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-foreground">Body text</span>
            <input
              value={form.bodyText}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, bodyText: e.target.value }))
              }
              className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-foreground outline-none ring-accent focus:ring-2"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-foreground">
              Background URL
            </span>
            <input
              type="url"
              value={form.backgroundUrl}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, backgroundUrl: e.target.value }))
              }
              className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-foreground outline-none ring-accent focus:ring-2"
              placeholder="https://cdn.example.com/certificate-bg.png"
            />
          </label>

          <label className="flex items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, isActive: e.target.checked }))
              }
            />
            Active template
          </label>

          <button
            type="submit"
            disabled={saving}
            className="rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-accent-foreground disabled:opacity-60"
          >
            {saving ? "Creating..." : "Create template"}
          </button>
        </form>

        <aside className="rounded-2xl border border-border bg-surface p-6 shadow-[var(--shadow)] lg:self-start">
          <p className="text-sm font-medium text-accent">Preview</p>
          <div className="mt-4 rounded-xl border border-dashed border-border bg-background px-4 py-8 text-center">
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted">
              {form.templateType}
            </p>
            <p className="mt-3 text-lg font-semibold text-foreground">
              {form.titleText || "Title"}
            </p>
            <p className="mt-2 text-sm text-muted">{form.subtitleText}</p>
            <p className="mt-5 text-base font-medium text-foreground">
              Participant Name
            </p>
            <p className="mt-2 text-sm text-muted">{form.bodyText}</p>
            <p className="mt-2 text-base font-medium text-foreground">Event Name</p>
          </div>
        </aside>
      </div>
    </AppShell>
  );
}

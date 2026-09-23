"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { AppShell } from "@/components/app-shell";
import { getAccessToken } from "@/lib/auth";
import {
  getTemplate,
  updateTemplate,
  type TemplateType,
} from "@/lib/templates";

export default function EditTemplatePage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    templateType: "PARTICIPATION" as TemplateType,
    backgroundUrl: "",
    titleText: "",
    subtitleText: "",
    bodyText: "",
    isActive: true,
  });

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      router.replace("/login");
      return;
    }

    getTemplate(params.id)
      .then((template) => {
        setForm({
          name: template.name,
          templateType: template.templateType,
          backgroundUrl: template.backgroundUrl ?? "",
          titleText: template.titleText,
          subtitleText: template.subtitleText ?? "",
          bodyText: template.bodyText ?? "",
          isActive: template.isActive,
        });
      })
      .catch(() => {
        toast.error("Template not found");
        router.replace("/templates");
      })
      .finally(() => setLoading(false));
  }, [params.id, router]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);

    try {
      const result = await updateTemplate(params.id, {
        name: form.name.trim(),
        templateType: form.templateType,
        backgroundUrl: form.backgroundUrl.trim() || undefined,
        titleText: form.titleText.trim(),
        subtitleText: form.subtitleText.trim(),
        bodyText: form.bodyText.trim(),
        isActive: form.isActive,
      });
      toast.success(result.message);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="page-shell flex flex-1 items-center justify-center px-6">
        <p className="text-muted">Loading template...</p>
      </div>
    );
  }

  return (
    <AppShell
      title="Edit template"
      subtitle="Update certificate wording and style."
      actions={
        <Link
          href="/templates"
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
          <span className="mb-1.5 block text-sm font-medium text-foreground">Name</span>
          <input
            required
            value={form.name}
            onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
            className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-foreground outline-none ring-accent focus:ring-2"
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
          {saving ? "Saving..." : "Save template"}
        </button>
      </form>
    </AppShell>
  );
}

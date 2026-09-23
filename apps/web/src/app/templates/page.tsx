"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { AppShell } from "@/components/app-shell";
import { getAccessToken } from "@/lib/auth";
import {
  deleteTemplate,
  listTemplates,
  seedDefaultTemplates,
  type CertificateTemplate,
} from "@/lib/templates";

export default function TemplatesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState<CertificateTemplate[]>([]);

  async function loadTemplates() {
    const data = await listTemplates();
    setTemplates(data);
  }

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      router.replace("/login");
      return;
    }

    loadTemplates()
      .catch(() => {
        toast.error("Failed to load templates");
        router.replace("/login");
      })
      .finally(() => setLoading(false));
  }, [router]);

  async function onSeedDefaults() {
    try {
      const data = await seedDefaultTemplates();
      setTemplates(data);
      toast.success("Default templates ready");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Seed failed");
    }
  }

  async function onDelete(template: CertificateTemplate) {
    const confirmed = window.confirm(`Delete template "${template.name}"?`);
    if (!confirmed) return;

    try {
      const result = await deleteTemplate(template.id);
      toast.success(result.message);
      await loadTemplates();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    }
  }

  if (loading) {
    return (
      <div className="page-shell flex flex-1 items-center justify-center px-6">
        <p className="text-muted">Loading templates...</p>
      </div>
    );
  }

  return (
    <AppShell
      title="Templates"
      subtitle="Choose certificate layouts for your events."
      actions={
        <>
          <Link
            href="/events"
            className="inline-flex h-10 items-center rounded-full border border-border bg-surface px-4 text-sm font-medium text-foreground transition hover:bg-surface-muted"
          >
            Events
          </Link>
          <button
            type="button"
            onClick={onSeedDefaults}
            className="inline-flex h-10 items-center rounded-full border border-border bg-surface px-4 text-sm font-medium text-foreground transition hover:bg-surface-muted"
          >
            Add defaults
          </button>
          <Link
            href="/templates/new"
            className="inline-flex h-10 items-center rounded-full bg-accent px-4 text-sm font-medium text-accent-foreground transition hover:opacity-90"
          >
            New template
          </Link>
        </>
      }
    >
      {templates.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-surface px-6 py-16 text-center shadow-[var(--shadow)]">
          <p className="text-lg font-semibold text-foreground">No templates yet</p>
          <p className="mt-2 text-sm text-muted">
            Add the 3 default certificate styles, or create your own.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={onSeedDefaults}
              className="rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-accent-foreground"
            >
              Add default templates
            </button>
            <Link
              href="/templates/new"
              className="rounded-full border border-border px-5 py-2.5 text-sm font-medium text-foreground"
            >
              Create custom
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {templates.map((template) => (
            <article
              key={template.id}
              className="flex flex-col rounded-2xl border border-border bg-surface p-5 shadow-[var(--shadow)]"
            >
              <div className="mb-4 rounded-xl border border-dashed border-border bg-background px-4 py-6 text-center">
                <p className="text-[10px] uppercase tracking-[0.18em] text-muted">
                  {template.templateType}
                </p>
                <p className="mt-3 text-base font-semibold text-foreground">
                  {template.titleText}
                </p>
                <p className="mt-2 text-xs text-muted">{template.subtitleText}</p>
                <p className="mt-4 text-sm font-medium text-foreground">
                  Participant Name
                </p>
                <p className="mt-2 text-xs text-muted">{template.bodyText}</p>
                <p className="mt-2 text-sm font-medium text-foreground">
                  Event Name
                </p>
              </div>

              <div className="mt-auto">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="font-semibold text-foreground">{template.name}</h2>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                      template.isActive
                        ? "bg-accent/15 text-accent"
                        : "bg-surface-muted text-muted"
                    }`}
                  >
                    {template.isActive ? "Active" : "Inactive"}
                  </span>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Link
                    href={`/templates/${template.id}`}
                    className="rounded-full border border-border px-3.5 py-2 text-sm font-medium text-foreground hover:bg-surface-muted"
                  >
                    Edit
                  </Link>
                  <button
                    type="button"
                    onClick={() => onDelete(template)}
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
    </AppShell>
  );
}

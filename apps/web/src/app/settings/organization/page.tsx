"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { AppShell } from "@/components/app-shell";
import { getAccessToken } from "@/lib/auth";
import {
  getOrganization,
  updateOrganization,
  type Organization,
} from "@/lib/organizations";

type FormState = {
  name: string;
  email: string;
  phone: string;
  logo: string;
  website: string;
  signatoryName: string;
  signatoryDesignation: string;
  signatureUrl: string;
};

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-foreground">
        {label}
      </span>
      {children}
      {hint ? <span className="mt-1.5 block text-xs text-muted">{hint}</span> : null}
    </label>
  );
}

function inputClassName() {
  return "w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-foreground outline-none transition placeholder:text-muted/70 ring-accent focus:border-accent focus:ring-2";
}

export default function OrganizationSettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FormState>({
    name: "",
    email: "",
    phone: "",
    logo: "",
    website: "",
    signatoryName: "",
    signatoryDesignation: "",
    signatureUrl: "",
  });

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      router.replace("/login");
      return;
    }

    getOrganization()
      .then((org: Organization) => {
        setForm({
          name: org.name ?? "",
          email: org.email ?? "",
          phone: org.phone ?? "",
          logo: org.logo ?? "",
          website: org.website ?? "",
          signatoryName: org.signatoryName ?? "",
          signatoryDesignation: org.signatoryDesignation ?? "",
          signatureUrl: org.signatureUrl ?? "",
        });
      })
      .catch(() => {
        toast.error("Failed to load organization");
        router.replace("/login");
      })
      .finally(() => setLoading(false));
  }, [router]);

  function updateField(key: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);

    try {
      const result = await updateOrganization({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || undefined,
        logo: form.logo.trim() || undefined,
        website: form.website.trim() || undefined,
        signatoryName: form.signatoryName.trim() || undefined,
        signatoryDesignation: form.signatoryDesignation.trim() || undefined,
        signatureUrl: form.signatureUrl.trim() || undefined,
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
        <p className="text-muted">Loading organization...</p>
      </div>
    );
  }

  return (
    <AppShell
      title="Organization"
      subtitle="These details appear on certificates."
      actions={
        <Link
          href="/dashboard"
          className="inline-flex h-10 items-center rounded-full border border-border bg-surface px-4 text-sm font-medium text-foreground transition hover:bg-surface-muted"
        >
          Dashboard
        </Link>
      }
    >
      <form onSubmit={onSubmit} className="grid gap-6 lg:grid-cols-[1.5fr_0.9fr]">
        <div className="space-y-6">
          <section className="rounded-2xl border border-border bg-surface p-6 shadow-[var(--shadow)] md:p-7">
            <div className="mb-5 border-b border-border pb-4">
              <p className="text-sm font-medium text-accent">Company profile</p>
              <h2 className="mt-1 text-xl font-semibold text-foreground">
                Basic details
              </h2>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Organization name">
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={(e) => updateField("name", e.target.value)}
                  className={inputClassName()}
                  placeholder="ABC Technologies"
                />
              </Field>

              <Field label="Organization email">
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => updateField("email", e.target.value)}
                  className={inputClassName()}
                  placeholder="admin@company.com"
                />
              </Field>

              <Field label="Phone" hint="Optional contact number">
                <input
                  type="text"
                  value={form.phone}
                  onChange={(e) => updateField("phone", e.target.value)}
                  className={inputClassName()}
                  placeholder="9876543210"
                />
              </Field>

              <Field label="Website" hint="Optional public website">
                <input
                  type="url"
                  value={form.website}
                  onChange={(e) => updateField("website", e.target.value)}
                  className={inputClassName()}
                  placeholder="https://company.com"
                />
              </Field>
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-surface p-6 shadow-[var(--shadow)] md:p-7">
            <div className="mb-5 border-b border-border pb-4">
              <p className="text-sm font-medium text-accent">Branding</p>
              <h2 className="mt-1 text-xl font-semibold text-foreground">
                Logo & visuals
              </h2>
            </div>

            <div className="grid gap-4">
              <Field
                label="Logo URL"
                hint="Paste an image URL for now. File upload comes later."
              >
                <input
                  type="url"
                  value={form.logo}
                  onChange={(e) => updateField("logo", e.target.value)}
                  className={inputClassName()}
                  placeholder="https://cdn.example.com/logo.png"
                />
              </Field>

              <Field
                label="Signature image URL"
                hint="Used as the signatory mark on certificates."
              >
                <input
                  type="url"
                  value={form.signatureUrl}
                  onChange={(e) => updateField("signatureUrl", e.target.value)}
                  className={inputClassName()}
                  placeholder="https://cdn.example.com/signature.png"
                />
              </Field>
            </div>
          </section>

          <section className="rounded-2xl border border-border bg-surface p-6 shadow-[var(--shadow)] md:p-7">
            <div className="mb-5 border-b border-border pb-4">
              <p className="text-sm font-medium text-accent">Certificate signer</p>
              <h2 className="mt-1 text-xl font-semibold text-foreground">
                Signatory details
              </h2>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Signatory name">
                <input
                  type="text"
                  value={form.signatoryName}
                  onChange={(e) => updateField("signatoryName", e.target.value)}
                  className={inputClassName()}
                  placeholder="Mohammed Bishir"
                />
              </Field>

              <Field label="Designation">
                <input
                  type="text"
                  value={form.signatoryDesignation}
                  onChange={(e) =>
                    updateField("signatoryDesignation", e.target.value)
                  }
                  className={inputClassName()}
                  placeholder="Director"
                />
              </Field>
            </div>
          </section>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={saving}
              className="rounded-full bg-accent px-6 py-2.5 text-sm font-medium text-accent-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save organization"}
            </button>
            <Link
              href="/dashboard"
              className="rounded-full border border-border bg-surface px-5 py-2.5 text-sm font-medium text-foreground transition hover:bg-surface-muted"
            >
              Cancel
            </Link>
          </div>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-[var(--shadow)]">
            <div className="border-b border-border bg-surface-muted/70 px-5 py-4">
              <p className="text-sm font-medium text-muted">Live preview</p>
              <h3 className="mt-1 text-lg font-semibold text-foreground">
                Certificate header
              </h3>
            </div>

            <div className="space-y-5 p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-xl border border-border bg-background">
                  {form.logo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={form.logo}
                      alt="Organization logo preview"
                      className="h-full w-full object-contain p-1.5"
                    />
                  ) : (
                    <span className="text-xs font-medium text-muted">Logo</span>
                  )}
                </div>
                <div>
                  <p className="text-base font-semibold text-foreground">
                    {form.name || "Organization name"}
                  </p>
                  <p className="text-sm text-muted">
                    {form.website || "website.com"}
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-dashed border-border bg-background px-4 py-5 text-center">
                <p className="text-xs uppercase tracking-[0.16em] text-muted">
                  Certificate of participation
                </p>
                <p className="mt-3 text-sm text-muted">Presented by</p>
                <p className="mt-1 text-lg font-semibold text-foreground">
                  {form.name || "Your organization"}
                </p>
              </div>

              <div className="flex items-end justify-between gap-3 border-t border-border pt-4">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {form.signatoryName || "Signatory name"}
                  </p>
                  <p className="text-xs text-muted">
                    {form.signatoryDesignation || "Designation"}
                  </p>
                </div>
                <div className="flex h-12 w-24 items-center justify-center overflow-hidden rounded-lg border border-border bg-background">
                  {form.signatureUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={form.signatureUrl}
                      alt="Signature preview"
                      className="h-full w-full object-contain p-1"
                    />
                  ) : (
                    <span className="text-[10px] text-muted">Signature</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-surface-muted/50 p-5">
            <p className="text-sm font-medium text-foreground">Tip</p>
            <p className="mt-2 text-sm leading-6 text-muted">
              Keep logo and signature images on a public URL so certificates can
              load them when generating PDFs.
            </p>
          </div>
        </aside>
      </form>
    </AppShell>
  );
}

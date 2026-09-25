"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { AppShell } from "@/components/app-shell";
import { useConfirm } from "@/components/confirm-modal";
import { TemplateCanvasEditor } from "@/components/template-canvas-editor";
import { getAccessToken } from "@/lib/auth";
import {
  clearTemplateBackground,
  clearTemplatePdf,
  getTemplate,
  previewTemplateCertificate,
  templateAssetUrl,
  updateTemplate,
  uploadTemplateBackground,
  uploadTemplatePdf,
  type TemplateType,
} from "@/lib/templates";

export default function EditTemplatePage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const { confirm, confirmDialog } = useConfirm();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [sampleName, setSampleName] = useState("Recipient Name");
  const [form, setForm] = useState({
    name: "",
    templateType: "PARTICIPATION" as TemplateType,
    backgroundUrl: "",
    templatePdfUrl: "",
    titleText: "",
    subtitleText: "",
    bodyText: "",
    nameXPercent: 50,
    nameYPercent: 42,
    nameFontSize: 36,
    nameColor: "#1d4ed8",
    isActive: true,
  });

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

    getTemplate(params.id)
      .then((template) => {
        setForm({
          name: template.name,
          templateType: template.templateType,
          backgroundUrl: template.backgroundUrl ?? "",
          templatePdfUrl: template.templatePdfUrl ?? "",
          titleText: template.titleText,
          subtitleText: template.subtitleText ?? "",
          bodyText: template.bodyText ?? "",
          nameXPercent: template.nameXPercent ?? 50,
          nameYPercent: template.nameYPercent ?? 42,
          nameFontSize: template.nameFontSize ?? 36,
          nameColor: template.nameColor ?? "#1d4ed8",
          isActive: template.isActive,
        });
      })
      .catch(() => {
        toast.error("Template not found");
        router.replace("/templates");
      })
      .finally(() => setLoading(false));
  }, [params.id, router]);

  async function saveTemplateSettings() {
    return updateTemplate(params.id, {
      name: form.name.trim(),
      templateType: form.templateType,
      titleText: form.titleText.trim(),
      subtitleText: form.subtitleText.trim(),
      bodyText: form.bodyText.trim(),
      nameXPercent: Number(form.nameXPercent),
      nameYPercent: Number(form.nameYPercent),
      nameFontSize: Number(form.nameFontSize),
      nameColor: form.nameColor,
      isActive: form.isActive,
    });
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const ok = await confirm({
      title: "Save template settings?",
      message: "Update this template’s name, type, and placement settings?",
      confirmLabel: "Yes, save",
      cancelLabel: "No",
    });
    if (!ok) return;

    setSaving(true);
    try {
      const result = await saveTemplateSettings();
      toast.success(result.message);
      setForm((prev) => ({
        ...prev,
        backgroundUrl: result.template.backgroundUrl ?? "",
        templatePdfUrl: result.template.templatePdfUrl ?? "",
      }));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    } finally {
      setSaving(false);
    }
  }

  async function onBackgroundSelected(file: File | null) {
    if (!file) return;
    setUploading(true);
    try {
      const result = await uploadTemplateBackground(params.id, file);
      toast.success(result.message);
      setForm((prev) => ({
        ...prev,
        backgroundUrl: result.template.backgroundUrl ?? "",
      }));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function onClearBackground() {
    const ok = await confirm({
      title: "Remove background image?",
      message: "This template’s background image will be removed.",
      confirmLabel: "Yes, remove",
      cancelLabel: "No",
      tone: "danger",
    });
    if (!ok) return;

    setUploading(true);
    try {
      const result = await clearTemplateBackground(params.id);
      toast.success(result.message);
      setForm((prev) => ({ ...prev, backgroundUrl: "" }));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Remove failed");
    } finally {
      setUploading(false);
    }
  }

  async function onPdfSelected(file: File | null) {
    if (!file) return;
    setUploading(true);
    try {
      const result = await uploadTemplatePdf(params.id, file);
      toast.success(result.message);
      setForm((prev) => ({
        ...prev,
        templatePdfUrl: result.template.templatePdfUrl ?? "",
        // Reset to center-ish for new designs
        nameXPercent: 50,
        nameYPercent: 42,
      }));
      setPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "PDF upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function onClearPdf() {
    const ok = await confirm({
      title: "Remove designer PDF?",
      message: "This template’s uploaded PDF background will be removed.",
      confirmLabel: "Yes, remove",
      cancelLabel: "No",
      tone: "danger",
    });
    if (!ok) return;

    setUploading(true);
    try {
      const result = await clearTemplatePdf(params.id);
      toast.success(result.message);
      setForm((prev) => ({ ...prev, templatePdfUrl: "" }));
      setPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Remove failed");
    } finally {
      setUploading(false);
    }
  }

  async function onPreview() {
    setPreviewing(true);
    try {
      await saveTemplateSettings();
      const blob = await previewTemplateCertificate(params.id, {
        sampleName: sampleName.trim() || "Recipient Name",
        nameXPercent: Number(form.nameXPercent),
        nameYPercent: Number(form.nameYPercent),
        nameFontSize: Number(form.nameFontSize),
        nameColor: form.nameColor,
      });
      const url = URL.createObjectURL(blob);
      setPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return url;
      });
      toast.success("Preview ready");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Preview failed");
    } finally {
      setPreviewing(false);
    }
  }

  if (loading) {
    return (
      <div className="page-shell flex flex-1 items-center justify-center px-6">
        <p className="text-muted">Loading template...</p>
      </div>
    );
  }

  const backgroundPreviewUrl = templateAssetUrl(form.backgroundUrl || null);
  const pdfUrl = templateAssetUrl(form.templatePdfUrl || null);

  return (
    <AppShell
      title="Certificate designer"
      subtitle="Upload your designed PDF, drag the name into place, then preview."
      actions={
        <Link
          href="/templates"
          className="inline-flex h-10 items-center rounded-full border border-border bg-surface px-4 text-sm font-medium text-foreground transition hover:bg-surface-muted"
        >
          Back
        </Link>
      }
    >
      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.4fr]">
        <form
          onSubmit={onSubmit}
          className="space-y-4 rounded-2xl border border-border bg-surface p-6 shadow-[var(--shadow)]"
        >
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-foreground">
              Template name
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
              Type
            </span>
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

          <div className="rounded-xl border border-accent/30 bg-accent/5 p-4">
            <p className="text-sm font-medium text-foreground">
              1. Upload designer PDF
            </p>
            <p className="mt-1 text-xs text-muted">
              Best result: leave the name area blank in your design export. If
              “Recipient” is printed, CertiFlow covers it with a white patch.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <label
                className="inline-flex cursor-pointer rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90"
              >
                {uploading ? "Uploading..." : "Upload PDF"}
                <input
                  type="file"
                  accept="application/pdf,.pdf"
                  disabled={uploading}
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0] ?? null;
                    void onPdfSelected(file);
                    e.target.value = "";
                  }}
                />
              </label>
              {form.templatePdfUrl ? (
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => void onClearPdf()}
                  className="rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-surface-muted disabled:opacity-60"
                >
                  Remove PDF
                </button>
              ) : null}
              {pdfUrl ? (
                <a
                  href={pdfUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center text-sm font-medium text-accent hover:underline"
                >
                  Open PDF
                </a>
              ) : null}
            </div>
          </div>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-foreground">
              Title text (fallback mode)
            </span>
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
            <span className="mb-1.5 block text-sm font-medium text-foreground">
              Subtitle
            </span>
            <input
              value={form.subtitleText}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, subtitleText: e.target.value }))
              }
              className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-foreground outline-none ring-accent focus:ring-2"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-foreground">
              Body text
            </span>
            <input
              value={form.bodyText}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, bodyText: e.target.value }))
              }
              className="w-full rounded-xl border border-border bg-background px-3.5 py-2.5 text-foreground outline-none ring-accent focus:ring-2"
            />
          </label>

          <div className="rounded-xl border border-border bg-background p-4">
            <p className="text-sm font-medium text-foreground">
              Fallback background image
            </p>
            <p className="mt-1 text-xs text-muted">
              Only used when no designer PDF is uploaded.
            </p>
            {backgroundPreviewUrl ? (
              <img
                src={backgroundPreviewUrl}
                alt="Template background preview"
                className="mt-3 max-h-36 w-full rounded-lg object-cover"
              />
            ) : null}
            <div className="mt-3 flex flex-wrap gap-2">
              <label className="inline-flex cursor-pointer rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-surface-muted">
                {uploading ? "Uploading..." : "Upload image"}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  disabled={uploading}
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0] ?? null;
                    void onBackgroundSelected(file);
                    e.target.value = "";
                  }}
                />
              </label>
              {form.backgroundUrl ? (
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => void onClearBackground()}
                  className="rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-surface-muted disabled:opacity-60"
                >
                  Remove
                </button>
              ) : null}
            </div>
          </div>

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

        <section className="space-y-4">
          <div className="rounded-2xl border border-border bg-surface p-5 shadow-[var(--shadow)]">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-accent">
                  2. Place the name
                </p>
                <h2 className="text-lg font-semibold text-foreground">
                  Visual editor
                </h2>
              </div>
              <button
                type="button"
                disabled={previewing || !form.templatePdfUrl}
                onClick={() => void onPreview()}
                className="rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90 disabled:opacity-60"
              >
                {previewing ? "Generating..." : "3. Preview certificate"}
              </button>
            </div>

            <TemplateCanvasEditor
              pdfUrl={pdfUrl}
              sampleName={sampleName}
              nameXPercent={form.nameXPercent}
              nameYPercent={form.nameYPercent}
              nameFontSize={form.nameFontSize}
              nameColor={form.nameColor}
              onSampleNameChange={setSampleName}
              onFontSizeChange={(size) =>
                setForm((prev) => ({ ...prev, nameFontSize: size }))
              }
              onColorChange={(color) =>
                setForm((prev) => ({ ...prev, nameColor: color }))
              }
              onChange={({ nameXPercent, nameYPercent }) =>
                setForm((prev) => ({ ...prev, nameXPercent, nameYPercent }))
              }
            />
          </div>

          <div className="rounded-2xl border border-border bg-surface p-5 shadow-[var(--shadow)]">
            <p className="text-sm font-medium text-accent">Final preview</p>
            <h2 className="mt-1 text-lg font-semibold text-foreground">
              Generated certificate PDF
            </h2>
            {previewUrl ? (
              <iframe
                title="Certificate preview"
                src={previewUrl}
                className="mt-4 h-[520px] w-full rounded-xl border border-border bg-white"
              />
            ) : (
              <p className="mt-3 text-sm text-muted">
                Drag the name on the canvas, then click{" "}
                <strong>Preview certificate</strong> to see the exact output
                PDF here.
              </p>
            )}
          </div>
        </section>
      </div>
      {confirmDialog}
    </AppShell>
  );
}

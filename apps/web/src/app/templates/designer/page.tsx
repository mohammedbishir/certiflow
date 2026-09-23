"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "react-toastify";
import { CertificateDesigner } from "@/components/certificate-designer";
import { getAccessToken } from "@/lib/auth";
import {
  createElegantStarterDesign,
  type CertificateDesign,
} from "@/lib/certificate-design";
import {
  createTemplate,
  getTemplate,
  previewTemplateCertificate,
  updateTemplate,
  type TemplateType,
} from "@/lib/templates";

function DesignerInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("id");

  const [ready, setReady] = useState(false);
  const [templateId, setTemplateId] = useState<string | null>(editId);
  const [name, setName] = useState("White and Gold Elegant Certificate");
  const [templateType] = useState<TemplateType>("COMPLETION");
  const [design, setDesign] = useState<CertificateDesign>(() =>
    createElegantStarterDesign(),
  );
  const [saving, setSaving] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      router.replace("/login");
      return;
    }

    if (!editId) {
      setReady(true);
      return;
    }

    getTemplate(editId)
      .then((tpl) => {
        setTemplateId(tpl.id);
        setName(tpl.name);
        if (tpl.designJson && typeof tpl.designJson === "object") {
          setDesign(tpl.designJson as CertificateDesign);
        } else {
          setDesign(
            createElegantStarterDesign(
              tpl.titleText || "CERTIFICATE",
              tpl.subtitleText || "OF COMPLETION",
            ),
          );
        }
      })
      .catch(() => {
        toast.error("Failed to load template");
        router.replace("/templates");
      })
      .finally(() => setReady(true));
  }, [editId, router]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function buildPayload() {
    const titleEl = design.elements.find((e) => e.id === "title");
    const subtitleEl = design.elements.find((e) => e.id === "subtitle");
    const bodyEl = design.elements.find((e) => e.id === "body");
    const nameEl = design.elements.find((e) => e.role === "participantName");

    return {
      name: name.trim() || "Untitled certificate",
      templateType,
      titleText: titleEl?.text || "CERTIFICATE",
      subtitleText: subtitleEl?.text || "OF COMPLETION",
      bodyText: bodyEl?.text || "",
      nameFontSize: nameEl?.fontSize ?? 36,
      nameColor: nameEl?.color ?? "#1d4ed8",
      designJson: design,
      isActive: true as const,
    };
  }

  async function persist(): Promise<string> {
    const payload = buildPayload();
    if (templateId) {
      await updateTemplate(templateId, payload);
      return templateId;
    }
    const result = await createTemplate(payload);
    setTemplateId(result.template.id);
    router.replace(`/templates/designer?id=${result.template.id}`);
    return result.template.id;
  }

  async function onSave() {
    try {
      setSaving(true);
      const wasNew = !templateId;
      await persist();
      toast.success(
        wasNew ? "Certificate design created" : "Certificate design saved",
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function onPreview() {
    try {
      setPreviewing(true);
      const id = await persist();
      const blob = await previewTemplateCertificate(id, {
        sampleName: "Alex Johnson",
      });
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(URL.createObjectURL(blob));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Preview failed");
    } finally {
      setPreviewing(false);
    }
  }

  if (!ready) {
    return (
      <div className="designer-loading">
        <p>Loading designer...</p>
      </div>
    );
  }

  return (
    <>
      <CertificateDesigner
        design={design}
        onChange={setDesign}
        templateName={name}
        onNameChange={setName}
        onSave={onSave}
        onPreview={onPreview}
        saving={saving}
        previewing={previewing}
      />
      {previewUrl ? (
        <div className="designer-preview-modal">
          <div className="designer-preview-card">
            <div className="designer-preview-head">
              <h2>PDF preview</h2>
              <button
                type="button"
                className="designer-btn ghost"
                onClick={() => {
                  URL.revokeObjectURL(previewUrl);
                  setPreviewUrl(null);
                }}
              >
                Close
              </button>
            </div>
            <iframe title="Certificate preview" src={previewUrl} />
          </div>
        </div>
      ) : null}
    </>
  );
}

export default function CertificateDesignerPage() {
  return (
    <Suspense
      fallback={
        <div className="designer-loading">
          <p>Loading designer...</p>
        </div>
      }
    >
      <DesignerInner />
    </Suspense>
  );
}

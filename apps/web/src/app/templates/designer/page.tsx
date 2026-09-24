"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "react-toastify";
import { CertificateDesigner } from "@/components/certificate-designer";
import { useConfirm } from "@/components/confirm-modal";
import { getAccessToken } from "@/lib/auth";
import {
  applyOrgBrandingToDesign,
  createElegantStarterDesign,
  normalizeDesign,
  type CertificateDesign,
  type OrgBranding,
} from "@/lib/certificate-design";
import { getOrganization } from "@/lib/organizations";
import {
  createTemplate,
  getTemplate,
  previewTemplateCertificate,
  updateTemplate,
  type TemplateType,
} from "@/lib/templates";

function toOrgBranding(org: {
  name: string;
  logo: string | null;
  signatureUrl: string | null;
  signatoryName: string | null;
  signatoryDesignation: string | null;
}): OrgBranding {
  return {
    organizationName: org.name,
    logo: org.logo,
    signatureUrl: org.signatureUrl,
    signatoryName: org.signatoryName,
    signatoryDesignation: org.signatoryDesignation,
  };
}

function DesignerInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("id");
  const { confirm, confirmDialog } = useConfirm();

  const [ready, setReady] = useState(false);
  const [templateId, setTemplateId] = useState<string | null>(editId);
  const [name, setName] = useState("White and Gold Elegant Certificate");
  const [templateType] = useState<TemplateType>("COMPLETION");
  const [design, setDesign] = useState<CertificateDesign>(() =>
    normalizeDesign(createElegantStarterDesign()),
  );
  const [orgBranding, setOrgBranding] = useState<OrgBranding | null>(null);
  const [saving, setSaving] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      router.replace("/login");
      return;
    }

    async function load() {
      try {
        const org = await getOrganization();
        const branding = toOrgBranding(org);
        setOrgBranding(branding);

        if (editId) {
          const tpl = await getTemplate(editId);
          setTemplateId(tpl.id);
          setName(tpl.name);
          if (tpl.designJson && typeof tpl.designJson === "object") {
            setDesign(normalizeDesign(tpl.designJson as CertificateDesign));
          } else {
            setDesign(
              applyOrgBrandingToDesign(
                createElegantStarterDesign(
                  tpl.titleText || "CERTIFICATE",
                  tpl.subtitleText || "OF COMPLETION",
                ),
                branding,
              ),
            );
          }
        } else {
          setDesign(
            applyOrgBrandingToDesign(createElegantStarterDesign(), branding),
          );
        }
      } catch {
        toast.error("Failed to load designer");
        if (editId) router.replace("/templates");
      } finally {
        setReady(true);
      }
    }

    void load();
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
    const ok = await confirm({
      title: templateId ? "Save certificate design?" : "Create certificate design?",
      message: templateId
        ? `Save changes to “${name.trim() || "Untitled"}”?`
        : `Create a new template named “${name.trim() || "Untitled"}”?`,
      confirmLabel: "Yes, save",
      cancelLabel: "No",
    });
    if (!ok) return;

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
        orgBranding={orgBranding}
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
      {confirmDialog}
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

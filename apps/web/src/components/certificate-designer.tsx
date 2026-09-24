"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import type {
  CertificateDesign,
  DesignElement,
  DesignRole,
} from "@/lib/certificate-design";
import {
  DESIGN_CANVAS,
  DESIGN_ICONS,
  applyOrgBrandingToDesign,
  normalizeDesign,
  type OrgBranding,
} from "@/lib/certificate-design";
import {
  DEFAULT_TEMPLATE_DEFS,
  TEMPLATE_PRESETS,
} from "@/lib/certificate-presets";
import { DesignIcon } from "@/lib/design-icons";
import { templateAssetUrl, uploadDesignAsset } from "@/lib/templates";
import { toast } from "react-toastify";

type PanelTab = "templates" | "elements" | "text" | "advanced";
type ResizeHandle = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";

type Props = {
  design: CertificateDesign;
  onChange: (next: CertificateDesign) => void;
  templateName: string;
  onNameChange: (name: string) => void;
  onSave: () => void;
  onPreview: () => void;
  saving?: boolean;
  previewing?: boolean;
  sampleName?: string;
  orgBranding?: OrgBranding | null;
};

function uid(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

function roleLabel(role?: DesignRole) {
  switch (role) {
    case "participantName":
      return "Name (auto)";
    case "eventName":
      return "Event (auto)";
    case "organizationName":
      return "Org (auto)";
    case "date":
      return "Date (auto)";
    case "certificateNumber":
      return "Cert # (auto)";
    case "signatoryName":
      return "MD name";
    case "signatoryTitle":
      return "MD title";
    case "signature":
      return "Signature";
    default:
      return "Text";
  }
}

function fontFamily(el: DesignElement) {
  if (el.fontStyle === "script") {
    return "'Segoe Script', 'Brush Script MT', 'Lucida Handwriting', cursive";
  }
  if (el.fontStyle === "serif" || el.bold) {
    return "Georgia, 'Times New Roman', serif";
  }
  return "system-ui, sans-serif";
}

function elSize(el: DesignElement) {
  return {
    w: Math.max(8, el.width ?? 100),
    h: Math.max(8, el.height ?? (el.type === "line" ? 4 : 40)),
  };
}

const HANDLES: ResizeHandle[] = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];

export function CertificateDesigner({
  design,
  onChange,
  templateName,
  onNameChange,
  onSave,
  onPreview,
  saving,
  previewing,
  sampleName = "Alex Johnson",
  orgBranding = null,
}: Props) {
  const [panel, setPanel] = useState<PanelTab>("templates");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(0.58);
  const [elementFilter, setElementFilter] = useState<
    "all" | "seals" | "wreaths" | "medals" | "corners" | "shapes"
  >("all");
  const [uploadingSig, setUploadingSig] = useState(false);
  const [uploadingSeal, setUploadingSeal] = useState(false);
  const signatureFileRef = useRef<HTMLInputElement>(null);
  const sealFileRef = useRef<HTMLInputElement>(null);
  const dragRef = useRef<{
    mode: "move" | "resize";
    id: string;
    handle?: ResizeHandle;
    startX: number;
    startY: number;
    orig: DesignElement;
  } | null>(null);

  const selected = design.elements.find((e) => e.id === selectedId) ?? null;

  const findByRole = useCallback(
    (role: DesignRole) => design.elements.find((e) => e.role === role),
    [design.elements],
  );

  const commit = useCallback(
    (elements: DesignElement[]) => {
      onChange({ ...design, elements });
    },
    [design, onChange],
  );

  const updateElement = useCallback(
    (id: string, patch: Partial<DesignElement>) => {
      commit(
        design.elements.map((el) => (el.id === id ? { ...el, ...patch } : el)),
      );
    },
    [commit, design.elements],
  );

  const updateByRole = useCallback(
    (role: DesignRole, patch: Partial<DesignElement>) => {
      const el = findByRole(role);
      if (!el) return;
      updateElement(el.id, patch);
    },
    [findByRole, updateElement],
  );

  const addElement = useCallback(
    (el: DesignElement) => {
      onChange(normalizeDesign({ ...design, elements: [...design.elements, el] }));
      setSelectedId(el.id);
    },
    [design, onChange],
  );

  const removeSelected = useCallback(() => {
    if (!selectedId) return;
    const el = design.elements.find((e) => e.id === selectedId);
    if (el?.locked) return;
    commit(design.elements.filter((e) => e.id !== selectedId));
    setSelectedId(null);
  }, [commit, design.elements, selectedId]);

  const duplicateSelected = useCallback(() => {
    if (!selected) return;
    const copy: DesignElement = {
      ...selected,
      id: uid(selected.type),
      x: selected.x + 24,
      y: selected.y + 24,
      locked: false,
    };
    commit([...design.elements, copy]);
    setSelectedId(copy.id);
  }, [commit, design.elements, selected]);

  const toggleLock = useCallback(() => {
    if (!selected) return;
    updateElement(selected.id, { locked: !selected.locked });
  }, [selected, updateElement]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (
        (e.key === "Delete" || e.key === "Backspace") &&
        selectedId &&
        !(e.target instanceof HTMLInputElement) &&
        !(e.target instanceof HTMLTextAreaElement)
      ) {
        e.preventDefault();
        removeSelected();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [removeSelected, selectedId]);

  function startMove(e: ReactPointerEvent, el: DesignElement) {
    e.stopPropagation();
    setSelectedId(el.id);
    if (el.locked) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = {
      mode: "move",
      id: el.id,
      startX: e.clientX,
      startY: e.clientY,
      orig: { ...el },
    };
  }

  function startResize(
    e: ReactPointerEvent,
    el: DesignElement,
    handle: ResizeHandle,
  ) {
    e.stopPropagation();
    e.preventDefault();
    if (el.locked) return;
    setSelectedId(el.id);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = {
      mode: "resize",
      id: el.id,
      handle,
      startX: e.clientX,
      startY: e.clientY,
      orig: { ...el },
    };
  }

  function onPointerMove(e: ReactPointerEvent) {
    const drag = dragRef.current;
    if (!drag) return;
    const dx = (e.clientX - drag.startX) / zoom;
    const dy = (e.clientY - drag.startY) / zoom;
    const o = drag.orig;
    const { w: ow, h: oh } = elSize(o);

    if (drag.mode === "move") {
      updateElement(drag.id, {
        x: Math.round(o.x + dx),
        y: Math.round(o.y + dy),
      });
      return;
    }

    const handle = drag.handle!;
    let x = o.x;
    let y = o.y;
    let w = ow;
    let h = oh;

    if (handle.includes("e")) w = Math.max(16, ow + dx);
    if (handle.includes("s")) h = Math.max(16, oh + dy);
    if (handle.includes("w")) {
      w = Math.max(16, ow - dx);
      x = o.x + (ow - w);
    }
    if (handle.includes("n")) {
      h = Math.max(16, oh - dy);
      y = o.y + (oh - h);
    }

    // Corner resize: keep aspect for icons; scale font for text
    const patch: Partial<DesignElement> = {
      x: Math.round(x),
      y: Math.round(y),
      width: Math.round(w),
      height: Math.round(h),
    };

    if (
      (o.type === "icon" || o.type === "image") &&
      (handle === "nw" || handle === "ne" || handle === "sw" || handle === "se")
    ) {
      const scale = Math.max(w / ow, h / oh);
      patch.width = Math.round(ow * scale);
      patch.height = Math.round(oh * scale);
      if (handle.includes("w")) patch.x = Math.round(o.x + ow - patch.width);
      if (handle.includes("n")) patch.y = Math.round(o.y + oh - patch.height);
    }

    if (o.type === "text" && o.fontSize) {
      const scale = h / oh;
      patch.fontSize = Math.max(8, Math.round(o.fontSize * scale));
    }

    if (o.type === "line") {
      patch.height = Math.max(2, o.strokeWidth ?? 2);
    }

    updateElement(drag.id, patch);
  }

  function onPointerUp() {
    dragRef.current = null;
  }

  function displayText(el: DesignElement) {
    if (el.role === "participantName") return sampleName;
    if (el.role === "eventName") return "Sample Event 2026";
    if (el.role === "organizationName") return el.text || "Your Organization";
    if (el.role === "date") return new Date().toLocaleDateString();
    if (el.role === "certificateNumber") return "CERT-PREVIEW";
    return el.text ?? "";
  }

  function applyPreset(id: string) {
    const preset = TEMPLATE_PRESETS.find((p) => p.id === id);
    if (!preset) return;
    const next = applyOrgBrandingToDesign(
      normalizeDesign(preset.create()),
      orgBranding,
    );
    onChange(next);
    setSelectedId(null);
    onNameChange(preset.name);
  }

  function applyOrgBranding(force = true) {
    if (!orgBranding) {
      toast.info("Set logo and signer in Organization settings first");
      return;
    }
    onChange(applyOrgBrandingToDesign(design, orgBranding, { force }));
    toast.success("Organization branding applied — delete any piece you don’t need");
  }

  function addIcon(iconId: string) {
    const def = DESIGN_ICONS.find((i) => i.id === iconId);
    if (!def) return;
    addElement({
      id: uid(iconId),
      type: "icon",
      iconId,
      x: DESIGN_CANVAS.width / 2 - def.defaultWidth / 2,
      y: DESIGN_CANVAS.height / 2 - def.defaultHeight / 2,
      width: def.defaultWidth,
      height: def.defaultHeight,
    });
    setPanel("elements");
  }

  function ensureMdBlock() {
    const hasSig = findByRole("signature");
    const hasMd = findByRole("signatoryName");
    const extras: DesignElement[] = [];
    if (!hasSig) {
      extras.push({
        id: uid("signature"),
        type: "text",
        x: 730,
        y: 585,
        width: 260,
        height: 40,
        text: "D. Gallego",
        fontSize: 28,
        color: "#111827",
        align: "center",
        fontStyle: "script",
        role: "signature",
      });
    }
    if (!hasMd) {
      extras.push(
        {
          id: uid("sig-line"),
          type: "line",
          x: 740,
          y: 640,
          width: 240,
          height: 2,
          stroke: "#111827",
          strokeWidth: 1.5,
        },
        {
          id: uid("md-name"),
          type: "text",
          x: 730,
          y: 648,
          width: 260,
          height: 22,
          text: "DANIEL GALLEGO",
          fontSize: 13,
          color: "#111827",
          align: "center",
          bold: true,
          role: "signatoryName",
        },
        {
          id: uid("md-title"),
          type: "text",
          x: 730,
          y: 672,
          width: 260,
          height: 20,
          text: "MD / CEO",
          fontSize: 11,
          color: "#6b7280",
          align: "center",
          role: "signatoryTitle",
        },
      );
    }
    if (extras.length) {
      onChange(
        normalizeDesign({ ...design, elements: [...design.elements, ...extras] }),
      );
      setSelectedId(extras[0].id);
    }
    setPanel("advanced");
  }

  async function onSealFile(file: File | null) {
    if (!file) return;
    try {
      setUploadingSeal(true);
      const result = await uploadDesignAsset(file);
      const imageEl: DesignElement = {
        id: uid("seal-upload"),
        type: "image",
        src: result.url,
        x: DESIGN_CANVAS.width / 2 - 60,
        y: DESIGN_CANVAS.height / 2 - 60,
        width: 120,
        height: 120,
      };
      onChange(
        normalizeDesign({
          ...design,
          elements: [...design.elements, imageEl],
        }),
      );
      setSelectedId(imageEl.id);
      setElementFilter("seals");
      toast.success("Seal added — drag or resize on canvas");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Seal upload failed");
    } finally {
      setUploadingSeal(false);
      if (sealFileRef.current) sealFileRef.current.value = "";
    }
  }

  async function onSignatureFile(file: File | null) {
    if (!file) return;
    try {
      setUploadingSig(true);
      const result = await uploadDesignAsset(file);
      const src = result.url;
      const existingImage = design.elements.find(
        (e) => e.type === "image" && e.role === "signature",
      );
      const textSig = findByRole("signature");

      if (existingImage) {
        updateElement(existingImage.id, { src });
        setSelectedId(existingImage.id);
      } else {
        const imageEl: DesignElement = {
          id: uid("sig-image"),
          type: "image",
          role: "signature",
          src,
          x: textSig?.x ?? 740,
          y: textSig ? textSig.y - 10 : 560,
          width: 220,
          height: 70,
        };
        // Prefer uploaded image over script text signature
        const withoutTextSig = textSig
          ? design.elements.filter((e) => e.id !== textSig.id)
          : design.elements;
        onChange(
          normalizeDesign({
            ...design,
            elements: [...withoutTextSig, imageEl],
          }),
        );
        setSelectedId(imageEl.id);
      }
      toast.success("Signature image added — drag or resize on canvas");
      setPanel("advanced");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploadingSig(false);
      if (signatureFileRef.current) signatureFileRef.current.value = "";
    }
  }

  function removeSignatureImage() {
    const img = design.elements.find(
      (e) => e.type === "image" && e.role === "signature",
    );
    if (!img) return;
    commit(design.elements.filter((e) => e.id !== img.id));
    if (selectedId === img.id) setSelectedId(null);
  }

  const filteredIcons =
    elementFilter === "all"
      ? DESIGN_ICONS
      : elementFilter === "shapes"
        ? []
        : DESIGN_ICONS.filter((i) => i.category === elementFilter);

  const mdName = findByRole("signatoryName");
  const mdTitle = findByRole("signatoryTitle");
  const signatureText = design.elements.find(
    (e) => e.type === "text" && e.role === "signature",
  );
  const signatureImage = design.elements.find(
    (e) => e.type === "image" && e.role === "signature",
  );

  function renderContent(el: DesignElement) {
    const { w, h } = elSize(el);
    if (el.type === "text") {
      return (
        <div
          style={{
            width: "100%",
            height: "100%",
            fontSize: el.fontSize ?? 16,
            color: el.color ?? "#111",
            fontWeight: el.bold ? 700 : 400,
            letterSpacing: el.letterSpacing ? `${el.letterSpacing}px` : undefined,
            textAlign: el.align ?? "left",
            fontFamily: fontFamily(el),
            lineHeight: 1.35,
            overflow: "hidden",
            display: "flex",
            alignItems: "flex-start",
            justifyContent:
              el.align === "center"
                ? "center"
                : el.align === "right"
                  ? "flex-end"
                  : "flex-start",
          }}
        >
          <span style={{ width: "100%" }}>{displayText(el)}</span>
        </div>
      );
    }
    if (el.type === "line") {
      return (
        <div
          style={{
            width: "100%",
            height: Math.max(el.strokeWidth ?? 2, 2),
            marginTop: Math.max(0, (h - (el.strokeWidth ?? 2)) / 2),
            background: el.stroke ?? "#9ca3af",
          }}
        />
      );
    }
    if (el.type === "ellipse") {
      return (
        <div
          style={{
            width: "100%",
            height: "100%",
            borderRadius: "50%",
            background:
              el.fill && el.fill !== "transparent" ? el.fill : "transparent",
            border: `${el.strokeWidth ?? 1}px solid ${el.stroke ?? "#d4af37"}`,
            boxSizing: "border-box",
          }}
        />
      );
    }
    if (el.type === "rect") {
      return (
        <div
          style={{
            width: "100%",
            height: "100%",
            background:
              el.fill && el.fill !== "transparent" ? el.fill : "transparent",
            border: el.stroke
              ? `${el.strokeWidth ?? 1}px solid ${el.stroke}`
              : undefined,
            boxSizing: "border-box",
          }}
        />
      );
    }
    if (el.type === "icon" && el.iconId) {
      return <DesignIcon iconId={el.iconId} width={w} height={h} />;
    }
    if (el.type === "image" && el.src) {
      const url = templateAssetUrl(el.src) ?? el.src;
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt="Signature"
          draggable={false}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
            pointerEvents: "none",
          }}
        />
      );
    }
    if (el.type === "path" && el.path) {
      return (
        <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
          <path d={el.path} fill={el.fill ?? "#111"} />
        </svg>
      );
    }
    return null;
  }

  return (
    <div className="designer-root">
      <header className="designer-topbar">
        <div className="designer-topbar-left">
          <a href="/dashboard" className="designer-brand">
            <strong>CertiFlow</strong>
            <span>Certificate designer</span>
          </a>
          <a href="/templates" className="designer-file-link">
            Templates
          </a>
        </div>
        <input
          className="designer-title-input"
          value={templateName}
          onChange={(e) => onNameChange(e.target.value)}
          aria-label="Template name"
        />
        <div className="designer-topbar-right">
          <button
            type="button"
            className="designer-btn ghost"
            onClick={onPreview}
            disabled={previewing}
          >
            {previewing ? "Preview..." : "Preview PDF"}
          </button>
          <button
            type="button"
            className="designer-btn primary"
            onClick={onSave}
            disabled={saving}
          >
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </header>

      <div className="designer-body">
        <aside className="designer-rail">
          {(
            [
              ["templates", "Design", "▣"],
              ["elements", "Elements", "◇"],
              ["text", "Text", "T"],
              ["advanced", "Advanced", "✦"],
            ] as const
          ).map(([id, label, icon]) => (
            <button
              key={id}
              type="button"
              className={`designer-rail-btn ${panel === id ? "active" : ""}`}
              onClick={() => setPanel(id)}
            >
              <span className="designer-rail-icon" aria-hidden>
                {icon}
              </span>
              {label}
            </button>
          ))}
        </aside>

        <aside className="designer-panel">
          {panel === "templates" && (
            <>
              <h2 className="designer-panel-title">Design templates</h2>
              <p className="designer-panel-hint">
                Every piece is an element — drag, resize, or replace freely.
              </p>
              <div className="designer-template-list">
                {DEFAULT_TEMPLATE_DEFS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    className="designer-asset-card"
                    onClick={() => applyPreset(preset.id)}
                  >
                    <div
                      className="designer-thumb"
                      style={{
                        background: `linear-gradient(135deg, ${preset.thumb.bg} 55%, ${preset.thumb.accent} 55%)`,
                        border: `2px solid ${preset.thumb.border}`,
                      }}
                    />
                    <span>{preset.name}</span>
                    <small>{preset.description}</small>
                  </button>
                ))}
              </div>
              <label className="designer-field">
                Background
                <input
                  type="color"
                  value={design.background}
                  onChange={(e) =>
                    onChange({ ...design, background: e.target.value })
                  }
                />
              </label>
            </>
          )}

          {panel === "elements" && (
            <>
              <h2 className="designer-panel-title">Elements</h2>
              <p className="designer-panel-hint">
                Built-in seals, or upload your own PNG / SVG seal.
              </p>

              <input
                ref={sealFileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml,.svg"
                hidden
                onChange={(e) => onSealFile(e.target.files?.[0] ?? null)}
              />
              <button
                type="button"
                className="designer-btn primary"
                style={{ width: "100%", marginBottom: 12 }}
                disabled={uploadingSeal}
                onClick={() => sealFileRef.current?.click()}
              >
                {uploadingSeal ? "Uploading..." : "Upload seal (PNG / SVG)"}
              </button>

              <div className="designer-chip-row">
                {(
                  ["all", "seals", "wreaths", "medals", "corners", "shapes"] as const
                ).map((f) => (
                  <button
                    key={f}
                    type="button"
                    className={`designer-chip ${elementFilter === f ? "active" : ""}`}
                    onClick={() => setElementFilter(f)}
                  >
                    {f}
                  </button>
                ))}
              </div>
              {(elementFilter === "all" || elementFilter === "shapes") && (
                <div className="designer-asset-grid" style={{ marginBottom: 12 }}>
                  <button
                    type="button"
                    className="designer-asset-tile"
                    onClick={() =>
                      addElement({
                        id: uid("rect"),
                        type: "rect",
                        x: 100,
                        y: 100,
                        width: 200,
                        height: 120,
                        stroke: "#c9a227",
                        strokeWidth: 2,
                        fill: "transparent",
                      })
                    }
                  >
                    Rectangle
                  </button>
                  <button
                    type="button"
                    className="designer-asset-tile"
                    onClick={() =>
                      addElement({
                        id: uid("line"),
                        type: "line",
                        x: 300,
                        y: 400,
                        width: 240,
                        height: 2,
                        stroke: "#9ca3af",
                        strokeWidth: 1,
                      })
                    }
                  >
                    Line
                  </button>
                </div>
              )}
              <div className="designer-icon-grid">
                {filteredIcons.map((icon) => (
                  <button
                    key={icon.id}
                    type="button"
                    className="designer-icon-tile"
                    title={icon.label}
                    onClick={() => addIcon(icon.id)}
                  >
                    <DesignIcon iconId={icon.id} width={56} height={56} />
                    <span>{icon.label}</span>
                  </button>
                ))}
              </div>
            </>
          )}

          {panel === "text" && (
            <>
              <h2 className="designer-panel-title">Text</h2>
              <div className="designer-asset-grid">
                <button
                  type="button"
                  className="designer-asset-tile"
                  onClick={() =>
                    addElement({
                      id: uid("heading"),
                      type: "text",
                      x: 360,
                      y: 160,
                      width: 400,
                      height: 50,
                      text: "Heading",
                      fontSize: 36,
                      color: "#1a1a1a",
                      align: "center",
                      bold: true,
                      fontStyle: "serif",
                      role: "static",
                    })
                  }
                >
                  Add heading
                </button>
                <button
                  type="button"
                  className="designer-asset-tile"
                  onClick={() =>
                    addElement({
                      id: uid("body"),
                      type: "text",
                      x: 300,
                      y: 250,
                      width: 520,
                      height: 48,
                      text: "Body text",
                      fontSize: 14,
                      color: "#4b5563",
                      align: "center",
                      role: "static",
                    })
                  }
                >
                  Add body text
                </button>
                <button
                  type="button"
                  className="designer-asset-tile"
                  onClick={() =>
                    addElement({
                      id: uid("name"),
                      type: "text",
                      x: 300,
                      y: 300,
                      width: 520,
                      height: 48,
                      text: "Participant Name",
                      fontSize: 36,
                      color: "#c9a227",
                      align: "center",
                      fontStyle: "script",
                      role: "participantName",
                    })
                  }
                >
                  Add name field
                </button>
              </div>

              {selected?.type === "text" ? (
                <div className="designer-props">
                  <p className="designer-props-label">
                    Selected · {roleLabel(selected.role)}
                  </p>
                  <label className="designer-field">
                    Text
                    <textarea
                      rows={3}
                      value={selected.text ?? ""}
                      disabled={
                        selected.role === "participantName" ||
                        selected.role === "eventName" ||
                        selected.role === "date"
                      }
                      onChange={(e) =>
                        updateElement(selected.id, { text: e.target.value })
                      }
                    />
                  </label>
                  <label className="designer-field">
                    Size
                    <input
                      type="number"
                      min={8}
                      max={96}
                      value={selected.fontSize ?? 16}
                      onChange={(e) =>
                        updateElement(selected.id, {
                          fontSize: Number(e.target.value),
                        })
                      }
                    />
                  </label>
                  <label className="designer-field">
                    Color
                    <input
                      type="color"
                      value={selected.color ?? "#111111"}
                      onChange={(e) =>
                        updateElement(selected.id, { color: e.target.value })
                      }
                    />
                  </label>
                  <label className="designer-field">
                    Style
                    <select
                      value={selected.fontStyle ?? "sans"}
                      onChange={(e) =>
                        updateElement(selected.id, {
                          fontStyle: e.target.value as
                            | "serif"
                            | "sans"
                            | "script",
                        })
                      }
                    >
                      <option value="sans">Sans</option>
                      <option value="serif">Serif</option>
                      <option value="script">Signature script</option>
                    </select>
                  </label>
                </div>
              ) : (
                <p className="designer-panel-hint">
                  Select any element on the canvas to edit it.
                </p>
              )}
            </>
          )}

          {panel === "advanced" && (
            <>
              <h2 className="designer-panel-title">Advanced</h2>
              <p className="designer-panel-hint">
                Upload a handwritten signature image, or keep script text. Drag
                and resize on the canvas.
              </p>
              <button
                type="button"
                className="designer-asset-tile"
                onClick={ensureMdBlock}
              >
                Place MD + signature block
              </button>
              <button
                type="button"
                className="designer-asset-tile"
                onClick={() => applyOrgBranding(true)}
                style={{ marginTop: 8 }}
              >
                Apply organization branding
              </button>
              <p className="designer-panel-hint">
                Uses logo, signature, name &amp; designation from Organization
                settings. You can delete any of these on the canvas.
              </p>

              <div className="designer-props" style={{ borderTop: "none", marginTop: 12, paddingTop: 0 }}>
                <p className="designer-props-label">Signature image</p>
                <input
                  ref={signatureFileRef}
                  type="file"
                    accept="image/png,image/jpeg,image/webp,image/svg+xml,.svg"
                  hidden
                  onChange={(e) =>
                    onSignatureFile(e.target.files?.[0] ?? null)
                  }
                />
                <button
                  type="button"
                  className="designer-btn primary"
                  style={{ width: "100%", marginBottom: 8 }}
                  disabled={uploadingSig}
                  onClick={() => signatureFileRef.current?.click()}
                >
                  {uploadingSig ? "Uploading..." : "Upload signature"}
                </button>
                {signatureImage?.src ? (
                  <div className="designer-sig-preview">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={templateAssetUrl(signatureImage.src) ?? signatureImage.src}
                      alt="Uploaded signature"
                    />
                    <button
                      type="button"
                      className="designer-btn danger"
                      onClick={removeSignatureImage}
                    >
                      Remove signature image
                    </button>
                  </div>
                ) : (
                  <p className="designer-panel-hint">
                    PNG with transparent background works best.
                  </p>
                )}

                <label className="designer-field">
                  Signature text (if no image)
                  <input
                    type="text"
                    value={signatureText?.text ?? ""}
                    onChange={(e) => {
                      if (signatureText) {
                        updateElement(signatureText.id, {
                          text: e.target.value,
                        });
                      } else {
                        updateByRole("signature", { text: e.target.value });
                      }
                    }}
                    disabled={Boolean(signatureImage) || !signatureText}
                    placeholder="D. Gallego"
                  />
                </label>
                <label className="designer-field">
                  MD / Director name
                  <input
                    type="text"
                    value={mdName?.text ?? ""}
                    onChange={(e) =>
                      updateByRole("signatoryName", {
                        text: e.target.value.toUpperCase(),
                      })
                    }
                    disabled={!mdName}
                  />
                </label>
                <label className="designer-field">
                  Title under name
                  <input
                    type="text"
                    value={mdTitle?.text ?? ""}
                    onChange={(e) =>
                      updateByRole("signatoryTitle", { text: e.target.value })
                    }
                    disabled={!mdTitle}
                  />
                </label>
              </div>
            </>
          )}
        </aside>

        <main className="designer-stage-wrap">
          <div
            className="designer-stage"
            onPointerDown={() => setSelectedId(null)}
          >
            <div
              className="designer-canvas"
              style={{
                width: design.width,
                height: design.height,
                background: design.background,
                transform: `scale(${zoom})`,
              }}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
            >
              {design.elements.map((el) => {
                const { w, h } = elSize(el);
                const isSelected = selectedId === el.id;
                return (
                  <div
                    key={el.id}
                    className={`designer-el ${isSelected ? "selected" : ""} ${el.locked ? "locked" : ""}`}
                    style={{
                      left: el.x,
                      top: el.y,
                      width: w,
                      height: h,
                    }}
                    onPointerDown={(e) => startMove(e, el)}
                  >
                    {renderContent(el)}

                    {isSelected ? (
                      <>
                        <div
                          className="designer-el-toolbar"
                          onPointerDown={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            title={el.locked ? "Unlock" : "Lock"}
                            onClick={toggleLock}
                          >
                            {el.locked ? "Unlock" : "Lock"}
                          </button>
                          <button
                            type="button"
                            title="Duplicate"
                            onClick={duplicateSelected}
                            disabled={Boolean(el.locked)}
                          >
                            Copy
                          </button>
                          <button
                            type="button"
                            title="Delete"
                            onClick={removeSelected}
                            disabled={Boolean(el.locked)}
                          >
                            Delete
                          </button>
                        </div>
                        {!el.locked
                          ? HANDLES.map((handle) => (
                              <span
                                key={handle}
                                className={`designer-handle designer-handle-${handle}`}
                                onPointerDown={(e) =>
                                  startResize(e, el, handle)
                                }
                              />
                            ))
                          : null}
                      </>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>

          <footer className="designer-footer">
            <span className="designer-footer-hint">
              Click any element · Drag to move · Corner/side handles to scale ·
              Lock / Copy / Delete on selection
            </span>
            <div className="designer-zoom">
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(0.3, z - 0.05))}
              >
                −
              </button>
              <input
                type="range"
                min={30}
                max={100}
                value={Math.round(zoom * 100)}
                onChange={(e) => setZoom(Number(e.target.value) / 100)}
              />
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(1, z + 0.05))}
              >
                +
              </button>
              <span>{Math.round(zoom * 100)}%</span>
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
}

"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
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
  TEMPLATE_PRESETS,
} from "@/lib/certificate-design";
import { DesignIcon } from "@/lib/design-icons";

type PanelTab = "templates" | "elements" | "text" | "advanced";

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
}: Props) {
  const [panel, setPanel] = useState<PanelTab>("templates");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(0.58);
  const [elementFilter, setElementFilter] = useState<
    "all" | "seals" | "wreaths" | "medals" | "corners" | "shapes"
  >("all");
  const stageRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    id: string;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  } | null>(null);

  const selected = design.elements.find((e) => e.id === selectedId) ?? null;

  const findByRole = useCallback(
    (role: DesignRole) => design.elements.find((e) => e.role === role),
    [design.elements],
  );

  const updateElement = useCallback(
    (id: string, patch: Partial<DesignElement>) => {
      onChange({
        ...design,
        elements: design.elements.map((el) =>
          el.id === id ? { ...el, ...patch } : el,
        ),
      });
    },
    [design, onChange],
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
      onChange({ ...design, elements: [...design.elements, el] });
      setSelectedId(el.id);
    },
    [design, onChange],
  );

  const removeSelected = useCallback(() => {
    if (!selectedId) return;
    const el = design.elements.find((e) => e.id === selectedId);
    if (el?.locked) return;
    onChange({
      ...design,
      elements: design.elements.filter((e) => e.id !== selectedId),
    });
    setSelectedId(null);
  }, [design, onChange, selectedId]);

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

  function onPointerDown(e: ReactPointerEvent, el: DesignElement) {
    if (el.locked) {
      e.stopPropagation();
      setSelectedId(el.id);
      return;
    }
    e.stopPropagation();
    setSelectedId(el.id);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = {
      id: el.id,
      startX: e.clientX,
      startY: e.clientY,
      origX: el.x,
      origY: el.y,
    };
  }

  function onPointerMove(e: ReactPointerEvent) {
    const drag = dragRef.current;
    if (!drag) return;
    const dx = (e.clientX - drag.startX) / zoom;
    const dy = (e.clientY - drag.startY) / zoom;
    updateElement(drag.id, {
      x: Math.round(drag.origX + dx),
      y: Math.round(drag.origY + dy),
    });
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
    const next = preset.create();
    onChange(next);
    setSelectedId(null);
    onNameChange(preset.name);
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
        x: 860,
        y: 615,
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
          height: 0,
          stroke: "#111827",
          strokeWidth: 1.5,
        },
        {
          id: uid("md-name"),
          type: "text",
          x: 860,
          y: 665,
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
          x: 860,
          y: 685,
          text: "MD / CEO",
          fontSize: 11,
          color: "#6b7280",
          align: "center",
          role: "signatoryTitle",
        },
      );
    }
    if (extras.length) {
      onChange({ ...design, elements: [...design.elements, ...extras] });
      setSelectedId(extras[0].id);
    }
    setPanel("advanced");
  }

  function elementStyle(el: DesignElement): CSSProperties {
    const selectedOutline =
      selectedId === el.id ? "2px solid #7c3aed" : "2px solid transparent";

    if (el.type === "text") {
      const align = el.align ?? "left";
      return {
        position: "absolute",
        left: el.x,
        top: el.y,
        transform:
          align === "center"
            ? "translate(-50%, -100%)"
            : align === "right"
              ? "translate(-100%, -100%)"
              : "translate(0, -100%)",
        width: el.width ?? (el.fontStyle === "script" ? 280 : 480),
        fontSize: el.fontSize ?? 16,
        color: el.color ?? "#111",
        fontWeight: el.bold ? 700 : 400,
        letterSpacing: el.letterSpacing ? `${el.letterSpacing}px` : undefined,
        textAlign: align,
        fontFamily: fontFamily(el),
        lineHeight: 1.35,
        cursor: el.locked ? "default" : "move",
        userSelect: "none",
        whiteSpace: el.width ? "normal" : "nowrap",
        outline: selectedOutline,
        outlineOffset: 4,
      };
    }
    if (el.type === "line") {
      return {
        position: "absolute",
        left: el.x,
        top: el.y,
        width: el.width ?? 100,
        height: Math.max(el.strokeWidth ?? 1, 2),
        background: el.stroke ?? "#9ca3af",
        cursor: "move",
        outline: selectedOutline,
        outlineOffset: 4,
      };
    }
    if (el.type === "ellipse") {
      return {
        position: "absolute",
        left: el.x,
        top: el.y,
        width: el.width ?? 40,
        height: el.height ?? 40,
        borderRadius: "50%",
        background:
          el.fill && el.fill !== "transparent" ? el.fill : "transparent",
        border: `${el.strokeWidth ?? 1}px solid ${el.stroke ?? "#d4af37"}`,
        cursor: "move",
        outline: selectedOutline,
        outlineOffset: 4,
      };
    }
    if (el.type === "icon" || el.type === "path") {
      return {
        position: "absolute",
        left: el.x,
        top: el.y,
        width: el.width,
        height: el.height,
        cursor: el.locked ? "default" : "move",
        outline: selectedOutline,
        outlineOffset: 2,
        pointerEvents: el.locked && el.type === "path" ? "none" : "auto",
      };
    }
    return {
      position: "absolute",
      left: el.x,
      top: el.y,
      width: el.width ?? 100,
      height: el.height ?? 100,
      background: el.fill && el.fill !== "transparent" ? el.fill : "transparent",
      border: el.stroke
        ? `${el.strokeWidth ?? 1}px solid ${el.stroke}`
        : undefined,
      boxSizing: "border-box",
      pointerEvents: el.locked ? "none" : "auto",
      cursor: "move",
      outline: selectedOutline,
      outlineOffset: 2,
    };
  }

  const filteredIcons =
    elementFilter === "all"
      ? DESIGN_ICONS
      : elementFilter === "shapes"
        ? []
        : DESIGN_ICONS.filter((i) => i.category === elementFilter);

  const mdName = findByRole("signatoryName");
  const mdTitle = findByRole("signatoryTitle");
  const signature = findByRole("signature");

  return (
    <div className="designer-root">
      <header className="designer-topbar">
        <div className="designer-topbar-left">
          <a href="/templates" className="designer-file-link">
            File
          </a>
          <span className="designer-dot" />
          <span className="designer-editing">Editing</span>
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
                Pick a layout type, then customize on the canvas.
              </p>
              <div className="designer-template-list">
                {TEMPLATE_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    className="designer-asset-card"
                    onClick={() => applyPreset(preset.id)}
                  >
                    <div className={`designer-thumb ${preset.thumbClass}`} />
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
                Seals, wreaths, medals, and ornaments — click to add.
              </p>
              <div className="designer-chip-row">
                {(
                  [
                    "all",
                    "seals",
                    "wreaths",
                    "medals",
                    "corners",
                    "shapes",
                  ] as const
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

              {elementFilter === "shapes" || elementFilter === "all" ? (
                <div className="designer-asset-grid" style={{ marginBottom: 12 }}>
                  {(elementFilter === "all" || elementFilter === "shapes") && (
                    <>
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
                            height: 0,
                            stroke: "#9ca3af",
                            strokeWidth: 1,
                          })
                        }
                      >
                        Line
                      </button>
                    </>
                  )}
                </div>
              ) : null}

              <div className="designer-icon-grid">
                {filteredIcons.map((icon) => (
                  <button
                    key={icon.id}
                    type="button"
                    className="designer-icon-tile"
                    title={icon.label}
                    onClick={() => addIcon(icon.id)}
                  >
                    <DesignIcon
                      iconId={icon.id}
                      width={56}
                      height={56}
                    />
                    <span>{icon.label}</span>
                  </button>
                ))}
              </div>

              {selected && selected.type !== "text" ? (
                <div className="designer-props">
                  <p className="designer-props-label">Selected · element</p>
                  {!selected.locked ? (
                    <button
                      type="button"
                      className="designer-btn danger"
                      onClick={removeSelected}
                    >
                      Delete element
                    </button>
                  ) : (
                    <p className="designer-panel-hint">Locked template layer</p>
                  )}
                </div>
              ) : null}
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
                      x: DESIGN_CANVAS.width / 2,
                      y: 200,
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
                      x: DESIGN_CANVAS.width / 2,
                      y: 280,
                      width: 520,
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
                      x: DESIGN_CANVAS.width / 2,
                      y: 320,
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
                  <label className="designer-check">
                    <input
                      type="checkbox"
                      checked={Boolean(selected.bold)}
                      onChange={(e) =>
                        updateElement(selected.id, { bold: e.target.checked })
                      }
                    />
                    Bold
                  </label>
                  <button
                    type="button"
                    className="designer-btn danger"
                    onClick={removeSelected}
                  >
                    Delete element
                  </button>
                </div>
              ) : (
                <p className="designer-panel-hint">
                  Select text on the canvas to edit it.
                </p>
              )}
            </>
          )}

          {panel === "advanced" && (
            <>
              <h2 className="designer-panel-title">Advanced</h2>
              <p className="designer-panel-hint">
                MD name and signature on the bottom-right of the certificate.
              </p>

              <button
                type="button"
                className="designer-asset-tile"
                onClick={ensureMdBlock}
              >
                Place MD + signature block
              </button>

              <div className="designer-props" style={{ borderTop: "none", marginTop: 12, paddingTop: 0 }}>
                <label className="designer-field">
                  Signature (script)
                  <input
                    type="text"
                    value={signature?.text ?? ""}
                    placeholder="D. Gallego"
                    onChange={(e) =>
                      updateByRole("signature", { text: e.target.value })
                    }
                    disabled={!signature}
                  />
                </label>
                <label className="designer-field">
                  MD / Director name
                  <input
                    type="text"
                    value={mdName?.text ?? ""}
                    placeholder="DANIEL GALLEGO"
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
                    placeholder="MD / CEO"
                    onChange={(e) =>
                      updateByRole("signatoryTitle", { text: e.target.value })
                    }
                    disabled={!mdTitle}
                  />
                </label>
                {!signature || !mdName ? (
                  <p className="designer-panel-hint">
                    Click “Place MD + signature block” if fields are missing.
                  </p>
                ) : null}
              </div>

              <div className="designer-props">
                <p className="designer-props-label">Tips</p>
                <p className="designer-panel-hint">
                  Drag the signature and MD text on the canvas. Use Elements for
                  seals and wreaths. Switch Design templates anytime.
                </p>
              </div>
            </>
          )}
        </aside>

        <main className="designer-stage-wrap">
          <div
            className="designer-stage"
            ref={stageRef}
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
                if (el.type === "path" && el.path) {
                  return (
                    <svg
                      key={el.id}
                      style={{
                        position: "absolute",
                        inset: 0,
                        width: "100%",
                        height: "100%",
                        pointerEvents: "none",
                      }}
                      viewBox={`0 0 ${design.width} ${design.height}`}
                    >
                      <path d={el.path} fill={el.fill ?? "#111"} />
                    </svg>
                  );
                }
                return (
                  <div
                    key={el.id}
                    style={elementStyle(el)}
                    onPointerDown={(e) => onPointerDown(e, el)}
                  >
                    {el.type === "text" ? displayText(el) : null}
                    {el.type === "icon" && el.iconId ? (
                      <DesignIcon
                        iconId={el.iconId}
                        width={el.width ?? 80}
                        height={el.height ?? 80}
                      />
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>

          <footer className="designer-footer">
            <span className="designer-footer-hint">
              Templates · Elements · Text · Advanced (MD + signature)
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

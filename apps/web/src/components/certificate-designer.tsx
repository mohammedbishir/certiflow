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
import {
  deleteDesignAsset,
  listDesignAssets,
  templateAssetUrl,
  uploadDesignAsset,
  type DesignAsset,
} from "@/lib/templates";
import { toast } from "react-toastify";

type PanelTab = "templates" | "elements" | "text" | "advanced";
type ResizeHandle = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";
type DragMode = "move" | "resize" | "rotate";

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
    case "gameName":
      return "Game / event (auto)";
    case "placement":
      return "Place 1st/2nd/3rd (auto)";
    case "teamLabel":
      return "Team (auto)";
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

function cloneDesign(d: CertificateDesign): CertificateDesign {
  return JSON.parse(JSON.stringify(d)) as CertificateDesign;
}

function normalizeAngle(deg: number) {
  let n = deg % 360;
  if (n > 180) n -= 360;
  if (n < -180) n += 360;
  return Math.round(n);
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
  const [libraryAssets, setLibraryAssets] = useState<DesignAsset[]>([]);
  const [uploadCategory, setUploadCategory] = useState<
    "seals" | "shapes" | "signatures" | "other"
  >("seals");
  const [removeBgOnUpload, setRemoveBgOnUpload] = useState(true);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const signatureFileRef = useRef<HTMLInputElement>(null);
  const sealFileRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const pastRef = useRef<CertificateDesign[]>([]);
  const futureRef = useRef<CertificateDesign[]>([]);
  const dragRef = useRef<{
    mode: DragMode;
    id: string;
    handle?: ResizeHandle;
    startX: number;
    startY: number;
    startAngle?: number;
    orig: DesignElement;
  } | null>(null);

  const selected = design.elements.find((e) => e.id === selectedId) ?? null;

  const findByRole = useCallback(
    (role: DesignRole) => design.elements.find((e) => e.role === role),
    [design.elements],
  );

  const pushHistory = useCallback(() => {
    pastRef.current = [...pastRef.current.slice(-49), cloneDesign(design)];
    futureRef.current = [];
    setCanUndo(true);
    setCanRedo(false);
  }, [design]);

  const commit = useCallback(
    (elements: DesignElement[]) => {
      onChange({ ...design, elements });
    },
    [design, onChange],
  );

  const commitWithHistory = useCallback(
    (elements: DesignElement[]) => {
      pushHistory();
      onChange({ ...design, elements });
    },
    [design, onChange, pushHistory],
  );

  const updateElement = useCallback(
    (id: string, patch: Partial<DesignElement>, recordHistory = false) => {
      if (recordHistory) pushHistory();
      commit(
        design.elements.map((el) => (el.id === id ? { ...el, ...patch } : el)),
      );
    },
    [commit, design.elements, pushHistory],
  );

  const updateByRole = useCallback(
    (role: DesignRole, patch: Partial<DesignElement>) => {
      const el = findByRole(role);
      if (!el) return;
      updateElement(el.id, patch, true);
    },
    [findByRole, updateElement],
  );

  const addElement = useCallback(
    (el: DesignElement) => {
      pushHistory();
      onChange(normalizeDesign({ ...design, elements: [...design.elements, el] }));
      setSelectedId(el.id);
    },
    [design, onChange, pushHistory],
  );

  const removeSelected = useCallback(() => {
    if (!selectedId) return;
    const el = design.elements.find((e) => e.id === selectedId);
    if (el?.locked) return;
    commitWithHistory(design.elements.filter((e) => e.id !== selectedId));
    setSelectedId(null);
  }, [commitWithHistory, design.elements, selectedId]);

  const duplicateSelected = useCallback(() => {
    if (!selected) return;
    const copy: DesignElement = {
      ...selected,
      id: uid(selected.type),
      x: selected.x + 24,
      y: selected.y + 24,
      locked: false,
    };
    commitWithHistory([...design.elements, copy]);
    setSelectedId(copy.id);
  }, [commitWithHistory, design.elements, selected]);

  const toggleLock = useCallback(() => {
    if (!selected) return;
    updateElement(selected.id, { locked: !selected.locked }, true);
  }, [selected, updateElement]);

  const undo = useCallback(() => {
    const prev = pastRef.current.pop();
    if (!prev) return;
    futureRef.current.push(cloneDesign(design));
    setCanUndo(pastRef.current.length > 0);
    setCanRedo(true);
    onChange(prev);
  }, [design, onChange]);

  const redo = useCallback(() => {
    const next = futureRef.current.pop();
    if (!next) return;
    pastRef.current.push(cloneDesign(design));
    setCanUndo(true);
    setCanRedo(futureRef.current.length > 0);
    onChange(next);
  }, [design, onChange]);

  const moveLayer = useCallback(
    (direction: "front" | "back" | "forward" | "backward") => {
      if (!selectedId) return;
      const idx = design.elements.findIndex((e) => e.id === selectedId);
      if (idx < 0) return;
      const next = [...design.elements];
      const [item] = next.splice(idx, 1);
      if (direction === "front") next.push(item);
      else if (direction === "back") next.unshift(item);
      else if (direction === "forward") {
        next.splice(Math.min(idx + 1, next.length), 0, item);
      } else {
        next.splice(Math.max(idx - 1, 0), 0, item);
      }
      commitWithHistory(next);
    },
    [commitWithHistory, design.elements, selectedId],
  );

  const alignSelected = useCallback(
    (mode: "left" | "centerH" | "right" | "top" | "centerV" | "bottom") => {
      if (!selected || selected.locked) return;
      const { w, h } = elSize(selected);
      const canvasW = design.width;
      const canvasH = design.height;
      let x = selected.x;
      let y = selected.y;
      if (mode === "left") x = 40;
      if (mode === "centerH") x = Math.round((canvasW - w) / 2);
      if (mode === "right") x = canvasW - w - 40;
      if (mode === "top") y = 40;
      if (mode === "centerV") y = Math.round((canvasH - h) / 2);
      if (mode === "bottom") y = canvasH - h - 40;
      updateElement(selected.id, { x, y }, true);
    },
    [design.height, design.width, selected, updateElement],
  );

  useEffect(() => {
    void listDesignAssets()
      .then(setLibraryAssets)
      .catch(() => {
        // Library is optional until first upload.
      });
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const inField =
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
        return;
      }
      if (
        (e.ctrlKey || e.metaKey) &&
        (e.key.toLowerCase() === "y" ||
          (e.key.toLowerCase() === "z" && e.shiftKey))
      ) {
        e.preventDefault();
        redo();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "d" && !inField) {
        e.preventDefault();
        duplicateSelected();
        return;
      }
      if (
        (e.key === "Delete" || e.key === "Backspace") &&
        selectedId &&
        !inField
      ) {
        e.preventDefault();
        removeSelected();
        return;
      }
      if (!selectedId || inField || selected?.locked) return;

      if (e.key === "[") {
        e.preventDefault();
        moveLayer(e.shiftKey ? "back" : "backward");
      }
      if (e.key === "]") {
        e.preventDefault();
        moveLayer(e.shiftKey ? "front" : "forward");
      }
      if (e.key === "r" || e.key === "R") {
        e.preventDefault();
        const step = e.shiftKey ? -15 : 15;
        updateElement(
          selectedId,
          {
            rotation: normalizeAngle((selected?.rotation ?? 0) + step),
          },
          true,
        );
      }
      if (
        ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)
      ) {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        const dx =
          e.key === "ArrowLeft" ? -step : e.key === "ArrowRight" ? step : 0;
        const dy =
          e.key === "ArrowUp" ? -step : e.key === "ArrowDown" ? step : 0;
        updateElement(
          selectedId,
          {
            x: (selected?.x ?? 0) + dx,
            y: (selected?.y ?? 0) + dy,
          },
          true,
        );
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [
    duplicateSelected,
    moveLayer,
    redo,
    removeSelected,
    selected,
    selectedId,
    undo,
    updateElement,
  ]);

  function startMove(e: ReactPointerEvent, el: DesignElement) {
    e.stopPropagation();
    setSelectedId(el.id);
    if (el.locked) return;
    pushHistory();
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
    pushHistory();
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

  function startRotate(e: ReactPointerEvent, el: DesignElement) {
    e.stopPropagation();
    e.preventDefault();
    if (el.locked) return;
    setSelectedId(el.id);
    pushHistory();
    const { w, h } = elSize(el);
    const rect = canvasRef.current?.getBoundingClientRect();
    const cx = (rect?.left ?? 0) + (el.x + w / 2) * zoom;
    const cy = (rect?.top ?? 0) + (el.y + h / 2) * zoom;
    const startAngle =
      (Math.atan2(e.clientY - cy, e.clientX - cx) * 180) / Math.PI;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = {
      mode: "rotate",
      id: el.id,
      startX: e.clientX,
      startY: e.clientY,
      startAngle,
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

    if (drag.mode === "rotate") {
      const { w, h } = elSize(o);
      const rect = canvasRef.current?.getBoundingClientRect();
      const cx = (rect?.left ?? 0) + (o.x + w / 2) * zoom;
      const cy = (rect?.top ?? 0) + (o.y + h / 2) * zoom;
      const angle =
        (Math.atan2(e.clientY - cy, e.clientX - cx) * 180) / Math.PI;
      let next = (o.rotation ?? 0) + (angle - (drag.startAngle ?? 0));
      if (e.shiftKey) next = Math.round(next / 15) * 15;
      updateElement(drag.id, { rotation: normalizeAngle(next) });
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
    if (el.role === "gameName") return el.text || "100m Relay — Men";
    if (el.role === "placement") return el.text || "1st Place";
    if (el.role === "teamLabel") return el.text || "Team A";
    return el.text ?? "";
  }

  function applyPreset(id: string) {
    const preset = TEMPLATE_PRESETS.find((p) => p.id === id);
    if (!preset) return;
    pushHistory();
    const base = normalizeDesign(preset.create());
    const next =
      id === "blank-canvas"
        ? base
        : applyOrgBrandingToDesign(base, orgBranding);
    onChange(next);
    setSelectedId(null);
    onNameChange(
      id === "blank-canvas" ? "Untitled certificate" : preset.name,
    );
    if (id === "blank-canvas") {
      toast.info(
        "Blank canvas ready — use Text / Elements to build from scratch. Add a Name field so certificates show the participant.",
      );
      setPanel("text");
    }
  }

  function applyOrgBranding(force = true) {
    if (!orgBranding) {
      toast.info("Set logo and signer in Organization settings first");
      return;
    }
    pushHistory();
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
      pushHistory();
      onChange(
        normalizeDesign({ ...design, elements: [...design.elements, ...extras] }),
      );
      setSelectedId(extras[0].id);
    }
    setPanel("advanced");
  }

  async function refreshLibrary() {
    try {
      setLibraryAssets(await listDesignAssets());
    } catch {
      // ignore
    }
  }

  async function onSealFile(file: File | null) {
    if (!file) return;
    try {
      setUploadingSeal(true);
      const result = await uploadDesignAsset(file, {
        name: file.name.replace(/\.[^.]+$/, ""),
        category: uploadCategory,
        removeBg: removeBgOnUpload && uploadCategory !== "signatures",
      });
      await refreshLibrary();
      const imageEl: DesignElement = {
        id: uid("asset"),
        type: "image",
        src: result.url,
        x: DESIGN_CANVAS.width / 2 - 60,
        y: DESIGN_CANVAS.height / 2 - 60,
        width: 120,
        height: 120,
      };
      pushHistory();
      onChange(
        normalizeDesign({
          ...design,
          elements: [...design.elements, imageEl],
        }),
      );
      setSelectedId(imageEl.id);
      setElementFilter(
        uploadCategory === "shapes"
          ? "shapes"
          : uploadCategory === "seals"
            ? "seals"
            : "all",
      );
      toast.success(
        removeBgOnUpload
          ? "Saved to your library (background removed)"
          : "Saved to your library — available anytime",
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploadingSeal(false);
      if (sealFileRef.current) sealFileRef.current.value = "";
    }
  }

  function addLibraryAsset(asset: DesignAsset) {
    const imageEl: DesignElement = {
      id: uid("asset"),
      type: "image",
      src: asset.url,
      x: DESIGN_CANVAS.width / 2 - 60,
      y: DESIGN_CANVAS.height / 2 - 60,
      width: 120,
      height: 120,
      role: asset.category === "signatures" ? "signature" : undefined,
    };
    addElement(imageEl);
    toast.success(`Added “${asset.name}” to canvas`);
  }

  async function onDeleteLibraryAsset(asset: DesignAsset) {
    try {
      await deleteDesignAsset(asset.id);
      setLibraryAssets((prev) => prev.filter((a) => a.id !== asset.id));
      toast.success("Removed from library");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    }
  }

  async function onSignatureFile(file: File | null) {
    if (!file) return;
    try {
      setUploadingSig(true);
      const result = await uploadDesignAsset(file, {
        name: file.name.replace(/\.[^.]+$/, "") || "Signature",
        category: "signatures",
        removeBg: false,
      });
      await refreshLibrary();
      const src = result.url;
      const existingImage = design.elements.find(
        (e) => e.type === "image" && e.role === "signature",
      );
      const textSig = findByRole("signature");

      if (existingImage) {
        updateElement(existingImage.id, { src }, true);
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
        pushHistory();
        onChange(
          normalizeDesign({
            ...design,
            elements: [...withoutTextSig, imageEl],
          }),
        );
        setSelectedId(imageEl.id);
      }
      toast.success("Signature saved to library and added to canvas");
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
    commitWithHistory(design.elements.filter((e) => e.id !== img.id));
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
          <a
            href="/dashboard"
            className="designer-brand"
          >
            <strong>CertiFlow</strong>
            <span>Certificate designer</span>
          </a>
          <a
            href="/templates"
            className="designer-file-link"
          >
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
          <div className="designer-pro-tools">
            <button
              type="button"
              className="designer-btn ghost"
              disabled={!canUndo}
              onClick={undo}
            >
              Undo
            </button>
            <button
              type="button"
              className="designer-btn ghost"
              disabled={!canRedo}
              onClick={redo}
            >
              Redo
            </button>
            <span className="designer-dot" aria-hidden />
            <button
              type="button"
              className="designer-btn ghost"
              disabled={!selected || Boolean(selected.locked)}
              onClick={() => alignSelected("centerH")}
            >
              ⌺
            </button>
            <button
              type="button"
              className="designer-btn ghost"
              disabled={!selected || Boolean(selected.locked)}
              onClick={() => alignSelected("centerV")}
            >
              ⌻
            </button>
            <button
              type="button"
              className="designer-btn ghost"
              disabled={!selected}
              onClick={() => moveLayer("forward")}
            >
              ↑
            </button>
            <button
              type="button"
              className="designer-btn ghost"
              disabled={!selected}
              onClick={() => moveLayer("backward")}
            >
              ↓
            </button>
          </div>
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
              ["templates", "Design", "▣", "Browse ready-made layouts"],
              ["elements", "Elements", "◇", "Add shapes, images, and lines"],
              ["text", "Text", "T", "Add and style text fields"],
              ["advanced", "Advanced", "✦", "Page size and advanced options"],
            ] as const
          ).map(([id, label, icon, tip]) => (
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
                Start blank, or pick a ready layout — every piece stays editable.
              </p>
              <div className="designer-template-list">
                {DEFAULT_TEMPLATE_DEFS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    className={`designer-asset-card ${preset.id === "blank-canvas" ? "is-blank" : ""}`}
                    onClick={() => applyPreset(preset.id)}
                  >
                    <div
                      className={`designer-thumb ${preset.id === "blank-canvas" ? "blank" : ""}`}
                      style={
                        preset.id === "blank-canvas"
                          ? undefined
                          : {
                              background: `linear-gradient(135deg, ${preset.thumb.bg} 55%, ${preset.thumb.accent} 55%)`,
                              border: `2px solid ${preset.thumb.border}`,
                            }
                      }
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
                Upload seals or shapes to your library — saved for this
                organization and reusable anytime.
              </p>

              <div className="designer-props" style={{ marginTop: 0, paddingTop: 0, borderTop: "none" }}>
                <p className="designer-props-label">Upload to library</p>
                <label className="designer-field">
                  Category
                  <select
                    value={uploadCategory}
                    onChange={(e) =>
                      setUploadCategory(
                        e.target.value as
                          | "seals"
                          | "shapes"
                          | "signatures"
                          | "other",
                      )
                    }
                  >
                    <option value="seals">Seal</option>
                    <option value="shapes">Shape</option>
                    <option value="signatures">Signature</option>
                    <option value="other">Other</option>
                  </select>
                </label>
                <label className="designer-check">
                  <input
                    type="checkbox"
                    checked={removeBgOnUpload}
                    onChange={(e) => setRemoveBgOnUpload(e.target.checked)}
                    disabled={uploadCategory === "signatures"}
                  />
                  Remove background (shape / seal only)
                </label>
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
                  style={{ width: "100%", marginTop: 8 }}
                  disabled={uploadingSeal}
                  onClick={() => sealFileRef.current?.click()}
                >
                  {uploadingSeal ? "Uploading..." : "Upload element"}
                </button>
              </div>

              <div className="designer-props">
                <p className="designer-props-label">
                  My uploads · {libraryAssets.length}
                </p>
                {libraryAssets.length === 0 ? (
                  <p className="designer-panel-hint">
                    No saved uploads yet. Upload a seal or shape above.
                  </p>
                ) : (
                  <div className="designer-library-grid">
                    {libraryAssets.map((asset) => {
                      const url = templateAssetUrl(asset.url) ?? asset.url;
                      return (
                        <div key={asset.id} className="designer-library-card">
                          <button
                            type="button"
                            className="designer-library-thumb"
                            onClick={() => addLibraryAsset(asset)}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={url} alt={asset.name} />
                          </button>
                          <div className="designer-library-meta">
                            <span title={asset.name}>{asset.name}</span>
                            <small>
                              {asset.category}
                              {asset.removeBg ? " · no bg" : ""}
                            </small>
                          </div>
                          <button
                            type="button"
                            className="designer-library-delete"
                            onClick={() => void onDeleteLibraryAsset(asset)}
                          >
                            ×
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

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
              <p className="designer-props-label" style={{ marginTop: 8 }}>
                Built-in icons
              </p>
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
                <button
                  type="button"
                  className="designer-asset-tile"
                  onClick={() =>
                    addElement({
                      id: uid("game"),
                      type: "text",
                      x: 300,
                      y: 480,
                      width: 520,
                      height: 28,
                      text: "100m Relay — Men",
                      fontSize: 16,
                      color: "#111827",
                      align: "center",
                      bold: true,
                      role: "gameName",
                    })
                  }
                >
                  Add game name
                </button>
                <button
                  type="button"
                  className="designer-asset-tile"
                  onClick={() =>
                    addElement({
                      id: uid("place"),
                      type: "text",
                      x: 300,
                      y: 250,
                      width: 520,
                      height: 36,
                      text: "1st Place",
                      fontSize: 22,
                      color: "#c9a227",
                      align: "center",
                      bold: true,
                      role: "placement",
                    })
                  }
                >
                  Add place (1st/2nd/3rd)
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
                      onChange={(e) => {
                        const text = e.target.value;
                        const width = selected.width ?? 420;
                        const fontSize = selected.fontSize ?? 14;
                        const avgCharW = fontSize * 0.52;
                        const charsPerLine = Math.max(
                          12,
                          Math.floor(width / avgCharW),
                        );
                        const lines = Math.max(
                          1,
                          Math.ceil(text.length / charsPerLine),
                        );
                        const lineHeight = fontSize * 1.35 + 4;
                        const neededH = Math.ceil(
                          Math.max(fontSize * 1.55, lines * lineHeight + 8),
                        );
                        updateElement(
                          selected.id,
                          {
                            text,
                            height: Math.max(selected.height ?? 0, neededH),
                          },
                          true,
                        );
                      }}
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
                        updateElement(
                          selected.id,
                          { fontSize: Number(e.target.value) },
                          true,
                        )
                      }
                    />
                  </label>
                  <label className="designer-field">
                    Color
                    <input
                      type="color"
                      value={selected.color ?? "#111111"}
                      onChange={(e) =>
                        updateElement(selected.id, { color: e.target.value }, true)
                      }
                    />
                  </label>
                  <label className="designer-field">
                    Style
                    <select
                      value={selected.fontStyle ?? "sans"}
                      onChange={(e) =>
                        updateElement(
                          selected.id,
                          {
                            fontStyle: e.target.value as
                              | "serif"
                              | "sans"
                              | "script",
                          },
                          true,
                        )
                      }
                    >
                      <option value="sans">Sans</option>
                      <option value="serif">Serif</option>
                      <option value="script">Signature script</option>
                    </select>
                  </label>
                </div>
              ) : null}

              {selected ? (
                <div className="designer-props">
                  <p className="designer-props-label">
                    Transform · {selected.type}
                  </p>
                  <div className="designer-field-row">
                    <label className="designer-field">
                      X
                      <input
                        type="number"
                        value={Math.round(selected.x)}
                        disabled={Boolean(selected.locked)}
                        onChange={(e) =>
                          updateElement(
                            selected.id,
                            { x: Number(e.target.value) },
                            true,
                          )
                        }
                      />
                    </label>
                    <label className="designer-field">
                      Y
                      <input
                        type="number"
                        value={Math.round(selected.y)}
                        disabled={Boolean(selected.locked)}
                        onChange={(e) =>
                          updateElement(
                            selected.id,
                            { y: Number(e.target.value) },
                            true,
                          )
                        }
                      />
                    </label>
                  </div>
                  <div className="designer-field-row">
                    <label className="designer-field">
                      W
                      <input
                        type="number"
                        min={8}
                        value={Math.round(elSize(selected).w)}
                        disabled={Boolean(selected.locked)}
                        onChange={(e) =>
                          updateElement(
                            selected.id,
                            { width: Number(e.target.value) },
                            true,
                          )
                        }
                      />
                    </label>
                    <label className="designer-field">
                      H
                      <input
                        type="number"
                        min={8}
                        value={Math.round(elSize(selected).h)}
                        disabled={Boolean(selected.locked)}
                        onChange={(e) =>
                          updateElement(
                            selected.id,
                            { height: Number(e.target.value) },
                            true,
                          )
                        }
                      />
                    </label>
                  </div>
                  <label className="designer-field">
                    Rotation · {selected.rotation ?? 0}°
                    <input
                      type="range"
                      min={-180}
                      max={180}
                      step={1}
                      value={selected.rotation ?? 0}
                      disabled={Boolean(selected.locked)}
                      onPointerDown={() => pushHistory()}
                      onChange={(e) =>
                        updateElement(selected.id, {
                          rotation: Number(e.target.value),
                        })
                      }
                    />
                  </label>
                  <label className="designer-field">
                    Opacity · {Math.round((selected.opacity ?? 1) * 100)}%
                    <input
                      type="range"
                      min={10}
                      max={100}
                      step={1}
                      value={Math.round((selected.opacity ?? 1) * 100)}
                      disabled={Boolean(selected.locked)}
                      onPointerDown={() => pushHistory()}
                      onChange={(e) =>
                        updateElement(selected.id, {
                          opacity: Number(e.target.value) / 100,
                        })
                      }
                    />
                  </label>
                  <div className="designer-chip-row" style={{ marginTop: 8 }}>
                    <button
                      type="button"
                      className="designer-chip"
                      disabled={Boolean(selected.locked)}
                      onClick={() => alignSelected("left")}
                    >
                      Left
                    </button>
                    <button
                      type="button"
                      className="designer-chip"
                      disabled={Boolean(selected.locked)}
                      onClick={() => alignSelected("centerH")}
                    >
                      Center
                    </button>
                    <button
                      type="button"
                      className="designer-chip"
                      disabled={Boolean(selected.locked)}
                      onClick={() => alignSelected("right")}
                    >
                      Right
                    </button>
                    <button
                      type="button"
                      className="designer-chip"
                      onClick={() => moveLayer("front")}
                    >
                      Front
                    </button>
                    <button
                      type="button"
                      className="designer-chip"
                      onClick={() => moveLayer("back")}
                    >
                      Back
                    </button>
                  </div>
                </div>
              ) : (
                <p className="designer-panel-hint">
                  Select any element on the canvas to edit transform, rotation,
                  and opacity.
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
              ref={canvasRef}
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
                const rotation = el.rotation ?? 0;
                return (
                  <div
                    key={el.id}
                    className={`designer-el ${isSelected ? "selected" : ""} ${el.locked ? "locked" : ""}`}
                    style={{
                      left: el.x,
                      top: el.y,
                      width: w,
                      height: h,
                      opacity: el.opacity ?? 1,
                      transform: rotation ? `rotate(${rotation}deg)` : undefined,
                      zIndex: isSelected ? 20 : undefined,
                    }}
                    onPointerDown={(e) => startMove(e, el)}
                  >
                    {renderContent(el)}

                    {isSelected ? (
                      <>
                        <div
                          className="designer-el-toolbar"
                          style={{
                            transform: `translateX(-50%) rotate(${-rotation}deg)`,
                          }}
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
                            title="Duplicate (Ctrl+D)"
                            onClick={duplicateSelected}
                            disabled={Boolean(el.locked)}
                          >
                            Copy
                          </button>
                          <button
                            type="button"
                            title="Rotate +15° (R)"
                            disabled={Boolean(el.locked)}
                            onClick={() =>
                              updateElement(
                                el.id,
                                {
                                  rotation: normalizeAngle(
                                    (el.rotation ?? 0) + 15,
                                  ),
                                },
                                true,
                              )
                            }
                          >
                            ↻
                          </button>
                          <button
                            type="button"
                            title="Bring to front"
                            onClick={() => moveLayer("front")}
                          >
                            Front
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
                        {!el.locked ? (
                          <>
                            {HANDLES.map((handle) => (
                              <span
                                key={handle}
                                className={`designer-handle designer-handle-${handle}`}
                                onPointerDown={(e) =>
                                  startResize(e, el, handle)
                                }
                              />
                            ))}
                            <span
                              className="designer-rotate-handle"
                              title="Drag to rotate · Shift snaps 15°"
                              onPointerDown={(e) => startRotate(e, el)}
                            />
                            <span className="designer-rotate-stem" aria-hidden />
                          </>
                        ) : null}
                      </>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>

          <footer className="designer-footer">
            <span className="designer-footer-hint">
              Drag · Resize · Rotate handle · Undo/Redo · [ ] layers · R rotate ·
              Arrows nudge · Shift+R −15°
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

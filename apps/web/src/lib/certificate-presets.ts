import {
  type CertificateDesign,
  type DesignElement,
  type TemplatePreset,
  DESIGN_CANVAS,
  createBlankDesign,
  normalizeDesign,
} from "@/lib/certificate-design";

export type SeedTemplateType = "PARTICIPATION" | "COMPLETION" | "ACHIEVEMENT";

export type DefaultTemplateDef = TemplatePreset & {
  templateType: SeedTemplateType;
  titleText: string;
  subtitleText: string;
  bodyText: string;
  nameColor: string;
  thumb: { bg: string; border: string; accent: string };
};

function textEl(
  partial: Omit<DesignElement, "type" | "x" | "y" | "width" | "height"> & {
    id: string;
    ax: number;
    ay: number;
    width?: number;
    height?: number;
  },
): DesignElement {
  const fontSize = partial.fontSize ?? 16;
  const width = partial.width ?? 420;
  const height = partial.height ?? Math.ceil(fontSize * 1.55);
  const align = partial.align ?? "center";
  let x = partial.ax;
  if (align === "center") x = partial.ax - width / 2;
  if (align === "right") x = partial.ax - width;
  const y = partial.ay - fontSize;
  const { ax: _a, ay: _b, ...rest } = partial;
  return {
    ...rest,
    type: "text",
    x: Math.round(x),
    y: Math.round(y),
    width,
    height,
  };
}

type ThemeColors = {
  background: string;
  primary: string;
  accent: string;
  text: string;
  muted: string;
  name: string;
};

type LayoutId =
  | "classic-border"
  | "double-frame"
  | "corner-blocks"
  | "left-panel"
  | "top-bars"
  | "soft-waves"
  | "side-curves"
  | "geometric"
  | "minimal-line"
  | "split-band";

function contentBlock(
  c: ThemeColors,
  opts: {
    title: string;
    subtitle: string;
    body: string;
    nameAx?: number;
    contentWidth?: number;
  },
): DesignElement[] {
  const ax = opts.nameAx ?? 561;
  const w = opts.contentWidth ?? 680;
  return [
    textEl({
      id: "org",
      ax,
      ay: 108,
      width: 420,
      text: "YOUR ORGANIZATION",
      fontSize: 12,
      color: c.muted,
      align: "center",
      bold: true,
      letterSpacing: 3,
      role: "organizationName",
    }),
    textEl({
      id: "title",
      ax,
      ay: 175,
      width: Math.min(w + 40, 760),
      text: opts.title,
      fontSize: 40,
      color: c.primary,
      align: "center",
      bold: true,
      fontStyle: "serif",
      role: "static",
    }),
    textEl({
      id: "subtitle-line",
      ax,
      ay: 220,
      width: 480,
      text: opts.subtitle,
      fontSize: 14,
      color: c.accent,
      align: "center",
      letterSpacing: 4,
      role: "static",
    }),
    textEl({
      id: "given-to",
      ax,
      ay: 275,
      width: 420,
      text: "THIS CERTIFICATE IS AWARDED TO",
      fontSize: 13,
      color: c.muted,
      align: "center",
      letterSpacing: 2,
      role: "static",
    }),
    textEl({
      id: "participant-name",
      ax,
      ay: 345,
      width: 560,
      text: "Participant Name",
      fontSize: 36,
      color: c.name,
      align: "center",
      bold: true,
      fontStyle: "script",
      role: "participantName",
    }),
    {
      id: "name-line",
      type: "line",
      x: ax - 220,
      y: 352,
      width: 440,
      height: 0,
      stroke: c.accent,
      strokeWidth: 1.5,
    },
    textEl({
      id: "body",
      ax,
      ay: 430,
      width: w,
      height: 96,
      text: opts.body,
      fontSize: 14,
      color: c.muted,
      align: "center",
      role: "static",
    }),
    textEl({
      id: "event-name",
      ax,
      ay: 545,
      width: 520,
      text: "Event Name",
      fontSize: 18,
      color: c.text,
      align: "center",
      bold: true,
      role: "eventName",
    }),
    textEl({
      id: "date",
      ax: ax - 280,
      ay: 680,
      width: 180,
      text: "Date",
      fontSize: 12,
      color: c.muted,
      align: "center",
      role: "date",
    }),
    {
      id: "sig-line-l",
      type: "line",
      x: ax - 360,
      y: 660,
      width: 160,
      height: 0,
      stroke: c.primary,
      strokeWidth: 1,
    },
    textEl({
      id: "sig-name-l",
      ax: ax - 280,
      ay: 690,
      width: 180,
      text: "Director",
      fontSize: 12,
      color: c.text,
      align: "center",
      bold: true,
      role: "signatoryName",
    }),
    textEl({
      id: "sig-title-l",
      ax: ax - 280,
      ay: 710,
      width: 180,
      text: "Authorized Signatory",
      fontSize: 11,
      color: c.muted,
      align: "center",
      role: "signatoryTitle",
    }),
    {
      id: "sig-line-r",
      type: "line",
      x: ax + 200,
      y: 660,
      width: 160,
      height: 0,
      stroke: c.primary,
      strokeWidth: 1,
    },
    textEl({
      id: "sig-name-r",
      ax: ax + 280,
      ay: 690,
      width: 180,
      text: "CEO",
      fontSize: 12,
      color: c.text,
      align: "center",
      bold: true,
      role: "static",
    }),
    textEl({
      id: "sig-title-r",
      ax: ax + 280,
      ay: 710,
      width: 180,
      text: "Organization Lead",
      fontSize: 11,
      color: c.muted,
      align: "center",
      role: "static",
    }),
    textEl({
      id: "cert-no",
      ax,
      ay: 755,
      width: 280,
      text: "Certificate No.",
      fontSize: 11,
      color: c.muted,
      align: "center",
      role: "certificateNumber",
    }),
  ];
}

function buildLayout(
  layout: LayoutId,
  c: ThemeColors,
  copy: { title: string; subtitle: string; body: string },
): CertificateDesign {
  const W = DESIGN_CANVAS.width;
  const H = DESIGN_CANVAS.height;
  const deco: DesignElement[] = [];

  if (layout === "classic-border") {
    deco.push(
      {
        id: "border-outer",
        type: "rect",
        x: 28,
        y: 28,
        width: W - 56,
        height: H - 56,
        stroke: c.accent,
        strokeWidth: 3,
        fill: "transparent",
      },
      {
        id: "border-inner",
        type: "rect",
        x: 42,
        y: 42,
        width: W - 84,
        height: H - 84,
        stroke: c.primary,
        strokeWidth: 1.5,
        fill: "transparent",
      },
      {
        id: "seal",
        type: "icon",
        iconId: "seal-gold",
        x: 521,
        y: 530,
        width: 70,
        height: 70,
      },
    );
  }

  if (layout === "double-frame") {
    deco.push(
      {
        id: "frame-outer",
        type: "rect",
        x: 24,
        y: 24,
        width: W - 48,
        height: H - 48,
        stroke: c.primary,
        strokeWidth: 2,
        fill: "transparent",
      },
      {
        id: "frame-gold",
        type: "rect",
        x: 36,
        y: 36,
        width: W - 72,
        height: H - 72,
        stroke: c.accent,
        strokeWidth: 5,
        fill: "transparent",
      },
      {
        id: "corner-tl",
        type: "icon",
        iconId: "corner-flourish",
        x: 48,
        y: 48,
        width: 80,
        height: 80,
      },
      {
        id: "corner-tr",
        type: "icon",
        iconId: "corner-flourish",
        x: W - 128,
        y: 48,
        width: 80,
        height: 80,
      },
      {
        id: "seal",
        type: "icon",
        iconId: "seal-ribbon",
        x: 516,
        y: 530,
        width: 90,
        height: 100,
      },
    );
  }

  if (layout === "corner-blocks") {
    deco.push(
      {
        id: "tri-tr",
        type: "path",
        x: 0,
        y: 0,
        width: W,
        height: H,
        path: `M${W - 280},0 L${W},0 L${W},220 Z`,
        fill: c.primary,
      },
      {
        id: "tri-tr-gold",
        type: "path",
        x: 0,
        y: 0,
        width: W,
        height: H,
        path: `M${W - 200},0 L${W},0 L${W},140 Z`,
        fill: c.accent,
      },
      {
        id: "tri-bl",
        type: "path",
        x: 0,
        y: 0,
        width: W,
        height: H,
        path: "M0,580 L0,794 L260,794 Z",
        fill: c.primary,
      },
      {
        id: "border",
        type: "rect",
        x: 48,
        y: 48,
        width: W - 96,
        height: H - 96,
        stroke: c.accent,
        strokeWidth: 2,
        fill: "transparent",
      },
      {
        id: "seal",
        type: "icon",
        iconId: "seal-ribbon",
        x: W - 170,
        y: 40,
        width: 100,
        height: 120,
      },
    );
  }

  if (layout === "left-panel") {
    deco.push(
      {
        id: "panel",
        type: "path",
        x: 0,
        y: 0,
        width: 340,
        height: H,
        path: "M0,0 L250,0 C310,200 200,450 280,794 L0,794 Z",
        fill: c.primary,
      },
      {
        id: "panel-gold",
        type: "path",
        x: 0,
        y: 0,
        width: 340,
        height: H,
        path: "M200,0 C280,180 210,420 300,794 L250,794 C170,450 260,200 200,0 Z",
        fill: c.accent,
      },
      {
        id: "seal",
        type: "icon",
        iconId: "seal-ribbon",
        x: 70,
        y: 80,
        width: 110,
        height: 130,
      },
      {
        id: "border-r",
        type: "rect",
        x: 340,
        y: 48,
        width: W - 388,
        height: H - 96,
        stroke: c.accent,
        strokeWidth: 1.5,
        fill: "transparent",
      },
    );
    return normalizeDesign({
      version: 1,
      width: W,
      height: H,
      background: c.background,
      elements: [
        ...deco,
        ...contentBlock(c, {
          ...copy,
          nameAx: 680,
          contentWidth: 560,
        }),
      ],
    });
  }

  if (layout === "top-bars") {
    deco.push(
      {
        id: "bar-top",
        type: "rect",
        x: 0,
        y: 0,
        width: W,
        height: 18,
        fill: c.primary,
      },
      {
        id: "bar-bottom",
        type: "rect",
        x: 0,
        y: H - 18,
        width: W,
        height: 18,
        fill: c.primary,
      },
      {
        id: "accent-line",
        type: "rect",
        x: 0,
        y: 18,
        width: W,
        height: 6,
        fill: c.accent,
      },
      {
        id: "laurel",
        type: "icon",
        iconId: "laurel-pair",
        x: 461,
        y: 210,
        width: 200,
        height: 48,
      },
    );
  }

  if (layout === "soft-waves") {
    // Elegant gold L-corners — arms meet at the corner; leave QR clear on left.
    const inset = 48;
    const arm = 168;
    const thick = 3;
    deco.push(
      {
        id: "corner-tl-h",
        type: "rect",
        x: inset,
        y: inset,
        width: arm,
        height: thick,
        fill: c.accent,
      },
      {
        id: "corner-tl-v",
        type: "rect",
        x: inset,
        y: inset,
        width: thick,
        height: arm,
        fill: c.accent,
      },
      {
        id: "corner-br-h",
        type: "rect",
        x: W - inset - arm,
        y: H - inset - thick,
        width: arm,
        height: thick,
        fill: c.accent,
      },
      {
        id: "corner-br-v",
        type: "rect",
        x: W - inset - thick,
        y: H - inset - arm,
        width: thick,
        height: arm,
        fill: c.accent,
      },
      {
        id: "seal",
        type: "icon",
        iconId: "seal-ribbon",
        x: W - 150,
        y: 42,
        width: 88,
        height: 100,
      },
    );
  }

  if (layout === "side-curves") {
    deco.push(
      {
        id: "curve-top",
        type: "path",
        x: 0,
        y: 0,
        width: W,
        height: H,
        path: "M0,0 L1123,0 L1123,48 C800,70 320,20 0,55 Z",
        fill: c.primary,
      },
      {
        id: "curve-top-gold",
        type: "path",
        x: 0,
        y: 0,
        width: W,
        height: H,
        path: "M0,40 C350,18 780,58 1123,36 L1123,55 C780,75 350,35 0,55 Z",
        fill: c.accent,
      },
      {
        id: "curve-bottom",
        type: "path",
        x: 0,
        y: 0,
        width: W,
        height: H,
        path: "M0,794 L1123,794 L1123,740 C780,710 340,760 0,730 Z",
        fill: c.primary,
      },
      {
        id: "seal",
        type: "icon",
        iconId: "seal-gold",
        x: 521,
        y: 535,
        width: 70,
        height: 70,
      },
    );
  }

  if (layout === "geometric") {
    deco.push(
      {
        id: "geo-tr",
        type: "path",
        x: 0,
        y: 0,
        width: W,
        height: H,
        path: `M${W - 260},0 L${W},0 L${W},180 Z`,
        fill: "#111111",
      },
      {
        id: "geo-tr-gold",
        type: "path",
        x: 0,
        y: 0,
        width: W,
        height: H,
        path: `M${W - 180},0 L${W},0 L${W},110 Z`,
        fill: c.accent,
      },
      {
        id: "geo-bl",
        type: "path",
        x: 0,
        y: 0,
        width: W,
        height: H,
        path: "M0,620 L0,794 L220,794 Z",
        fill: "#111111",
      },
      {
        id: "geo-bl-gold",
        type: "path",
        x: 0,
        y: 0,
        width: W,
        height: H,
        path: "M0,700 L0,794 L120,794 Z",
        fill: c.accent,
      },
      {
        id: "inner",
        type: "rect",
        x: 56,
        y: 56,
        width: W - 112,
        height: H - 112,
        stroke: "#111111",
        strokeWidth: 1.5,
        fill: "transparent",
      },
      {
        id: "seal",
        type: "icon",
        iconId: "seal-ribbon",
        x: W - 160,
        y: 36,
        width: 100,
        height: 120,
      },
    );
  }

  if (layout === "minimal-line") {
    deco.push(
      {
        id: "top-rule",
        type: "line",
        x: 120,
        y: 70,
        width: W - 240,
        height: 0,
        stroke: c.accent,
        strokeWidth: 2,
      },
      {
        id: "bottom-rule",
        type: "line",
        x: 120,
        y: H - 70,
        width: W - 240,
        height: 0,
        stroke: c.accent,
        strokeWidth: 2,
      },
      {
        id: "wreath",
        type: "icon",
        iconId: "wreath-gold",
        x: 506,
        y: 500,
        width: 110,
        height: 110,
      },
    );
  }

  if (layout === "split-band") {
    deco.push(
      {
        id: "left-band",
        type: "rect",
        x: 0,
        y: 0,
        width: 28,
        height: H,
        fill: c.primary,
      },
      {
        id: "right-band",
        type: "rect",
        x: W - 28,
        y: 0,
        width: 28,
        height: H,
        fill: c.accent,
      },
      {
        id: "top-band",
        type: "rect",
        x: 28,
        y: 0,
        width: W - 56,
        height: 14,
        fill: c.primary,
      },
      {
        id: "shield",
        type: "icon",
        iconId: "shield-wreath",
        x: 516,
        y: 500,
        width: 90,
        height: 100,
      },
    );
  }

  return normalizeDesign({
    version: 1,
    width: W,
    height: H,
    background: c.background,
    elements: [...deco, ...contentBlock(c, copy)],
  });
}

type PresetSpec = {
  id: string;
  name: string;
  description: string;
  templateType: SeedTemplateType;
  titleText: string;
  subtitleText: string;
  bodyText: string;
  layout: LayoutId;
  colors: ThemeColors;
  thumb: { bg: string; border: string; accent: string };
};

const SPECS: PresetSpec[] = [
  {
    id: "navy-gold-achievement",
    name: "Navy & Gold Achievement",
    description: "Corner blocks with ribbon seal",
    templateType: "ACHIEVEMENT",
    titleText: "Certificate of Achievement",
    subtitleText: "OF ACHIEVEMENT",
    bodyText:
      "has demonstrated outstanding achievement and dedication throughout the program.",
    layout: "corner-blocks",
    colors: {
      background: "#ffffff",
      primary: "#1e3a5f",
      accent: "#d4af37",
      text: "#111827",
      muted: "#4b5563",
      name: "#1e3a5f",
    },
    thumb: { bg: "#fff", border: "#1e3a5f", accent: "#d4af37" },
  },
  {
    id: "soft-wave-appreciation",
    name: "Soft Wave Appreciation",
    description: "Elegant corner accents, clean center layout",
    templateType: "PARTICIPATION",
    titleText: "Certificate of Appreciation",
    subtitleText: "OF APPRECIATION",
    bodyText:
      "is hereby recognized for valuable contribution and outstanding support.",
    layout: "soft-waves",
    colors: {
      background: "#ffffff",
      primary: "#1f2937",
      accent: "#c9a227",
      text: "#111827",
      muted: "#6b7280",
      name: "#c9a227",
    },
    thumb: { bg: "#fff", border: "#c9a227", accent: "#1f2937" },
  },
  {
    id: "left-panel-navy",
    name: "Left Panel Formal",
    description: "Navy swoosh panel with gold seal",
    templateType: "COMPLETION",
    titleText: "Certificate of Appreciation",
    subtitleText: "OF APPRECIATION",
    bodyText:
      "has successfully completed the program with distinction and professionalism.",
    layout: "left-panel",
    colors: {
      background: "#ffffff",
      primary: "#0f2744",
      accent: "#c9a227",
      text: "#111827",
      muted: "#4b5563",
      name: "#c9a227",
    },
    thumb: { bg: "#fff", border: "#0f2744", accent: "#c9a227" },
  },
  {
    id: "classic-gold-completion",
    name: "Classic Gold Border",
    description: "Traditional double gold frame",
    templateType: "COMPLETION",
    titleText: "Certificate of Completion",
    subtitleText: "OF COMPLETION",
    bodyText:
      "has successfully completed all requirements of the professional training program.",
    layout: "classic-border",
    colors: {
      background: "#fffef8",
      primary: "#1a1a1a",
      accent: "#d4af37",
      text: "#111827",
      muted: "#4b5563",
      name: "#b8860b",
    },
    thumb: { bg: "#fffef8", border: "#d4af37", accent: "#b8860b" },
  },
  {
    id: "maroon-curves",
    name: "Maroon Curve Formal",
    description: "Bold curved bands, internship style",
    templateType: "PARTICIPATION",
    titleText: "Internship Certificate",
    subtitleText: "OF INTERNSHIP",
    bodyText:
      "has successfully completed the internship program and shown excellent commitment.",
    layout: "side-curves",
    colors: {
      background: "#fffaf5",
      primary: "#7f1d1d",
      accent: "#d6b56d",
      text: "#1f2937",
      muted: "#6b7280",
      name: "#7f1d1d",
    },
    thumb: { bg: "#fffaf5", border: "#7f1d1d", accent: "#d6b56d" },
  },
  {
    id: "black-gold-geometric",
    name: "Black & Gold Geometric",
    description: "Sharp corners with gold seal",
    templateType: "ACHIEVEMENT",
    titleText: "Certificate of Appreciation",
    subtitleText: "OF APPRECIATION",
    bodyText:
      "is awarded this certificate in recognition of exceptional performance.",
    layout: "geometric",
    colors: {
      background: "#ffffff",
      primary: "#111111",
      accent: "#d4af37",
      text: "#111111",
      muted: "#4b5563",
      name: "#b8860b",
    },
    thumb: { bg: "#fff", border: "#111", accent: "#d4af37" },
  },
  {
    id: "teal-modern",
    name: "Teal Modern Bars",
    description: "Clean teal header and footer",
    templateType: "PARTICIPATION",
    titleText: "Certificate of Participation",
    subtitleText: "OF PARTICIPATION",
    bodyText:
      "has successfully participated in the program and demonstrated valuable engagement.",
    layout: "top-bars",
    colors: {
      background: "#ffffff",
      primary: "#0f766e",
      accent: "#14b8a6",
      text: "#134e4a",
      muted: "#4b5563",
      name: "#0f766e",
    },
    thumb: { bg: "#fff", border: "#0f766e", accent: "#14b8a6" },
  },
  {
    id: "emerald-laurel",
    name: "Emerald Laurel",
    description: "Green frame with wreath accents",
    templateType: "ACHIEVEMENT",
    titleText: "Certificate of Achievement",
    subtitleText: "OF ACHIEVEMENT",
    bodyText:
      "has achieved excellence and is recognized for outstanding results.",
    layout: "double-frame",
    colors: {
      background: "#f7fef9",
      primary: "#065f46",
      accent: "#059669",
      text: "#064e3b",
      muted: "#4b5563",
      name: "#047857",
    },
    thumb: { bg: "#f7fef9", border: "#065f46", accent: "#059669" },
  },
  {
    id: "royal-purple",
    name: "Royal Purple Frame",
    description: "Elegant purple double border",
    templateType: "COMPLETION",
    titleText: "Certificate of Completion",
    subtitleText: "OF COMPLETION",
    bodyText:
      "has completed the course requirements with dedication and skill.",
    layout: "double-frame",
    colors: {
      background: "#faf5ff",
      primary: "#5b21b6",
      accent: "#c4b5fd",
      text: "#4c1d95",
      muted: "#6b7280",
      name: "#7c3aed",
    },
    thumb: { bg: "#faf5ff", border: "#5b21b6", accent: "#c4b5fd" },
  },
  {
    id: "coral-sunrise",
    name: "Coral Sunrise",
    description: "Warm coral accents and soft waves",
    templateType: "PARTICIPATION",
    titleText: "Certificate of Appreciation",
    subtitleText: "OF APPRECIATION",
    bodyText:
      "is recognized for enthusiastic participation and positive contribution.",
    layout: "soft-waves",
    colors: {
      background: "#fff7ed",
      primary: "#9a3412",
      accent: "#fb923c",
      text: "#7c2d12",
      muted: "#78716c",
      name: "#c2410c",
    },
    thumb: { bg: "#fff7ed", border: "#fb923c", accent: "#c2410c" },
  },
  {
    id: "slate-minimal",
    name: "Slate Minimal",
    description: "Clean lines, academic look",
    templateType: "COMPLETION",
    titleText: "Certificate of Completion",
    subtitleText: "OF COMPLETION",
    bodyText:
      "has fulfilled all academic and practical requirements of the program.",
    layout: "minimal-line",
    colors: {
      background: "#ffffff",
      primary: "#334155",
      accent: "#94a3b8",
      text: "#0f172a",
      muted: "#64748b",
      name: "#1e293b",
    },
    thumb: { bg: "#fff", border: "#334155", accent: "#94a3b8" },
  },
  {
    id: "forest-classic",
    name: "Forest Classic",
    description: "Deep green classic border",
    templateType: "ACHIEVEMENT",
    titleText: "Certificate of Achievement",
    subtitleText: "OF ACHIEVEMENT",
    bodyText:
      "is awarded for remarkable progress and consistent high performance.",
    layout: "classic-border",
    colors: {
      background: "#f8faf8",
      primary: "#14532d",
      accent: "#84cc16",
      text: "#14532d",
      muted: "#4b5563",
      name: "#166534",
    },
    thumb: { bg: "#f8faf8", border: "#14532d", accent: "#84cc16" },
  },
  {
    id: "midnight-split",
    name: "Midnight Split Band",
    description: "Side bands with shield emblem",
    templateType: "PARTICIPATION",
    titleText: "Certificate of Participation",
    subtitleText: "OF PARTICIPATION",
    bodyText:
      "has actively participated and contributed meaningfully to the event.",
    layout: "split-band",
    colors: {
      background: "#ffffff",
      primary: "#1e293b",
      accent: "#38bdf8",
      text: "#0f172a",
      muted: "#64748b",
      name: "#0369a1",
    },
    thumb: { bg: "#fff", border: "#1e293b", accent: "#38bdf8" },
  },
  {
    id: "champagne-rose",
    name: "Champagne Rose Gold",
    description: "Soft ivory with rose-gold accents",
    templateType: "COMPLETION",
    titleText: "Certificate of Completion",
    subtitleText: "OF COMPLETION",
    bodyText:
      "has successfully completed the program and is congratulated on this milestone.",
    layout: "classic-border",
    colors: {
      background: "#fff8f5",
      primary: "#9f1239",
      accent: "#e8b4b8",
      text: "#4c0519",
      muted: "#78716c",
      name: "#be123c",
    },
    thumb: { bg: "#fff8f5", border: "#e8b4b8", accent: "#be123c" },
  },
  {
    id: "crimson-seal",
    name: "Crimson Seal Formal",
    description: "Bold crimson curves and seal",
    templateType: "ACHIEVEMENT",
    titleText: "Certificate of Achievement",
    subtitleText: "OF ACHIEVEMENT",
    bodyText:
      "is hereby honored for exceptional merit and professional excellence.",
    layout: "side-curves",
    colors: {
      background: "#fffafa",
      primary: "#991b1b",
      accent: "#f59e0b",
      text: "#7f1d1d",
      muted: "#6b7280",
      name: "#b91c1c",
    },
    thumb: { bg: "#fffafa", border: "#991b1b", accent: "#f59e0b" },
  },
  {
    id: "ocean-teal-wave",
    name: "Ocean Teal Wave",
    description: "Cool teal waves and medal",
    templateType: "PARTICIPATION",
    titleText: "Certificate of Participation",
    subtitleText: "OF PARTICIPATION",
    bodyText:
      "has completed participation with enthusiasm and collaborative spirit.",
    layout: "soft-waves",
    colors: {
      background: "#f0fdfa",
      primary: "#115e59",
      accent: "#5eead4",
      text: "#134e4a",
      muted: "#57534e",
      name: "#0f766e",
    },
    thumb: { bg: "#f0fdfa", border: "#0f766e", accent: "#5eead4" },
  },
  {
    id: "charcoal-gold-strip",
    name: "Charcoal Gold Strip",
    description: "Dark left panel, gold accents",
    templateType: "COMPLETION",
    titleText: "Certificate of Completion",
    subtitleText: "OF COMPLETION",
    bodyText:
      "has met every standard of the curriculum and is awarded this certificate.",
    layout: "left-panel",
    colors: {
      background: "#ffffff",
      primary: "#171717",
      accent: "#ca8a04",
      text: "#171717",
      muted: "#525252",
      name: "#a16207",
    },
    thumb: { bg: "#fff", border: "#171717", accent: "#ca8a04" },
  },
  {
    id: "ivory-academic",
    name: "Ivory Academic",
    description: "Formal ivory double frame",
    templateType: "ACHIEVEMENT",
    titleText: "Certificate of Achievement",
    subtitleText: "OF ACHIEVEMENT",
    bodyText:
      "is conferred in recognition of scholarly achievement and hard work.",
    layout: "double-frame",
    colors: {
      background: "#faf8f1",
      primary: "#44403c",
      accent: "#a8a29e",
      text: "#292524",
      muted: "#78716c",
      name: "#57534e",
    },
    thumb: { bg: "#faf8f1", border: "#a8a29e", accent: "#44403c" },
  },
  {
    id: "sky-blue-cert",
    name: "Sky Blue Certificate",
    description: "Bright sky blue bars and laurel",
    templateType: "PARTICIPATION",
    titleText: "Certificate of Participation",
    subtitleText: "OF PARTICIPATION",
    bodyText:
      "has taken part in the learning journey and is appreciated for their effort.",
    layout: "top-bars",
    colors: {
      background: "#ffffff",
      primary: "#0369a1",
      accent: "#7dd3fc",
      text: "#0c4a6e",
      muted: "#64748b",
      name: "#0284c7",
    },
    thumb: { bg: "#fff", border: "#0369a1", accent: "#7dd3fc" },
  },
  {
    id: "amber-geometric",
    name: "Amber Geometric Award",
    description: "Warm amber geometric corners",
    templateType: "ACHIEVEMENT",
    titleText: "Certificate of Achievement",
    subtitleText: "OF ACHIEVEMENT",
    bodyText:
      "is presented for notable accomplishment and inspiring leadership.",
    layout: "geometric",
    colors: {
      background: "#fffbeb",
      primary: "#92400e",
      accent: "#f59e0b",
      text: "#78350f",
      muted: "#78716c",
      name: "#b45309",
    },
    thumb: { bg: "#fffbeb", border: "#92400e", accent: "#f59e0b" },
  },
];

const BLANK_TEMPLATE_DEF: DefaultTemplateDef = {
  id: "blank-canvas",
  name: "Blank canvas",
  description: "Start from scratch — empty white page",
  thumbClass: "blank",
  templateType: "COMPLETION",
  titleText: "Certificate",
  subtitleText: "This is to certify that",
  bodyText: "",
  nameColor: "#111827",
  thumb: { bg: "#ffffff", border: "#d1d5db", accent: "#f3f4f6" },
  create: () => createBlankDesign(),
};

export const DEFAULT_TEMPLATE_DEFS: DefaultTemplateDef[] = [
  BLANK_TEMPLATE_DEF,
  ...SPECS.map((spec) => ({
    id: spec.id,
    name: spec.name,
    description: spec.description,
    thumbClass: spec.id,
    templateType: spec.templateType,
    titleText: spec.titleText,
    subtitleText: "This is to certify that",
    bodyText: spec.bodyText,
    nameColor: spec.colors.name,
    thumb: spec.thumb,
    create: () => {
      // Classic split: big "CERTIFICATE" + small "OF APPRECIATION" (not both full phrases).
      const ofLine = spec.subtitleText.startsWith("OF ")
        ? spec.subtitleText
        : spec.titleText
            .replace(/^Certificate\s+/i, "")
            .toUpperCase()
            .replace(/^OF\s+/i, "OF ");
      return buildLayout(spec.layout, spec.colors, {
        title: "CERTIFICATE",
        subtitle: ofLine.startsWith("OF ") ? ofLine : `OF ${ofLine}`,
        body: spec.bodyText,
      });
    },
  })),
];

/** Designer preset list (blank + 20 attractive defaults). */
export const TEMPLATE_PRESETS: TemplatePreset[] = DEFAULT_TEMPLATE_DEFS.map(
  ({ id, name, description, thumbClass, create }) => ({
    id,
    name,
    description,
    thumbClass,
    create,
  }),
);

export function getDefaultTemplateDef(id: string) {
  return DEFAULT_TEMPLATE_DEFS.find((item) => item.id === id) ?? null;
}

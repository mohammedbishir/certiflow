export type DesignRole =
  | "static"
  | "participantName"
  | "eventName"
  | "organizationName"
  | "date"
  | "certificateNumber"
  | "signatoryName"
  | "signatoryTitle"
  | "signature"
  | "gameName"
  | "placement"
  | "teamLabel";

export type DesignElementType =
  | "text"
  | "rect"
  | "line"
  | "ellipse"
  | "icon"
  | "path"
  | "image";

export type DesignElement = {
  id: string;
  type: DesignElementType;
  x: number;
  y: number;
  width?: number;
  height?: number;
  text?: string;
  fontSize?: number;
  color?: string;
  align?: "left" | "center" | "right";
  bold?: boolean;
  letterSpacing?: number;
  fontStyle?: "serif" | "sans" | "script";
  role?: DesignRole;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  opacity?: number;
  iconId?: string;
  path?: string;
  /** Image URL (e.g. uploaded signature) */
  src?: string;
  locked?: boolean;
  /** Rotation in degrees (clockwise) */
  rotation?: number;
};

export type CertificateDesign = {
  version: 1;
  width: number;
  height: number;
  background: string;
  elements: DesignElement[];
};

export type TemplatePreset = {
  id: string;
  name: string;
  description: string;
  thumbClass: string;
  create: () => CertificateDesign;
};

export const DESIGN_CANVAS = { width: 1123, height: 794 };

/** Empty white canvas — admin builds the certificate from scratch. */
export function createBlankDesign(): CertificateDesign {
  return normalizeDesign({
    version: 1,
    width: DESIGN_CANVAS.width,
    height: DESIGN_CANVAS.height,
    background: "#ffffff",
    elements: [],
  });
}

/** Text box from center/left/right anchor + baseline (legacy) → top-left box */
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

function baseMeta(
  elements: DesignElement[],
  background = "#ffffff",
): CertificateDesign {
  return {
    version: 1,
    width: DESIGN_CANVAS.width,
    height: DESIGN_CANVAS.height,
    background,
    elements,
  };
}

/** Make every element freely movable and scalable. */
export function normalizeDesign(design: CertificateDesign): CertificateDesign {
  return {
    ...design,
    elements: design.elements.map((el) => {
      if (el.type === "text") {
        const fontSize = el.fontSize ?? 16;
        const width = el.width ?? 420;
        const height = el.height ?? Math.ceil(fontSize * 1.55);
        // Legacy: missing height meant baseline+anchor coords
        if (el.height == null) {
          const align = el.align ?? "center";
          let x = el.x;
          if (align === "center") x = el.x - width / 2;
          if (align === "right") x = el.x - width;
          return {
            ...el,
            x: Math.round(x),
            y: Math.round(el.y - fontSize),
            width,
            height,
            locked: false,
          };
        }
        return { ...el, width, height, locked: el.locked ?? false };
      }
      if (el.type === "line") {
        // height is a designer hit-box only; PDF draws using strokeWidth.
        return {
          ...el,
          width: el.width ?? 200,
          height: Math.max(el.height ?? 0, 8),
          strokeWidth: el.strokeWidth ?? 1.5,
          locked: el.locked ?? false,
        };
      }
      if (el.type === "path") {
        return {
          ...el,
          width: el.width ?? design.width,
          height: el.height ?? design.height,
          locked: el.locked ?? false,
        };
      }
      return {
        ...el,
        width: el.width ?? 100,
        height: el.height ?? 100,
        locked: el.locked ?? false,
      };
    }),
  };
}

export function createElegantStarterDesign(
  title = "CERTIFICATE",
  subtitle = "OF COMPLETION",
): CertificateDesign {
  return normalizeDesign(
    baseMeta([
      {
        id: "border-outer",
        type: "rect",
        x: 28,
        y: 28,
        width: 1067,
        height: 738,
        stroke: "#c9a227",
        strokeWidth: 3,
        fill: "transparent",
      },
      {
        id: "border-inner",
        type: "rect",
        x: 42,
        y: 42,
        width: 1039,
        height: 710,
        stroke: "#d4af37",
        strokeWidth: 1.5,
        fill: "transparent",
      },
      textEl({
        id: "title",
        ax: 561,
        ay: 110,
        width: 700,
        text: title,
        fontSize: 52,
        color: "#1a1a1a",
        align: "center",
        bold: true,
        fontStyle: "serif",
        role: "static",
      }),
      textEl({
        id: "subtitle",
        ax: 561,
        ay: 165,
        width: 500,
        text: subtitle,
        fontSize: 16,
        color: "#4b5563",
        align: "center",
        letterSpacing: 6,
        role: "static",
      }),
      textEl({
        id: "given-to",
        ax: 561,
        ay: 240,
        width: 420,
        text: "This Certificate is given to:",
        fontSize: 15,
        color: "#374151",
        align: "center",
        role: "static",
      }),
      textEl({
        id: "participant-name",
        ax: 561,
        ay: 310,
        width: 520,
        text: "Participant Name",
        fontSize: 36,
        color: "#b8860b",
        align: "center",
        bold: true,
        fontStyle: "script",
        role: "participantName",
      }),
      {
        id: "name-line",
        type: "line",
        x: 320,
        y: 330,
        width: 480,
        height: 0,
        stroke: "#d4af37",
        strokeWidth: 1.5,
      },
      textEl({
        id: "body",
        ax: 561,
        ay: 390,
        width: 680,
        height: 56,
        text: "has successfully completed a professional training program. Their dedication and commitment to the learning process are truly commendable.",
        fontSize: 14,
        color: "#4b5563",
        align: "center",
        role: "static",
      }),
      textEl({
        id: "event-name",
        ax: 561,
        ay: 450,
        width: 500,
        text: "Event Name",
        fontSize: 18,
        color: "#111827",
        align: "center",
        bold: true,
        role: "eventName",
      }),
      {
        id: "seal-center",
        type: "icon",
        iconId: "seal-gold",
        x: 521,
        y: 500,
        width: 80,
        height: 80,
      },
      {
        id: "sig-line-left",
        type: "line",
        x: 160,
        y: 640,
        width: 220,
        height: 0,
        stroke: "#9ca3af",
        strokeWidth: 1,
      },
      textEl({
        id: "sig-left-name",
        ax: 270,
        ay: 665,
        width: 220,
        text: "Program Director",
        fontSize: 12,
        color: "#374151",
        align: "center",
        bold: true,
        role: "static",
      }),
      textEl({
        id: "signature",
        ax: 860,
        ay: 615,
        width: 260,
        text: "D. Gallego",
        fontSize: 28,
        color: "#111827",
        align: "center",
        fontStyle: "script",
        role: "signature",
      }),
      {
        id: "sig-line-right",
        type: "line",
        x: 740,
        y: 640,
        width: 240,
        height: 0,
        stroke: "#111827",
        strokeWidth: 1.5,
      },
      textEl({
        id: "md-name",
        ax: 860,
        ay: 665,
        width: 260,
        text: "DANIEL GALLEGO",
        fontSize: 13,
        color: "#111827",
        align: "center",
        bold: true,
        role: "signatoryName",
      }),
      textEl({
        id: "md-title",
        ax: 860,
        ay: 685,
        width: 260,
        text: "MD / CEO",
        fontSize: 11,
        color: "#6b7280",
        align: "center",
        role: "signatoryTitle",
      }),
      textEl({
        id: "date",
        ax: 561,
        ay: 730,
        width: 200,
        text: "Date",
        fontSize: 12,
        color: "#6b7280",
        align: "center",
        role: "date",
      }),
    ]),
  );
}

export function createAppreciationDesign(): CertificateDesign {
  return normalizeDesign(
    baseMeta([
      {
        id: "border",
        type: "rect",
        x: 36,
        y: 36,
        width: 1051,
        height: 722,
        stroke: "#c9a227",
        strokeWidth: 8,
        fill: "transparent",
      },
      {
        id: "swoosh-black",
        type: "path",
        x: 0,
        y: 0,
        width: 300,
        height: 794,
        path: "M0,0 L220,0 C280,180 180,420 260,794 L0,794 Z",
        fill: "#111111",
      },
      {
        id: "swoosh-gold",
        type: "path",
        x: 0,
        y: 0,
        width: 320,
        height: 794,
        path: "M180,0 C260,160 200,400 300,794 L220,794 C140,420 240,180 180,0 Z",
        fill: "#c9a227",
      },
      {
        id: "seal-left",
        type: "icon",
        iconId: "seal-ribbon",
        x: 70,
        y: 70,
        width: 120,
        height: 140,
      },
      textEl({
        id: "org",
        ax: 980,
        ay: 70,
        width: 220,
        text: "YOUR ORGANIZATION",
        fontSize: 11,
        color: "#111827",
        align: "right",
        bold: true,
        role: "organizationName",
      }),
      textEl({
        id: "title",
        ax: 620,
        ay: 160,
        width: 560,
        text: "CERTIFICATE",
        fontSize: 48,
        color: "#111111",
        align: "center",
        bold: true,
        fontStyle: "serif",
        role: "static",
      }),
      textEl({
        id: "subtitle",
        ax: 620,
        ay: 210,
        width: 420,
        text: "OF APPRECIATION",
        fontSize: 18,
        color: "#374151",
        align: "center",
        letterSpacing: 4,
        role: "static",
      }),
      textEl({
        id: "presented",
        ax: 620,
        ay: 280,
        width: 520,
        text: "THIS CERTIFICATE IS PRESENTED TO",
        fontSize: 13,
        color: "#111827",
        align: "center",
        bold: true,
        letterSpacing: 2,
        role: "static",
      }),
      textEl({
        id: "participant-name",
        ax: 620,
        ay: 350,
        width: 520,
        text: "Participant Name",
        fontSize: 42,
        color: "#c9a227",
        align: "center",
        fontStyle: "script",
        role: "participantName",
      }),
      {
        id: "name-line",
        type: "line",
        x: 400,
        y: 370,
        width: 440,
        height: 0,
        stroke: "#c9a227",
        strokeWidth: 1.5,
      },
      textEl({
        id: "body",
        ax: 620,
        ay: 430,
        width: 520,
        height: 50,
        text: "In recognition of outstanding achievements that significantly benefited the organization.",
        fontSize: 13,
        color: "#374151",
        align: "left",
        role: "static",
      }),
      textEl({
        id: "event-name",
        ax: 620,
        ay: 490,
        width: 420,
        text: "Event Name",
        fontSize: 16,
        color: "#111827",
        align: "center",
        bold: true,
        role: "eventName",
      }),
      textEl({
        id: "signature",
        ax: 820,
        ay: 600,
        width: 260,
        text: "D. Gallego",
        fontSize: 30,
        color: "#111111",
        align: "center",
        fontStyle: "script",
        role: "signature",
      }),
      {
        id: "sig-line",
        type: "line",
        x: 700,
        y: 620,
        width: 240,
        height: 0,
        stroke: "#111111",
        strokeWidth: 1.5,
      },
      textEl({
        id: "md-name",
        ax: 820,
        ay: 650,
        width: 260,
        text: "DANIEL GALLEGO",
        fontSize: 13,
        color: "#111111",
        align: "center",
        bold: true,
        role: "signatoryName",
      }),
      textEl({
        id: "md-title",
        ax: 820,
        ay: 672,
        width: 260,
        text: "MD / CEO",
        fontSize: 11,
        color: "#4b5563",
        align: "center",
        role: "signatoryTitle",
      }),
      textEl({
        id: "date",
        ax: 420,
        ay: 720,
        width: 160,
        text: "Date",
        fontSize: 12,
        color: "#6b7280",
        align: "left",
        role: "date",
      }),
    ]),
  );
}

export function createAchievementDesign(): CertificateDesign {
  return normalizeDesign(
    baseMeta([
      {
        id: "border-outer",
        type: "rect",
        x: 24,
        y: 24,
        width: 1075,
        height: 746,
        stroke: "#111827",
        strokeWidth: 2,
        fill: "transparent",
      },
      {
        id: "border-gold",
        type: "rect",
        x: 36,
        y: 36,
        width: 1051,
        height: 722,
        stroke: "#d4af37",
        strokeWidth: 4,
        fill: "transparent",
      },
      {
        id: "corner-tl",
        type: "icon",
        iconId: "corner-flourish",
        x: 48,
        y: 48,
        width: 90,
        height: 90,
      },
      {
        id: "corner-tr",
        type: "icon",
        iconId: "corner-flourish",
        x: 985,
        y: 48,
        width: 90,
        height: 90,
      },
      {
        id: "wreath-top",
        type: "icon",
        iconId: "wreath-gold",
        x: 501,
        y: 70,
        width: 120,
        height: 120,
      },
      textEl({
        id: "title",
        ax: 561,
        ay: 220,
        width: 700,
        text: "CERTIFICATE",
        fontSize: 44,
        color: "#111827",
        align: "center",
        bold: true,
        fontStyle: "serif",
        role: "static",
      }),
      textEl({
        id: "subtitle",
        ax: 561,
        ay: 265,
        width: 420,
        text: "OF ACHIEVEMENT",
        fontSize: 16,
        color: "#b8860b",
        align: "center",
        letterSpacing: 5,
        role: "static",
      }),
      textEl({
        id: "presented",
        ax: 561,
        ay: 320,
        width: 320,
        text: "Proudly awarded to",
        fontSize: 14,
        color: "#4b5563",
        align: "center",
        role: "static",
      }),
      textEl({
        id: "participant-name",
        ax: 561,
        ay: 380,
        width: 520,
        text: "Participant Name",
        fontSize: 38,
        color: "#111827",
        align: "center",
        fontStyle: "script",
        role: "participantName",
      }),
      {
        id: "name-line",
        type: "line",
        x: 340,
        y: 400,
        width: 440,
        height: 0,
        stroke: "#d4af37",
        strokeWidth: 1,
      },
      textEl({
        id: "body",
        ax: 561,
        ay: 450,
        width: 640,
        height: 48,
        text: "for outstanding performance and dedication demonstrated throughout the program.",
        fontSize: 14,
        color: "#4b5563",
        align: "center",
        role: "static",
      }),
      textEl({
        id: "event-name",
        ax: 561,
        ay: 510,
        width: 500,
        text: "Event Name",
        fontSize: 17,
        color: "#111827",
        align: "center",
        bold: true,
        role: "eventName",
      }),
      {
        id: "medal",
        type: "icon",
        iconId: "medal-gold",
        x: 531,
        y: 540,
        width: 60,
        height: 70,
      },
      textEl({
        id: "signature",
        ax: 860,
        ay: 640,
        width: 260,
        text: "D. Gallego",
        fontSize: 26,
        color: "#111827",
        align: "center",
        fontStyle: "script",
        role: "signature",
      }),
      {
        id: "sig-line",
        type: "line",
        x: 740,
        y: 658,
        width: 240,
        height: 0,
        stroke: "#111827",
        strokeWidth: 1.5,
      },
      textEl({
        id: "md-name",
        ax: 860,
        ay: 682,
        width: 260,
        text: "DANIEL GALLEGO",
        fontSize: 12,
        color: "#111827",
        align: "center",
        bold: true,
        role: "signatoryName",
      }),
      textEl({
        id: "md-title",
        ax: 860,
        ay: 702,
        width: 280,
        text: "MD / Managing Director",
        fontSize: 11,
        color: "#6b7280",
        align: "center",
        role: "signatoryTitle",
      }),
      textEl({
        id: "date",
        ax: 200,
        ay: 690,
        width: 160,
        text: "Date",
        fontSize: 12,
        color: "#6b7280",
        align: "center",
        role: "date",
      }),
    ]),
  );
}

export function createParticipationDesign(): CertificateDesign {
  return normalizeDesign(
    baseMeta(
      [
        {
          id: "accent-bar",
          type: "rect",
          x: 0,
          y: 0,
          width: 1123,
          height: 18,
          fill: "#0f766e",
        },
        {
          id: "accent-bar-bottom",
          type: "rect",
          x: 0,
          y: 776,
          width: 1123,
          height: 18,
          fill: "#0f766e",
        },
        textEl({
          id: "title",
          ax: 561,
          ay: 120,
          width: 700,
          text: "CERTIFICATE",
          fontSize: 46,
          color: "#0f766e",
          align: "center",
          bold: true,
          fontStyle: "serif",
          role: "static",
        }),
        textEl({
          id: "subtitle",
          ax: 561,
          ay: 170,
          width: 420,
          text: "OF PARTICIPATION",
          fontSize: 16,
          color: "#374151",
          align: "center",
          letterSpacing: 5,
          role: "static",
        }),
        {
          id: "laurel",
          type: "icon",
          iconId: "laurel-pair",
          x: 461,
          y: 200,
          width: 200,
          height: 50,
        },
        textEl({
          id: "given-to",
          ax: 561,
          ay: 280,
          width: 360,
          text: "This is to certify that",
          fontSize: 15,
          color: "#4b5563",
          align: "center",
          role: "static",
        }),
        textEl({
          id: "participant-name",
          ax: 561,
          ay: 350,
          width: 520,
          text: "Participant Name",
          fontSize: 36,
          color: "#0f766e",
          align: "center",
          bold: true,
          role: "participantName",
        }),
        textEl({
          id: "body",
          ax: 561,
          ay: 420,
          width: 680,
          height: 48,
          text: "has successfully participated in the program and demonstrated valuable engagement.",
          fontSize: 14,
          color: "#4b5563",
          align: "center",
          role: "static",
        }),
        textEl({
          id: "event-name",
          ax: 561,
          ay: 480,
          width: 500,
          text: "Event Name",
          fontSize: 18,
          color: "#111827",
          align: "center",
          bold: true,
          role: "eventName",
        }),
        textEl({
          id: "signature",
          ax: 860,
          ay: 620,
          width: 260,
          text: "D. Gallego",
          fontSize: 28,
          color: "#111827",
          align: "center",
          fontStyle: "script",
          role: "signature",
        }),
        {
          id: "sig-line",
          type: "line",
          x: 740,
          y: 640,
          width: 240,
          height: 0,
          stroke: "#0f766e",
          strokeWidth: 1.5,
        },
        textEl({
          id: "md-name",
          ax: 860,
          ay: 665,
          width: 260,
          text: "DANIEL GALLEGO",
          fontSize: 12,
          color: "#111827",
          align: "center",
          bold: true,
          role: "signatoryName",
        }),
        textEl({
          id: "md-title",
          ax: 860,
          ay: 685,
          width: 260,
          text: "MD / Director",
          fontSize: 11,
          color: "#6b7280",
          align: "center",
          role: "signatoryTitle",
        }),
        textEl({
          id: "date",
          ax: 220,
          ay: 665,
          width: 160,
          text: "Date",
          fontSize: 12,
          color: "#6b7280",
          align: "center",
          role: "date",
        }),
      ],
      "#f8fafc",
    ),
  );
}

export type OrgBranding = {
  logo?: string | null;
  signatureUrl?: string | null;
  signatoryName?: string | null;
  signatoryDesignation?: string | null;
  organizationName?: string | null;
};

/**
 * Inject org logo / signature / signer into a design.
 * Elements use stable ids so they stay optional & deletable.
 * - force=false: only add missing pieces, update signer text if present
 * - force=true: re-apply branding (used by “Apply organization branding”)
 */
export function applyOrgBrandingToDesign(
  design: CertificateDesign,
  org: OrgBranding | null | undefined,
  options?: { force?: boolean },
): CertificateDesign {
  if (!org) return normalizeDesign(design);

  const force = options?.force ?? false;
  let elements = [...design.elements];

  const logo = org.logo?.trim();
  if (logo) {
    const exists = elements.some((e) => e.id === "org-logo");
    if (!exists || force) {
      elements = elements.filter((e) => e.id !== "org-logo");
      const logoW = 64;
      const logoH = 48;
      elements.push({
        id: "org-logo",
        type: "image",
        src: logo,
        x: Math.round(design.width / 2 - logoW / 2),
        y: 32,
        width: logoW,
        height: logoH,
      });
      // Keep organization name centered under the logo (not on the right).
      elements = elements.map((e) => {
        if (e.type !== "text" || e.role !== "organizationName") return e;
        const width = e.width ?? 420;
        return {
          ...e,
          x: Math.round(design.width / 2 - width / 2),
          y: Math.max(e.y ?? 0, 88),
          align: "center" as const,
        };
      });
    }
  }

  const signatureUrl = org.signatureUrl?.trim();
  if (signatureUrl) {
    const exists = elements.some((e) => e.id === "org-signature-image");
    if (!exists || force) {
      const textSig = elements.find(
        (e) => e.type === "text" && e.role === "signature",
      );
      elements = elements.filter(
        (e) =>
          e.id !== "org-signature-image" &&
          !(e.type === "text" && e.role === "signature"),
      );
      elements.push({
        id: "org-signature-image",
        type: "image",
        role: "signature",
        src: signatureUrl,
        x: textSig?.x ?? 740,
        y: textSig?.y ?? 560,
        width: textSig?.width ?? 220,
        height: 72,
      });
    }
  }

  const signerName = org.signatoryName?.trim();
  if (signerName) {
    const existing = elements.find((e) => e.role === "signatoryName");
    if (existing) {
      elements = elements.map((e) =>
        e.role === "signatoryName"
          ? { ...e, text: signerName.toUpperCase() }
          : e,
      );
    } else if (force || !elements.some((e) => e.id === "md-name")) {
      elements.push({
        id: "md-name",
        type: "text",
        x: 730,
        y: 648,
        width: 260,
        height: 22,
        text: signerName.toUpperCase(),
        fontSize: 13,
        color: "#111827",
        align: "center",
        bold: true,
        role: "signatoryName",
      });
    }
  }

  const designation = org.signatoryDesignation?.trim();
  if (designation) {
    const existing = elements.find((e) => e.role === "signatoryTitle");
    if (existing) {
      elements = elements.map((e) =>
        e.role === "signatoryTitle" ? { ...e, text: designation } : e,
      );
    } else if (force || !elements.some((e) => e.id === "md-title")) {
      elements.push({
        id: "md-title",
        type: "text",
        x: 730,
        y: 672,
        width: 260,
        height: 20,
        text: designation,
        fontSize: 11,
        color: "#6b7280",
        align: "center",
        role: "signatoryTitle",
      });
    }
  }

  const orgName = org.organizationName?.trim();
  if (orgName) {
    const existing = elements.find((e) => e.role === "organizationName");
    if (existing) {
      elements = elements.map((e) =>
        e.role === "organizationName"
          ? { ...e, text: orgName.toUpperCase() }
          : e,
      );
    }
  }

  return normalizeDesign({ ...design, elements });
}

export type DesignIconDef = {
  id: string;
  label: string;
  category: "seals" | "wreaths" | "medals" | "corners" | "shapes";
  defaultWidth: number;
  defaultHeight: number;
};

export const DESIGN_ICONS: DesignIconDef[] = [
  { id: "seal-gold", label: "Gold seal", category: "seals", defaultWidth: 90, defaultHeight: 90 },
  { id: "seal-ribbon", label: "Seal + ribbon", category: "seals", defaultWidth: 100, defaultHeight: 120 },
  { id: "seal-red", label: "Red ribbon seal", category: "seals", defaultWidth: 90, defaultHeight: 110 },
  { id: "wreath-gold", label: "Gold wreath", category: "wreaths", defaultWidth: 110, defaultHeight: 110 },
  { id: "wreath-black", label: "Black wreath", category: "wreaths", defaultWidth: 110, defaultHeight: 110 },
  { id: "laurel-pair", label: "Laurel branches", category: "wreaths", defaultWidth: 200, defaultHeight: 50 },
  { id: "medal-gold", label: "Gold medal", category: "medals", defaultWidth: 60, defaultHeight: 80 },
  { id: "trophy-wreath", label: "Trophy wreath", category: "medals", defaultWidth: 100, defaultHeight: 100 },
  { id: "shield-wreath", label: "Shield emblem", category: "medals", defaultWidth: 90, defaultHeight: 100 },
  { id: "corner-flourish", label: "Corner ornament", category: "corners", defaultWidth: 90, defaultHeight: 90 },
];

import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { TryDemoButton } from "@/components/try-demo-button";
import {
  BrandingMock,
  CertificateMock,
  CertificatesTableMock,
  DesignerMock,
  RegisterMock,
  ResultsMock,
  VerifyMock,
} from "@/components/demo-mockups";

export const metadata: Metadata = {
  title: "Product tour · CertiFlow",
  description:
    "CertiFlow: design, issue and verify digital certificates for workshops, seminars and school sports meets.",
};

type IconName =
  | "arrow"
  | "award"
  | "building"
  | "check"
  | "download"
  | "link"
  | "pen"
  | "qr"
  | "shield"
  | "trophy"
  | "users";

const ICON_PATHS: Record<IconName, ReactNode> = {
  arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
  award: (
    <>
      <circle cx="12" cy="9" r="6" />
      <path d="M8.5 14 7 22l5-3 5 3-1.5-8" />
    </>
  ),
  building: (
    <path d="M4 21V5a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v16M15 9h4a1 1 0 0 1 1 1v11M3 21h18M8 8h3M8 12h3M8 16h3" />
  ),
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  download: <path d="M12 4v11M7 10l5 5 5-5M5 20h14" />,
  link: (
    <path d="M10 13a5 5 0 0 0 7.07 0l3-3a5 5 0 0 0-7.07-7.07l-1.5 1.5M14 11a5 5 0 0 0-7.07 0l-3 3a5 5 0 0 0 7.07 7.07l1.5-1.5" />
  ),
  pen: <path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />,
  qr: (
    <path d="M4 4h6v6H4ZM14 4h6v6h-6ZM4 14h6v6H4ZM14 14h2v2h-2ZM18 14h2M14 18h2M18 18h2v2h-2Z" />
  ),
  shield: <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6ZM9 12l2 2 4-4" />,
  trophy: (
    <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0ZM17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3" />
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M21.5 20a6.5 6.5 0 0 0-4-6" />
    </>
  ),
};

function Icon({ name, className = "size-5" }: { name: IconName; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      {ICON_PATHS[name]}
    </svg>
  );
}

function CheckItem({ children }: { children: ReactNode }) {
  return (
    <li className="flex gap-2">
      <Icon name="check" className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
      <span>{children}</span>
    </li>
  );
}

const STATS = [
  { value: "2", label: "Event types: workshops & sports meets" },
  { value: "1st–3rd", label: "Places per game, ties allowed" },
  { value: "QR", label: "Verification on every certificate" },
  { value: "PDF + Excel", label: "Exports for participants & certificates" },
];

const STEPS: { icon: IconName; title: string; description: string }[] = [
  {
    icon: "building",
    title: "Create your organization",
    description: "Sign up in a minute with your school or company name and an admin account.",
  },
  {
    icon: "pen",
    title: "Design a certificate",
    description: "Drag in text, seals, medals and signatures in the visual designer and preview the PDF.",
  },
  {
    icon: "link",
    title: "Share the registration link",
    description: "Every event gets its own public link. Share it on WhatsApp, email or a projected QR code.",
  },
  {
    icon: "award",
    title: "Certificates issue themselves",
    description: "Participants get their PDF the moment they register, or when sports results are entered.",
  },
];

const MODES: { icon: IconName; title: string; summary: string; points: string[] }[] = [
  {
    icon: "users",
    title: "Workshops & seminars",
    summary: "One certificate per participant, issued instantly.",
    points: [
      "Public registration form for each event",
      "PDF certificate generated on submit",
      "Bulk import participants from CSV",
      "Open or close registration any time",
    ],
  },
  {
    icon: "trophy",
    title: "School sports meets",
    summary: "One event, many games, 1st / 2nd / 3rd certificates.",
    points: [
      "Add every game: 100m relay, long jump, chess…",
      "Record 1st, 2nd and 3rd place, with ties",
      "Team or house names printed on the certificate",
      "Edit a result and the certificate is regenerated",
    ],
  },
];

const FEATURES: {
  icon: IconName;
  eyebrow: string;
  title: string;
  description: string;
  points: string[];
  visual: ReactNode;
}[] = [
  {
    icon: "pen",
    eyebrow: "Certificate designer",
    title: "Design certificates like a canvas, not a form",
    description:
      "A drag-and-drop editor built for certificates. Start from a template, move and resize anything, and placeholders like the participant's name, event and place fill in automatically.",
    points: [
      "Drag, resize and rotate elements",
      "Seals, wreaths, medals and corners",
      "Undo, redo, layers and lock",
      "Upload seals with background removal",
      "Live PDF preview before saving",
      "Works on tablets and phones",
    ],
    visual: <DesignerMock />,
  },
  {
    icon: "link",
    eyebrow: "Registration",
    title: "Participants register and download in one step",
    description:
      "No accounts for participants. They open the event link, enter their name and email, and get a PDF certificate with a unique number straight away.",
    points: [
      "One public link per event",
      "Duplicate email protection",
      "Instant PDF download",
      "Mobile-friendly form",
    ],
    visual: <RegisterMock />,
  },
  {
    icon: "trophy",
    eyebrow: "Sports meets",
    title: "Every game, every winner, every certificate",
    description:
      "Run a whole sports day as one event. Add games, record the top three in each, and CertiFlow issues a placement certificate for every winner, even when two athletes tie.",
    points: [
      "Unlimited games per event",
      "Ties for any place",
      "Import results from CSV",
      "Edits regenerate the PDF, same number",
    ],
    visual: <ResultsMock />,
  },
  {
    icon: "qr",
    eyebrow: "Verification",
    title: "Anyone can check a certificate is real",
    description:
      "Each PDF carries a QR code and certificate number. Scanning it opens a public verification page showing who it was issued to, by whom, and whether it is still valid.",
    points: [
      "QR code printed on every certificate",
      "Unguessable verification links",
      "Lookup by certificate number",
      "Revoked certificates flagged instantly",
    ],
    visual: <VerifyMock />,
  },
  {
    icon: "download",
    eyebrow: "Certificate management",
    title: "Fix mistakes without reissuing from scratch",
    description:
      "Admins can correct a misspelled name or a wrong place after issue. The PDF is rebuilt with the same certificate number, so any QR codes already shared keep working.",
    points: [
      "Edit name, email, place and team",
      "Revoke and restore",
      "Search and filter",
      "Export to Excel or PDF",
    ],
    visual: <CertificatesTableMock />,
  },
  {
    icon: "building",
    eyebrow: "Branding",
    title: "Your logo and signature on every certificate",
    description:
      "Set your organization's logo, signatory and signature once. Every template picks them up automatically, so certificates always look official.",
    points: [
      "Organization logo",
      "Signatory name and designation",
      "Signature upload",
      "Light and dark admin theme",
    ],
    visual: <BrandingMock />,
  },
];

const SECURITY = [
  "New organizations are reviewed before they can issue certificates",
  "Demo certificates are watermarked and never verify as valid",
  "Rate limits on sign-in, sign-up and public registration",
  "Passwords hashed with bcrypt",
  "Short-lived JWT access tokens with refresh tokens",
  "Admin and staff roles checked on every API request",
  "Each organization only ever sees its own data",
  "Random verification tokens that can't be guessed",
  "Revocation shows up on the verify page immediately",
];

const STACK = [
  "Next.js 16",
  "React 19",
  "TypeScript",
  "Tailwind CSS 4",
  "NestJS",
  "Prisma",
  "PostgreSQL",
  "PDFKit & pdf-lib",
  "Neon",
  "Render",
  "Vercel",
];

const navLink =
  "hidden rounded-full px-3 py-2 text-sm font-medium text-muted transition hover:bg-surface-muted hover:text-foreground md:inline-flex";
const primaryButton =
  "inline-flex items-center gap-2 rounded-full bg-teal-300 px-5 py-3 text-sm font-semibold text-teal-950 transition hover:bg-teal-200";
const ghostButton =
  "inline-flex items-center gap-2 rounded-full border border-white/25 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10";

export default function DemoPage() {
  return (
    <div className="flex flex-1 flex-col bg-background">
      <header className="sticky top-0 z-30 border-b border-border/80 bg-surface/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2 text-lg font-semibold tracking-tight text-foreground">
            <span className="flex size-8 items-center justify-center rounded-lg bg-accent text-accent-foreground">
              <Icon name="award" className="size-4" />
            </span>
            CertiFlow
          </Link>
          <nav className="flex items-center gap-1 sm:gap-2">
            <a href="#how" className={navLink}>
              How it works
            </a>
            <a href="#features" className={navLink}>
              Features
            </a>
            <a href="#stack" className={navLink}>
              Tech stack
            </a>
            <ThemeToggle />
            <Link
              href="/login"
              className="inline-flex h-10 items-center rounded-full border border-border bg-surface px-4 text-sm font-medium text-foreground transition hover:bg-surface-muted"
            >
              Sign in
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <section className="relative overflow-hidden bg-[#0a1b20] text-white">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(circle at 15% 20%, rgba(45,212,191,0.22), transparent 45%), radial-gradient(circle at 85% 80%, rgba(251,191,36,0.12), transparent 40%)",
            }}
          />
          <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 py-14 sm:px-6 lg:grid-cols-[1fr_1.1fr] lg:py-24">
            <div className="space-y-6">
              <p className="inline-flex rounded-full border border-white/20 px-3 py-1 text-xs font-medium text-white/80">
                Digital certificate platform
              </p>
              <h1 className="text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
                Design, issue and verify certificates in minutes.
              </h1>
              <p className="max-w-xl text-base text-white/75 sm:text-lg">
                CertiFlow turns a registration link into a finished, QR-verified PDF certificate. It handles
                workshops and seminars, and full school sports meets with 1st, 2nd and 3rd place across every game.
              </p>
              <div className="flex flex-wrap gap-3">
                <TryDemoButton className={primaryButton}>
                  Try the live demo
                  <Icon name="arrow" className="size-4" />
                </TryDemoButton>
                <a href="#features" className={ghostButton}>
                  Explore the features
                </a>
              </div>
              <p className="text-sm text-white/60">
                No signup needed. The demo is a shared sandbox: certificates are
                watermarked samples and data resets every day.
              </p>
            </div>
            <div className="relative mx-auto w-full max-w-xl">
              <div className="absolute -inset-4 rotate-2 rounded-2xl bg-teal-300/10" aria-hidden />
              <div className="relative">
                <CertificateMock />
              </div>
            </div>
          </div>
        </section>

        <section className="border-b border-border bg-surface">
          <dl className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-4 py-10 sm:px-6 md:grid-cols-4">
            {STATS.map((stat) => (
              <div key={stat.label} className="text-center">
                <dt className="sr-only">{stat.label}</dt>
                <dd className="text-2xl font-semibold tracking-tight text-accent sm:text-3xl">{stat.value}</dd>
                <dd className="mt-1 text-xs text-muted sm:text-sm">{stat.label}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section id="how" className="mx-auto max-w-6xl scroll-mt-16 px-4 py-16 sm:px-6 sm:py-20">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-semibold tracking-tight text-foreground">How it works</h2>
            <p className="mt-3 text-muted">From sign-up to a verified certificate in four steps.</p>
          </div>
          <ol className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((step, index) => (
              <li key={step.title} className="relative rounded-2xl border border-border bg-surface p-6 shadow-sm">
                <span className="absolute right-5 top-5 font-mono text-xs text-muted">0{index + 1}</span>
                <div className="flex size-10 items-center justify-center rounded-xl bg-accent/15 text-accent">
                  <Icon name={step.icon} />
                </div>
                <h3 className="mt-4 font-semibold text-foreground">{step.title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted">{step.description}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="border-y border-border bg-surface-muted/40 py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-semibold tracking-tight text-foreground">Two kinds of events</h2>
              <p className="mt-3 text-muted">Pick the event type and CertiFlow handles the rest.</p>
            </div>
            <div className="mt-12 grid gap-6 md:grid-cols-2">
              {MODES.map((mode) => (
                <div key={mode.title} className="rounded-2xl border border-border bg-surface p-6 sm:p-8">
                  <div className="flex size-11 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                    <Icon name={mode.icon} />
                  </div>
                  <h3 className="mt-4 text-xl font-semibold text-foreground">{mode.title}</h3>
                  <p className="mt-1 text-sm text-muted">{mode.summary}</p>
                  <ul className="mt-5 space-y-2 text-sm text-foreground">
                    {mode.points.map((point) => (
                      <CheckItem key={point}>{point}</CheckItem>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="features" className="scroll-mt-16 py-16 sm:py-24">
          <div className="mx-auto max-w-6xl space-y-20 px-4 sm:space-y-28 sm:px-6">
            {FEATURES.map((feature, index) => (
              <div key={feature.eyebrow} className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
                <div className={`space-y-5 ${index % 2 === 1 ? "lg:order-last" : ""}`}>
                  <p className="inline-flex items-center gap-2 text-sm font-semibold text-accent">
                    <Icon name={feature.icon} className="size-4" />
                    {feature.eyebrow}
                  </p>
                  <h3 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                    {feature.title}
                  </h3>
                  <p className="leading-7 text-muted">{feature.description}</p>
                  <ul className="grid gap-2 text-sm text-foreground sm:grid-cols-2">
                    {feature.points.map((point) => (
                      <CheckItem key={point}>{point}</CheckItem>
                    ))}
                  </ul>
                </div>
                <div className="min-w-0">{feature.visual}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="border-y border-border bg-surface-muted/40">
          <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-2 lg:gap-16">
            <div className="space-y-5">
              <p className="inline-flex items-center gap-2 text-sm font-semibold text-accent">
                <Icon name="shield" className="size-4" />
                Security
              </p>
              <h3 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                Certificates people can trust
              </h3>
              <p className="leading-7 text-muted">
                A certificate is only worth something if it can&apos;t be faked. CertiFlow locks down who can issue
                and edit, and lets anyone check authenticity in one scan.
              </p>
              <ul className="space-y-2 text-sm text-foreground">
                {SECURITY.map((point) => (
                  <CheckItem key={point}>{point}</CheckItem>
                ))}
              </ul>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                { icon: "shield" as const, title: "Role-based access", text: "Admins manage everything; staff help run events." },
                { icon: "building" as const, title: "Approved issuers only", text: "Every new organization is reviewed before its certificates can verify." },
                { icon: "qr" as const, title: "Public verification", text: "A QR scan confirms the certificate without logging in." },
                { icon: "award" as const, title: "Stable numbers", text: "Edits keep the certificate number, so shared links never break." },
              ].map((card) => (
                <div key={card.title} className="rounded-2xl border border-border bg-surface p-5">
                  <div className="flex size-9 items-center justify-center rounded-lg bg-accent/15 text-accent">
                    <Icon name={card.icon} className="size-4" />
                  </div>
                  <p className="mt-3 font-semibold text-foreground">{card.title}</p>
                  <p className="mt-1 text-sm text-muted">{card.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="stack" className="scroll-mt-16 py-16 sm:py-20">
          <div className="mx-auto max-w-4xl px-4 text-center sm:px-6">
            <h2 className="text-3xl font-semibold tracking-tight text-foreground">Tech stack</h2>
            <p className="mt-3 text-muted">
              A TypeScript monorepo with a Next.js frontend, a NestJS API and PostgreSQL, deployed on Vercel,
              Render and Neon.
            </p>
            <ul className="mt-8 flex flex-wrap justify-center gap-2">
              {STACK.map((item) => (
                <li
                  key={item}
                  className="rounded-full border border-border bg-surface px-4 py-1.5 text-sm font-medium text-foreground"
                >
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </section>
      </main>

      <footer className="bg-[#0a1b20] text-white">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 px-4 py-14 text-center sm:px-6">
          <span className="flex size-12 items-center justify-center rounded-xl bg-teal-300 text-teal-950">
            <Icon name="award" className="size-6" />
          </span>
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">See it working in one click</h2>
          <p className="max-w-lg text-white/75">
            Open the live demo to design, issue and verify sample certificates. Running a real school or
            company? Request access and your organization is reviewed before it can issue certificates.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <TryDemoButton className={primaryButton}>
              Try the live demo
              <Icon name="arrow" className="size-4" />
            </TryDemoButton>
            <Link href="/signup" className={ghostButton}>
              Request access
            </Link>
          </div>
          <p className="text-sm text-white/50">© {new Date().getFullYear()} CertiFlow · Digital certificates</p>
        </div>
      </footer>
    </div>
  );
}

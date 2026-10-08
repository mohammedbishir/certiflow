import type { ReactNode } from "react";

const QR_PATTERN = [
  "1110111",
  "1010101",
  "1110011",
  "0001100",
  "1101011",
  "1011101",
  "1110110",
];

export function BrowserFrame({
  children,
  label,
}: {
  children: ReactNode;
  label?: string;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-xl shadow-black/10">
      <div className="flex items-center gap-1.5 border-b border-border bg-surface-muted/70 px-3 py-2">
        <span className="size-2.5 rounded-full bg-red-400/80" />
        <span className="size-2.5 rounded-full bg-amber-400/80" />
        <span className="size-2.5 rounded-full bg-emerald-400/80" />
        {label ? (
          <span className="ml-3 truncate rounded-md bg-surface px-2 py-0.5 font-mono text-[11px] text-muted">
            {label}
          </span>
        ) : null}
      </div>
      <div className="p-4 sm:p-5">{children}</div>
    </div>
  );
}

function QrBlock({ size = "size-12" }: { size?: string }) {
  return (
    <div className={`grid shrink-0 grid-cols-7 gap-px rounded bg-white p-1 ${size}`}>
      {QR_PATTERN.join("")
        .split("")
        .map((cell, i) => (
          <span key={i} className={cell === "1" ? "bg-slate-900" : "bg-white"} />
        ))}
    </div>
  );
}

export function CertificateMock({ compact = false }: { compact?: boolean }) {
  return (
    <div className="relative aspect-[1.414] w-full rounded-lg bg-white p-[4%] text-slate-900 shadow-2xl shadow-black/30">
      <div className="flex h-full flex-col items-center justify-between rounded border-2 border-teal-700/70 p-[4%] text-center outline outline-1 outline-offset-4 outline-amber-500/60">
        <div>
          <p className="text-[9px] font-semibold uppercase tracking-[0.3em] text-teal-700 sm:text-[10px]">
            Greenfield Public School
          </p>
          <p
            className={`mt-1 font-serif font-semibold tracking-tight ${compact ? "text-base" : "text-lg sm:text-2xl"}`}
          >
            Certificate of Achievement
          </p>
        </div>
        <div>
          <p className="text-[9px] text-slate-500 sm:text-[11px]">This is to certify that</p>
          <p
            className={`font-serif italic text-teal-800 ${compact ? "text-lg" : "text-xl sm:text-3xl"}`}
          >
            Ananya Sharma
          </p>
          <p className="mx-auto mt-1 max-w-[85%] text-[9px] leading-snug text-slate-600 sm:text-[11px]">
            secured <strong className="text-slate-900">1st place</strong> in{" "}
            <strong className="text-slate-900">100m Relay (Men)</strong> at the Annual Sports Meet 2026
          </p>
        </div>
        <div className="flex w-full items-end justify-between gap-2">
          <div className="text-left">
            <p className="font-serif text-xs italic text-slate-700 sm:text-sm">R. Menon</p>
            <div className="mt-0.5 h-px w-16 bg-slate-400 sm:w-20" />
            <p className="mt-0.5 text-[8px] text-slate-500 sm:text-[9px]">Principal</p>
          </div>
          <div className="flex size-9 items-center justify-center rounded-full bg-gradient-to-br from-amber-300 to-amber-600 text-[8px] font-bold text-white shadow ring-2 ring-amber-200 sm:size-12 sm:text-[10px]">
            1st
          </div>
          <div className="flex items-end gap-1.5">
            <p className="hidden font-mono text-[8px] text-slate-500 sm:block">CERT-2026-000128</p>
            <QrBlock size={compact ? "size-8" : "size-9 sm:size-11"} />
          </div>
        </div>
      </div>
    </div>
  );
}

export function DesignerMock() {
  const tabs = ["Templates", "Elements", "Text", "Advanced"];
  return (
    <BrowserFrame label="/templates/designer">
      <div className="grid grid-cols-[44px_1fr] gap-3 sm:grid-cols-[52px_120px_1fr]">
        <div className="flex flex-col gap-1.5">
          {tabs.map((tab, i) => (
            <div
              key={tab}
              className={`flex flex-col items-center gap-1 rounded-lg py-2 text-[8px] font-medium ${
                i === 1 ? "bg-accent/15 text-accent" : "text-muted"
              }`}
            >
              <span className="size-3 rounded-sm bg-current opacity-60" />
              {tab}
            </div>
          ))}
        </div>
        <div className="hidden flex-col gap-2 sm:flex">
          <p className="text-[10px] font-semibold text-foreground">Elements</p>
          <div className="grid grid-cols-2 gap-1.5">
            {["bg-amber-400", "bg-teal-500", "bg-rose-400", "bg-indigo-400", "bg-amber-600", "bg-emerald-500"].map(
              (color) => (
                <div
                  key={color}
                  className="flex aspect-square items-center justify-center rounded-lg border border-border bg-surface-muted"
                >
                  <span className={`size-5 rounded-full ${color}`} />
                </div>
              ),
            )}
          </div>
          <div className="rounded-lg border border-dashed border-border p-2 text-center text-[9px] text-muted">
            Upload seal / signature
          </div>
        </div>
        <div className="relative flex items-center justify-center rounded-xl bg-surface-muted/70 p-3">
          <div className="relative w-full max-w-[300px]">
            <CertificateMock compact />
            <div className="pointer-events-none absolute left-[22%] top-[42%] h-[16%] w-[56%] rounded-sm border-2 border-accent">
              {["-left-1 -top-1", "-right-1 -top-1", "-left-1 -bottom-1", "-right-1 -bottom-1"].map((pos) => (
                <span
                  key={pos}
                  className={`absolute size-2 rounded-full border-2 border-accent bg-white ${pos}`}
                />
              ))}
              <span className="absolute -top-6 left-1/2 flex -translate-x-1/2 gap-1 rounded-full border border-border bg-surface px-1.5 py-0.5 text-[8px] font-semibold text-foreground shadow">
                <span>Front</span>
                <span className="text-muted">·</span>
                <span>Lock</span>
                <span className="text-muted">·</span>
                <span>Delete</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </BrowserFrame>
  );
}

export function RegisterMock() {
  const fields = [
    ["Full name", "Rahul Verma"],
    ["Email", "rahul@example.com"],
    ["Phone", "+91 98765 43210"],
  ];
  return (
    <BrowserFrame label="/register/k7Pq2x…">
      <div className="mx-auto max-w-sm space-y-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-accent">
            Greenfield Public School
          </p>
          <p className="mt-1 text-lg font-semibold text-foreground">React Workshop 2026</p>
          <p className="text-xs text-muted">Register to receive your certificate instantly.</p>
        </div>
        {fields.map(([label, value]) => (
          <div key={label}>
            <p className="text-[11px] font-medium text-foreground">{label}</p>
            <div className="mt-1 rounded-lg border border-border bg-background px-3 py-2 text-xs text-foreground">
              {value}
            </div>
          </div>
        ))}
        <div className="rounded-full bg-accent py-2 text-center text-xs font-semibold text-accent-foreground">
          Register &amp; get certificate
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-2.5 text-[11px] text-foreground">
          <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
            ✓
          </span>
          <span className="min-w-0">
            Certificate <span className="font-mono">CERT-2026-000129</span> is ready ·{" "}
            <span className="font-semibold text-accent">Download PDF</span>
          </span>
        </div>
      </div>
    </BrowserFrame>
  );
}

const PLACE_STYLES: Record<string, string> = {
  "1st": "bg-amber-400/20 text-amber-700 dark:text-amber-300",
  "2nd": "bg-slate-400/20 text-slate-600 dark:text-slate-300",
  "3rd": "bg-orange-500/20 text-orange-700 dark:text-orange-300",
};

export function ResultsMock() {
  const results = [
    ["1st", "House Blue", "Ananya Sharma", true],
    ["1st", "House Red", "Kiran Rao", true],
    ["2nd", "House Green", "Meera Iyer", true],
    ["3rd", "House Yellow", "Arjun Das", false],
  ] as const;
  return (
    <BrowserFrame label="/events/annual-sports-meet">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-foreground">100m Relay · Men</p>
          <p className="text-[11px] text-muted">Annual Sports Meet 2026 · 12 games</p>
        </div>
        <span className="rounded-full border border-border px-2.5 py-1 text-[10px] font-medium text-muted">
          + Add result
        </span>
      </div>
      <div className="mt-3 divide-y divide-border overflow-hidden rounded-xl border border-border">
        {results.map(([place, team, name, issued], i) => (
          <div key={i} className="flex items-center gap-2 bg-surface px-3 py-2 text-xs">
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${PLACE_STYLES[place]}`}>
              {place}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-foreground">{name}</p>
              <p className="truncate text-[10px] text-muted">{team}</p>
            </div>
            {issued ? (
              <span className="hidden rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-300 sm:inline">
                Certificate issued
              </span>
            ) : (
              <span className="hidden rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-medium text-accent sm:inline">
                Issue
              </span>
            )}
            <span className="rounded-md border border-border px-1.5 py-0.5 text-[10px] text-muted">Edit</span>
          </div>
        ))}
      </div>
      <p className="mt-2 text-[10px] text-muted">Tie for 1st place: both winners get a 1st-place certificate.</p>
    </BrowserFrame>
  );
}

export function VerifyMock() {
  const rows = [
    ["Name", "Ananya Sharma"],
    ["Event", "Annual Sports Meet 2026"],
    ["Award", "1st place · 100m Relay (Men)"],
    ["Issued by", "Greenfield Public School"],
    ["Certificate no.", "CERT-2026-000128"],
  ];
  return (
    <BrowserFrame label="/verify/9f3c…e1a7">
      <div className="flex items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-lg text-white">
          ✓
        </span>
        <div>
          <p className="text-sm font-semibold text-foreground">This certificate is valid</p>
          <p className="text-[11px] text-muted">Verified against the issuing organization&apos;s records</p>
        </div>
      </div>
      <dl className="mt-4 divide-y divide-border rounded-xl border border-border">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between gap-3 px-3 py-2 text-xs">
            <dt className="text-muted">{label}</dt>
            <dd className="text-right font-medium text-foreground">{value}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-3 flex items-center gap-2 rounded-xl border border-danger/30 bg-danger-soft px-3 py-2 text-[11px] text-danger">
        <span className="font-semibold">Revoked certificates</span>
        <span className="text-foreground/70">show a clear warning here instead.</span>
      </div>
    </BrowserFrame>
  );
}

export function CertificatesTableMock() {
  const rows = [
    ["000128", "Ananya Sharma", "1st", "Valid"],
    ["000129", "Kiran Rao", "1st", "Valid"],
    ["000130", "Meera Iyer", "2nd", "Valid"],
    ["000131", "Vikram Nair", "3rd", "Revoked"],
  ];
  return (
    <BrowserFrame label="/events/annual-sports-meet">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-foreground">Certificates · 48</p>
        <div className="flex gap-1.5">
          {["Import CSV", "Excel", "PDF"].map((label) => (
            <span
              key={label}
              className="rounded-full border border-border px-2.5 py-1 text-[10px] font-medium text-foreground"
            >
              {label}
            </span>
          ))}
        </div>
      </div>
      <div className="mt-3 overflow-hidden rounded-xl border border-border">
        <div className="grid grid-cols-[1fr_1.4fr_0.6fr_0.8fr] gap-2 bg-surface-muted px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted">
          <span>Number</span>
          <span>Name</span>
          <span>Place</span>
          <span>Status</span>
        </div>
        {rows.map(([num, name, place, status]) => (
          <div
            key={num}
            className="grid grid-cols-[1fr_1.4fr_0.6fr_0.8fr] items-center gap-2 border-t border-border px-3 py-2 text-xs"
          >
            <span className="truncate font-mono text-[10px] text-muted">{num}</span>
            <span className="truncate font-medium text-foreground">{name}</span>
            <span className="text-foreground">{place}</span>
            <span
              className={`w-fit rounded-full px-2 py-0.5 text-[10px] font-medium ${
                status === "Valid"
                  ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                  : "bg-danger-soft text-danger"
              }`}
            >
              {status}
            </span>
          </div>
        ))}
      </div>
    </BrowserFrame>
  );
}

export function BrandingMock() {
  return (
    <BrowserFrame label="/settings/organization">
      <div className="grid gap-4 sm:grid-cols-[1fr_1.1fr]">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex size-12 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-teal-800 text-sm font-bold text-white">
              GPS
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">Greenfield Public School</p>
              <p className="text-[11px] text-muted">Logo · uploaded</p>
            </div>
          </div>
          {[
            ["Signatory", "R. Menon"],
            ["Designation", "Principal"],
          ].map(([label, value]) => (
            <div key={label}>
              <p className="text-[11px] font-medium text-foreground">{label}</p>
              <div className="mt-1 rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground">
                {value}
              </div>
            </div>
          ))}
          <div className="rounded-lg border border-dashed border-border px-3 py-3 text-center">
            <p className="font-serif text-lg italic text-foreground">R. Menon</p>
            <p className="text-[10px] text-muted">Signature · background removed</p>
          </div>
        </div>
        <div className="flex items-center">
          <CertificateMock compact />
        </div>
      </div>
    </BrowserFrame>
  );
}

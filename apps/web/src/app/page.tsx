import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";

export default function Home() {
  return (
    <div className="page-shell flex flex-1 flex-col">
      <div className="flex items-center justify-between px-6 py-4">
        <p className="text-lg font-semibold tracking-tight text-foreground">
          CertiFlow
        </p>
        <ThemeToggle />
      </div>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-6 pb-20">
        <p className="text-sm font-medium uppercase tracking-[0.18em] text-accent">
          Digital certificates
        </p>
        <h1 className="mt-4 max-w-2xl text-4xl font-semibold tracking-tight text-foreground md:text-5xl">
          CertiFlow
        </h1>
        <p className="mt-4 max-w-xl text-lg leading-8 text-muted">
          Generate, deliver, and verify certificates for workshops, training
          programs, and seminars.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/login"
            className="inline-flex rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-accent-foreground transition hover:opacity-90"
          >
            Admin login
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex rounded-full border border-border bg-surface px-5 py-2.5 text-sm font-medium text-foreground transition hover:bg-surface-muted"
          >
            Open dashboard
          </Link>
        </div>
      </main>
    </div>
  );
}

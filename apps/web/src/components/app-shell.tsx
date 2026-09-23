"use client";

import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";

type AppShellProps = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
};

export function AppShell({ title, subtitle, children, actions }: AppShellProps) {
  return (
    <div className="page-shell flex flex-1 flex-col">
      <header className="border-b border-border/80 bg-surface/80 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-6 py-4">
          <Link href="/dashboard" className="group">
            <p className="text-lg font-semibold tracking-tight text-foreground">
              CertiFlow
            </p>
            <p className="text-xs text-muted group-hover:text-foreground">
              Certificate platform
            </p>
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {actions}
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-6 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-2 max-w-2xl text-muted">{subtitle}</p>
          ) : null}
        </div>
        {children}
      </main>
    </div>
  );
}

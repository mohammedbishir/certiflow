"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/theme-toggle";

type AppShellProps = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
};

export function AppShell({ title, subtitle, children, actions }: AppShellProps) {
  const pathname = usePathname();
  const [menuOpenOn, setMenuOpenOn] = useState<string | null>(null);
  const menuOpen = menuOpenOn === pathname;
  const setMenuOpen = (next: boolean | ((open: boolean) => boolean)) => {
    const value = typeof next === "function" ? next(menuOpen) : next;
    setMenuOpenOn(value ? pathname : null);
  };

  return (
    <div className="page-shell flex flex-1 flex-col">
      <header className="sticky top-0 z-40 border-b border-border/80 bg-surface/80 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4">
          <Link href="/dashboard" className="group min-w-0">
            <p className="text-lg font-semibold tracking-tight text-foreground">
              CertiFlow
            </p>
            <p className="hidden text-xs text-muted group-hover:text-foreground sm:block">
              Certificate platform
            </p>
          </Link>
          <div className="flex shrink-0 items-center gap-2">
            <ThemeToggle />
            {actions ? (
              <>
                <div className="hidden flex-wrap items-center justify-end gap-2 md:flex">
                  {actions}
                </div>
                <button
                  type="button"
                  onClick={() => setMenuOpen((open) => !open)}
                  aria-label={menuOpen ? "Close menu" : "Open menu"}
                  aria-expanded={menuOpen}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface text-foreground transition hover:bg-surface-muted md:hidden"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                    {menuOpen ? (
                      <path
                        d="M6 6l12 12M18 6 6 18"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                      />
                    ) : (
                      <path
                        d="M4 7h16M4 12h16M4 17h16"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                      />
                    )}
                  </svg>
                </button>
              </>
            ) : null}
          </div>
        </div>
        {actions && menuOpen ? (
          <div
            className="border-t border-border/80 px-4 py-3 md:hidden"
            onClick={() => setMenuOpen(false)}
          >
            <div className="flex flex-col gap-2 [&>*]:w-full [&>*]:justify-center">
              {actions}
            </div>
          </div>
        ) : null}
      </header>

      <main className="mx-auto flex w-full min-w-0 max-w-5xl flex-1 flex-col px-4 py-6 sm:px-6 sm:py-10">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl md:text-4xl">
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-2 max-w-2xl text-sm text-muted sm:text-base">
              {subtitle}
            </p>
          ) : null}
        </div>
        {children}
      </main>
    </div>
  );
}

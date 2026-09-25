"use client";

import type { ReactNode } from "react";

type TooltipProps = {
  text: string;
  children: ReactNode;
  /** Prefer bottom when the control sits near the top of the viewport */
  position?: "top" | "bottom";
  className?: string;
};

/** Wraps a control and shows a hover/focus tooltip. */
export function Tooltip({
  text,
  children,
  position = "top",
  className = "",
}: TooltipProps) {
  return (
    <span
      className={`inline-flex ${className}`}
      data-tooltip={text}
      data-tooltip-pos={position === "bottom" ? "bottom" : undefined}
    >
      {children}
    </span>
  );
}

/** Small (i) hint next to labels / info sections. */
export function InfoTip({
  text,
  position = "top",
}: {
  text: string;
  position?: "top" | "bottom";
}) {
  return (
    <button
      type="button"
      data-tooltip={text}
      data-tooltip-pos={position === "bottom" ? "bottom" : undefined}
      className="ml-1 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-border bg-surface-muted text-[10px] font-semibold text-muted hover:border-accent hover:text-accent"
      aria-label={text}
    >
      i
    </button>
  );
}

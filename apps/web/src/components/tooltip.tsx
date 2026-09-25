"use client";

import type { ReactNode } from "react";

type TooltipProps = {
  text: string;
  children: ReactNode;
  position?: "top" | "bottom";
  className?: string;
};

/** Pass-through wrapper (tooltips disabled). */
export function Tooltip({ children, className = "" }: TooltipProps) {
  return <span className={`inline-flex ${className}`}>{children}</span>;
}

/** Info hints disabled — kept so existing imports don't break. */
export function InfoTip(_props: {
  text: string;
  position?: "top" | "bottom";
}) {
  return null;
}

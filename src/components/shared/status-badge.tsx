"use client";

/** Centralized status badge (appointment / ticket / lab / settlement / …). */

import { cn } from "@/lib/utils";
import { badgeStyleFor } from "@/lib/constants";

interface StatusBadgeProps {
  status: string;
  label?: string;
  className?: string;
  withDot?: boolean;
}

export function StatusBadge({ status, label, className, withDot = true }: StatusBadgeProps) {
  const style = badgeStyleFor(status);
  return (
    <span
      className={cn(
        "inline-flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
        style.badge,
        className
      )}
    >
      {withDot && <span className={cn("size-1.5 rounded-full", style.dot)} aria-hidden />}
      {label ?? status}
    </span>
  );
}

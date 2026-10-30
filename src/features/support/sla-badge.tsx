"use client";

/**
 * SlaBadge — SLA state of a single ticket, reused across the dashboard,
 * inbox table, kanban cards and detail sheet.
 */

import { AlertTriangle, Clock3, Hourglass } from "lucide-react";
import { cn } from "@/lib/utils";
import { faDateTime } from "@/lib/jalali";
import { computeSla, slaOverdueLabel, slaRemainingLabel } from "@/features/support/sla";
import type { Ticket } from "@/types";

interface SlaBadgeProps {
  ticket: Ticket;
  /** inject a fixed "now" (defaults to Date.now()) */
  nowMs?: number;
  className?: string;
}

export function SlaBadge({ ticket, nowMs, className }: SlaBadgeProps) {
  const sla = computeSla(ticket, nowMs ?? Date.now());

  if (sla.inactive) {
    return <span className={cn("text-xs text-muted-foreground", className)}>—</span>;
  }

  if (sla.paused) {
    return (
      <span
        title="ساعت‌شمار SLA تا پاسخ کاربر متوقف است"
        className={cn(
          "inline-flex w-fit items-center gap-1.5 rounded-full border border-slate-500/25 bg-slate-500/12 px-2.5 py-0.5 text-xs font-medium text-slate-600 dark:text-slate-400",
          className
        )}
      >
        <Hourglass className="size-3" aria-hidden />
        در انتظار کاربر
      </span>
    );
  }

  if (sla.overdue) {
    return (
      <span
        title={`مهلت پاسخ: ${faDateTime(sla.dueAtISO)}`}
        className={cn(
          "inline-flex w-fit items-center gap-1.5 rounded-full border border-rose-500/25 bg-rose-500/12 px-2.5 py-0.5 text-xs font-medium text-rose-700 dark:text-rose-400",
          className
        )}
      >
        <AlertTriangle className="size-3" aria-hidden />
        {slaOverdueLabel(sla.remainingMs)}
      </span>
    );
  }

  const soon = sla.hoursLeft <= 2;
  return (
    <span
      title={`مهلت پاسخ: ${faDateTime(sla.dueAtISO)}`}
      className={cn(
        "inline-flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        soon
          ? "border-amber-500/25 bg-amber-500/12 text-amber-700 dark:text-amber-400"
          : "border-emerald-500/25 bg-emerald-500/12 text-emerald-700 dark:text-emerald-400",
        className
      )}
    >
      <Clock3 className="size-3" aria-hidden />
      {slaRemainingLabel(sla.remainingMs)}
    </span>
  );
}

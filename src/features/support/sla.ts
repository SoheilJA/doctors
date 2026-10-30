/**
 * SLA computation for support tickets.
 * One helper reused by the dashboard, inbox table, kanban and detail sheet.
 *
 * dueAt = createdAt + SLA[priority]; a ticket is overdue when now > dueAt
 * and its status is neither `closed` nor `answered`. For `awaiting-user`
 * the SLA clock pauses (UI shows «در انتظار کاربر» instead of a countdown).
 */

import { TICKET_SLA_HOURS } from "@/lib/constants";
import { toFa } from "@/lib/fa";
import type { Ticket } from "@/types";

export interface SlaInfo {
  /** local ISO datetime string of the SLA deadline */
  dueAtISO: string;
  /** dueAt − now (negative when past due) */
  remainingMs: number;
  /** past due AND still actionable (not closed/answered, not paused) */
  overdue: boolean;
  /** remaining hours (negative when past due) */
  hoursLeft: number;
  /** status === awaiting-user → clock paused */
  paused: boolean;
  /** status closed/answered → no SLA display */
  inactive: boolean;
}

function toLocalIso(ms: number): string {
  const d = new Date(ms);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:00`;
}

export function computeSla(ticket: Ticket, nowMs: number = Date.now()): SlaInfo {
  const slaHours = TICKET_SLA_HOURS[ticket.priority];
  const createdMs = new Date(ticket.createdAtISO).getTime();
  const dueAtMs = createdMs + slaHours * 3_600_000;
  const remainingMs = dueAtMs - nowMs;
  const inactive = ticket.status === "closed" || ticket.status === "answered";
  const paused = ticket.status === "awaiting-user";
  return {
    dueAtISO: toLocalIso(dueAtMs),
    remainingMs,
    overdue: !inactive && !paused && remainingMs < 0,
    hoursLeft: remainingMs / 3_600_000,
    paused,
    inactive,
  };
}

/** «۴۵ دقیقه» / «۳ ساعت» / «۲ روز» (absolute value, Persian digits). */
export function slaDurationLabel(ms: number): string {
  const totalMinutes = Math.floor(Math.abs(ms) / 60_000);
  if (totalMinutes < 1) return "کمتر از یک دقیقه";
  if (totalMinutes < 60) return `${toFa(totalMinutes)} دقیقه`;
  const hours = Math.floor(totalMinutes / 60);
  if (hours < 24) return `${toFa(hours)} ساعت`;
  const days = Math.round(hours / 24);
  return `${toFa(days)} روز`;
}

/** «۳ ساعت مانده» */
export function slaRemainingLabel(ms: number): string {
  return `${slaDurationLabel(ms)} مانده`;
}

/** «۲ ساعت گذشته» */
export function slaOverdueLabel(ms: number): string {
  return `${slaDurationLabel(ms)} گذشته`;
}

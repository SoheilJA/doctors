"use client";

/**
 * Shared data access + pure helpers for the support panel.
 * The logged-in agent comes from `useAuthStore().session` (stf-0002 نگار حسینی).
 */

import { useMemo } from "react";
import { useAppStore } from "@/store/app-store";
import { useAuthStore } from "@/store/auth-store";
import { TICKET_SLA_HOURS } from "@/lib/constants";
import { toFa } from "@/lib/fa";
import type {
  Appointment,
  Consultation,
  Doctor,
  LabOrder,
  Patient,
  Session,
  StaffUser,
  Ticket,
} from "@/types";

export const MAIN_SUPPORT_ID = "stf-0002";
export const MAIN_SUPPORT_NAME = "نگار حسینی";

export const RELATED_ENTITY_LABELS: Record<NonNullable<Ticket["relatedEntityType"]>, string> = {
  appointment: "نوبت",
  "lab-order": "سفارش آزمایش",
  consultation: "مشاوره",
};

/** Mean rating as a Persian decimal like «۴٫۲». */
export function faRating(n: number): string {
  return toFa(n.toFixed(1)).replace(".", "٫");
}

export interface SupportPanelData {
  session: Session | null;
  agentId: string;
  agentName: string;
  tickets: Ticket[];
  staff: StaffUser[];
  /** all staff with the support role */
  supportAgents: StaffUser[];
  /** support staff with active accounts */
  activeAgents: StaffUser[];
  agentMap: Map<string, StaffUser>;
  patientMap: Map<string, Patient>;
  doctorMap: Map<string, Doctor>;
}

export function useSupportPanel(): SupportPanelData {
  const session = useAuthStore((s) => s.session);
  const tickets = useAppStore((s) => s.tickets);
  const staff = useAppStore((s) => s.staff);
  const patients = useAppStore((s) => s.patients);
  const doctors = useAppStore((s) => s.doctors);

  const agentId = session?.userId ?? MAIN_SUPPORT_ID;
  const agentName = session?.name ?? MAIN_SUPPORT_NAME;

  const supportAgents = useMemo(() => staff.filter((s) => s.role === "support"), [staff]);
  const activeAgents = useMemo(() => supportAgents.filter((s) => s.active), [supportAgents]);
  const agentMap = useMemo(() => new Map(staff.map((s) => [s.id, s])), [staff]);
  const patientMap = useMemo(() => new Map(patients.map((p) => [p.id, p])), [patients]);
  const doctorMap = useMemo(() => new Map(doctors.map((d) => [d.id, d])), [doctors]);

  return { session, agentId, agentName, tickets, staff, supportAgents, activeAgents, agentMap, patientMap, doctorMap };
}

/** Avatar hue of a ticket creator (falls back to a neutral hue). */
export function creatorHue(ticket: Ticket, patientMap: Map<string, Patient>, doctorMap: Map<string, Doctor>): number {
  if (ticket.creatorRole === "patient") return patientMap.get(ticket.creatorId)?.avatarHue ?? 200;
  return doctorMap.get(ticket.creatorId)?.avatarHue ?? 160;
}

/** Tracking code of a related entity (appointment/lab-order/consultation), if resolvable. */
export function relatedEntityCode(
  ticket: Ticket,
  appointments: Appointment[],
  labOrders: LabOrder[],
  consultations: Consultation[]
): string | undefined {
  if (!ticket.relatedEntityType || !ticket.relatedEntityId) return undefined;
  switch (ticket.relatedEntityType) {
    case "appointment":
      return appointments.find((a) => a.id === ticket.relatedEntityId)?.code;
    case "lab-order":
      return labOrders.find((l) => l.id === ticket.relatedEntityId)?.code;
    case "consultation":
      return consultations.find((c) => c.id === ticket.relatedEntityId)?.code;
  }
  return undefined;
}

/* --------------------------- agent performance --------------------------- */

export interface AgentStats {
  /** tickets assigned to me OR containing any message from me */
  handled: Ticket[];
  /** tickets where I sent a non-internal reply */
  replied: Ticket[];
  /** my handled tickets that are closed with a resolution time */
  closedMine: Ticket[];
  /** closed tickets resolved within the SLA window of their priority */
  withinSlaCount: number;
  /** % of closedMine resolved within SLA (null when nothing closed) */
  slaRatePercent: number | null;
  /** mean minutes from ticket creation to MY first message (null if none) */
  avgFirstResponseMin: number | null;
  /** my handled tickets that carry a user rating */
  ratedTickets: Ticket[];
  /** mean rating of ratedTickets (null when none) */
  satisfaction: number | null;
  /** tickets currently assigned to me and not closed */
  activeAssigned: number;
}

export function computeAgentStats(tickets: Ticket[], agentId: string): AgentStats {
  const handled = tickets.filter(
    (t) => t.assignedAgentId === agentId || t.messages.some((m) => m.senderId === agentId)
  );
  const replied = handled.filter((t) => t.messages.some((m) => m.senderId === agentId && !m.internal));

  const firstResponseMinutes: number[] = [];
  for (const t of replied) {
    const mine = t.messages
      .filter((m) => m.senderId === agentId && !m.internal)
      .map((m) => new Date(m.sentAtISO).getTime())
      .sort((a, b) => a - b);
    const first = mine[0];
    if (first !== undefined) {
      const minutes = (first - new Date(t.createdAtISO).getTime()) / 60_000;
      if (minutes >= 0) firstResponseMinutes.push(minutes);
    }
  }

  const closedMine = handled.filter((t) => t.status === "closed" && t.resolvedAtISO);
  const withinSlaCount = closedMine.filter(
    (t) =>
      new Date(t.resolvedAtISO as string).getTime() - new Date(t.createdAtISO).getTime() <=
      TICKET_SLA_HOURS[t.priority] * 3_600_000
  ).length;

  const ratedTickets = handled.filter((t) => typeof t.rating === "number");
  const satisfaction =
    ratedTickets.length > 0
      ? ratedTickets.reduce((sum, t) => sum + (t.rating as number), 0) / ratedTickets.length
      : null;

  return {
    handled,
    replied,
    closedMine,
    withinSlaCount,
    slaRatePercent: closedMine.length > 0 ? (withinSlaCount / closedMine.length) * 100 : null,
    avgFirstResponseMin:
      firstResponseMinutes.length > 0
        ? firstResponseMinutes.reduce((a, b) => a + b, 0) / firstResponseMinutes.length
        : null,
    ratedTickets,
    satisfaction,
    activeAssigned: handled.filter((t) => t.assignedAgentId === agentId && t.status !== "closed").length,
  };
}

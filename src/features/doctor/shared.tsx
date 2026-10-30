"use client";

/**
 * Shared data-access helpers for the doctor panel.
 * The logged-in doctor comes from `useAuthStore().session.doctorId`.
 */

import { useMemo } from "react";
import {
  MessageSquareText,
  Phone,
  Stethoscope,
  Video,
  type LucideIcon,
} from "lucide-react";
import { useAppStore } from "@/store/app-store";
import { useAuthStore } from "@/store/auth-store";
import type { VisitType } from "@/lib/constants";
import type { Appointment, Consultation, Doctor, Patient, Review, Settlement, Ticket, Transaction } from "@/types";

export const VISIT_TYPE_ICONS: Record<VisitType, LucideIcon> = {
  "in-person": Stethoscope,
  phone: Phone,
  text: MessageSquareText,
  video: Video,
};

/** Display name of the person actually seen (family-member snapshot wins). */
export function appointmentPatientName(a: Appointment, patientMap: Map<string, Patient>): string {
  return a.forFamilyMember?.name ?? patientMap.get(a.patientId)?.name ?? "بیمار";
}

/** Doctor's net share of an appointment fee (after platform commission). */
export function netFee(a: Appointment): number {
  return Math.max(0, a.fee - a.commission);
}

/** Simple HH:mm comparator. */
export function byTime(a: { time: string }, b: { time: string }): number {
  return a.time.localeCompare(b.time);
}

export function byDateTimeAsc(a: { date: string; time: string }, b: { date: string; time: string }): number {
  if (a.date !== b.date) return a.date.localeCompare(b.date);
  return a.time.localeCompare(b.time);
}

export function byDateTimeDesc(a: { date: string; time: string }, b: { date: string; time: string }): number {
  return byDateTimeAsc(b, a);
}

export interface DoctorPanelData {
  session: ReturnType<typeof useAuthStore.getState>["session"];
  doctorId: string | undefined;
  doctor: Doctor | undefined;
  patientMap: Map<string, Patient>;
  appointments: Appointment[];
  consultations: Consultation[];
  reviews: Review[];
  transactions: Transaction[];
  settlements: Settlement[];
  tickets: Ticket[];
}

/** Everything the doctor pages need, filtered to the logged-in doctor. */
export function useDoctorPanel(): DoctorPanelData {
  const session = useAuthStore((s) => s.session);
  const doctors = useAppStore((s) => s.doctors);
  const patients = useAppStore((s) => s.patients);
  const allAppointments = useAppStore((s) => s.appointments);
  const consultations = useAppStore((s) => s.consultations);
  const reviews = useAppStore((s) => s.reviews);
  const transactions = useAppStore((s) => s.transactions);
  const settlements = useAppStore((s) => s.settlements);
  const tickets = useAppStore((s) => s.tickets);

  const doctorId = session?.doctorId;

  const doctor = useMemo(() => doctors.find((d) => d.id === doctorId), [doctors, doctorId]);

  const appointments = useMemo(
    () => (doctorId ? allAppointments.filter((a) => a.doctorId === doctorId) : []),
    [allAppointments, doctorId]
  );
  const myConsultations = useMemo(
    () => (doctorId ? consultations.filter((c) => c.doctorId === doctorId) : []),
    [consultations, doctorId]
  );
  const myReviews = useMemo(() => (doctorId ? reviews.filter((r) => r.doctorId === doctorId) : []), [reviews, doctorId]);
  const myTransactions = useMemo(
    () => (doctorId ? transactions.filter((t) => t.doctorId === doctorId) : []),
    [transactions, doctorId]
  );
  const mySettlements = useMemo(
    () => (doctorId ? settlements.filter((s) => s.doctorId === doctorId) : []),
    [settlements, doctorId]
  );
  const myTickets = useMemo(
    () => (doctorId ? tickets.filter((t) => t.creatorRole === "doctor" && t.creatorId === doctorId) : []),
    [tickets, doctorId]
  );

  const patientMap = useMemo(() => {
    const m = new Map<string, Patient>();
    for (const p of patients) m.set(p.id, p);
    return m;
  }, [patients]);

  return {
    session,
    doctorId,
    doctor,
    patientMap,
    appointments,
    consultations: myConsultations,
    reviews: myReviews,
    transactions: myTransactions,
    settlements: mySettlements,
    tickets: myTickets,
  };
}

"use client";

/**
 * Shared data-access + finance helpers for the super-admin panel (pages 1–7).
 * The logged-in admin comes from `useAuthStore().session` (stf-0001 محمد کریمی).
 */

import { useMemo } from "react";
import { useAppStore } from "@/store/app-store";
import { useAuthStore } from "@/store/auth-store";
import { faMonthLabel, jalaliMonthKey, subMonthsISO, todayISO } from "@/lib/jalali";
import { toFa } from "@/lib/fa";
import { SPECIALTY_LABELS, type ClinicServiceItem, type Specialty } from "@/lib/constants";
import type {
  Appointment,
  Consultation,
  Doctor,
  MedicalCenter,
  Patient,
  Review,
  Settlement,
  Ticket,
  Transaction,
} from "@/types";

export const MAIN_ADMIN_NAME = "محمد کریمی";

/** Mean rating as a Persian decimal like «۴٫۶». */
export function faRating(n: number): string {
  return toFa(n.toFixed(1)).replace(".", "٫");
}

export const CENTER_TYPE_LABELS: Record<MedicalCenter["type"], string> = {
  clinic: "درمانگاه",
  lab: "آزمایشگاه",
  hospital: "بیمارستان",
};

/* ------------------------------- finance ------------------------------- */

const GMV_KINDS: ReadonlySet<Transaction["kind"]> = new Set(["appointment", "consultation", "lab"]);

/** GMV = successful inbound service transactions (نوبت + مشاوره + آزمایش). */
export function isGmvTransaction(t: Transaction): boolean {
  return t.status === "success" && t.direction === "in" && GMV_KINDS.has(t.kind);
}

export function computeGmv(transactions: Transaction[]): number {
  return transactions.filter(isGmvTransaction).reduce((sum, t) => sum + t.amount, 0);
}

/**
 * Platform commission from raw slices: paid appointment commissions
 * + paid consultation fees × the doctor's commission rate.
 */
export function computeCommission(
  appointments: Appointment[],
  consultations: Consultation[],
  doctorMap: Map<string, Doctor>
): number {
  const fromAppointments = appointments
    .filter((a) => a.paymentStatus === "paid")
    .reduce((sum, a) => sum + a.commission, 0);
  const fromConsultations = consultations
    .filter((c) => c.paymentStatus === "paid")
    .reduce((sum, c) => sum + Math.round(c.fee * ((doctorMap.get(c.doctorId)?.commissionRate ?? 0) / 100)), 0);
  return fromAppointments + fromConsultations;
}

/** Commission attributable to one transaction (service kinds only; null otherwise). */
export function transactionCommission(
  t: Transaction,
  appointmentMap: Map<string, Appointment>,
  consultationMap: Map<string, Consultation>,
  doctorMap: Map<string, Doctor>
): number | null {
  if (t.appointmentId) return appointmentMap.get(t.appointmentId)?.commission ?? null;
  if (t.consultationId) {
    const c = consultationMap.get(t.consultationId);
    const doctor = c ? doctorMap.get(c.doctorId) : undefined;
    return c && doctor ? Math.round(c.fee * (doctor.commissionRate / 100)) : null;
  }
  return null;
}

export interface MonthlyFinancePoint {
  key: string;
  label: string;
  gmv: number;
  commission: number;
}

/** Last `months` Jalali months (oldest first) with GMV + commission per month. */
export function buildMonthlyFinance(
  months: number,
  transactions: Transaction[],
  appointments: Appointment[],
  consultations: Consultation[],
  doctorMap: Map<string, Doctor>
): MonthlyFinancePoint[] {
  const keys = Array.from({ length: months }, (_, i) => jalaliMonthKey(subMonthsISO(todayISO(), months - 1 - i)));
  return keys.map((key) => ({
    key,
    label: faMonthLabel(key),
    gmv: transactions
      .filter((t) => isGmvTransaction(t) && jalaliMonthKey(t.createdAtISO) === key)
      .reduce((sum, t) => sum + t.amount, 0),
    commission:
      appointments
        .filter((a) => a.paymentStatus === "paid" && jalaliMonthKey(a.date) === key)
        .reduce((sum, a) => sum + a.commission, 0) +
      consultations
        .filter((c) => c.paymentStatus === "paid" && jalaliMonthKey(c.createdAtISO) === key)
        .reduce((sum, c) => sum + Math.round(c.fee * ((doctorMap.get(c.doctorId)?.commissionRate ?? 0) / 100)), 0),
  }));
}

/* ------------------------------ panel hook ------------------------------ */

export interface AdminPanelData {
  actorName: string;
  doctors: Doctor[];
  patients: Patient[];
  appointments: Appointment[];
  consultations: Consultation[];
  reviews: Review[];
  transactions: Transaction[];
  settlements: Settlement[];
  tickets: Ticket[];
  centers: MedicalCenter[];
  specialties: Specialty[];
  services: ClinicServiceItem[];
  doctorMap: Map<string, Doctor>;
  patientMap: Map<string, Patient>;
  appointmentMap: Map<string, Appointment>;
  consultationMap: Map<string, Consultation>;
  reviewCountByDoctor: Map<string, number>;
}

/** Everything the admin pages need from the mock DB + the acting admin's name. */
export function useAdminPanel(): AdminPanelData {
  const session = useAuthStore((s) => s.session);
  const doctors = useAppStore((s) => s.doctors);
  const patients = useAppStore((s) => s.patients);
  const appointments = useAppStore((s) => s.appointments);
  const consultations = useAppStore((s) => s.consultations);
  const reviews = useAppStore((s) => s.reviews);
  const transactions = useAppStore((s) => s.transactions);
  const settlements = useAppStore((s) => s.settlements);
  const tickets = useAppStore((s) => s.tickets);
  const centers = useAppStore((s) => s.centers);
  const specialties = useAppStore((s) => s.specialties);
  const services = useAppStore((s) => s.services);

  const doctorMap = useMemo(() => new Map(doctors.map((d) => [d.id, d])), [doctors]);
  const patientMap = useMemo(() => new Map(patients.map((p) => [p.id, p])), [patients]);
  const appointmentMap = useMemo(() => new Map(appointments.map((a) => [a.id, a])), [appointments]);
  const consultationMap = useMemo(() => new Map(consultations.map((c) => [c.id, c])), [consultations]);
  const reviewCountByDoctor = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of reviews) m.set(r.doctorId, (m.get(r.doctorId) ?? 0) + 1);
    return m;
  }, [reviews]);

  return {
    actorName: session?.name ?? MAIN_ADMIN_NAME,
    doctors,
    patients,
    appointments,
    consultations,
    reviews,
    transactions,
    settlements,
    tickets,
    centers,
    specialties,
    services,
    doctorMap,
    patientMap,
    appointmentMap,
    consultationMap,
    reviewCountByDoctor,
  };
}

/** Memoized 6-month finance series (used by dashboard + finance page). */
export function useMonthlyFinance(data: AdminPanelData, months = 6): MonthlyFinancePoint[] {
  return useMemo(
    () => buildMonthlyFinance(months, data.transactions, data.appointments, data.consultations, data.doctorMap),
    [months, data.transactions, data.appointments, data.consultations, data.doctorMap]
  );
}

/** Specialty title with a graceful fallback (custom specialties may be added at runtime). */
export function specialtyTitle(specialtyId: string, specialties: Specialty[]): string {
  return specialties.find((s) => s.id === specialtyId)?.title ?? SPECIALTY_LABELS[specialtyId] ?? "—";
}

/** Compact Persian money tick for chart axes (no «تومان» suffix). */
export function moneyTick(v: number): string {
  return toFa(new Intl.NumberFormat("fa-IR", { notation: "compact", maximumFractionDigits: 1 }).format(v));
}

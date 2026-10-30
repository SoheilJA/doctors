"use client";

/**
 * Shared helpers for the patient panel (Persian/RTL utilities on top of lib/*).
 */

import { useEffect, useState } from "react";
import { useAppStore } from "@/store/app-store";
import { useAuthStore } from "@/store/auth-store";
import type { Patient, DiscountCode, Gender } from "@/types";
import { isoDateTimeToDate } from "@/lib/jalali";
import { toFa } from "@/lib/fa";
import type { VisitType } from "@/lib/constants";

/** lg breakpoint watcher (true on desktop) — used for master/detail mobile dialogs. */
export function useIsDesktop(): boolean {
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return isDesktop;
}

/** The logged-in patient record (undefined until stores hydrate). */
export function useCurrentPatient(): Patient | undefined {
  const session = useAuthStore((s) => s.session);
  const patients = useAppStore((s) => s.patients);
  if (!session?.patientId) return undefined;
  return patients.find((p) => p.id === session.patientId);
}

/** Visit-type fee of a doctor for a given visit type. */
export function feeForVisit(
  doctor: { visitFee: number; phoneFee: number; textFee: number; videoFee: number },
  visitType: VisitType
): number {
  if (visitType === "in-person") return doctor.visitFee;
  if (visitType === "phone") return doctor.phoneFee;
  if (visitType === "text") return doctor.textFee;
  return doctor.videoFee;
}

export const GENDER_LABELS: Record<Gender, string> = { male: "آقا", female: "خانم" };

export const FAMILY_RELATIONS = ["همسر", "پدر", "مادر", "پسر", "دختر", "خواهر", "برادر"] as const;

/** Remaining-time label like «۳۶ ساعت دیگر» (computed once, no interval). */
export function countdownText(targetISODT: string): string {
  const diffMs = isoDateTimeToDate(targetISODT).getTime() - Date.now();
  if (diffMs <= 0) return "هم‌اکنون";
  const mins = Math.floor(diffMs / 60_000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  if (hours >= 72) {
    const remH = hours % 24;
    return remH ? `${toFa(days)} روز و ${toFa(remH)} ساعت دیگر` : `${toFa(days)} روز دیگر`;
  }
  if (hours >= 1) {
    const rem = mins % 60;
    return rem ? `${toFa(hours)} ساعت و ${toFa(rem)} دقیقه دیگر` : `${toFa(hours)} ساعت دیگر`;
  }
  return `${toFa(Math.max(1, mins))} دقیقه دیگر`;
}

/** Deadline countdown for consultations («۳ ساعت و ۲۰ دقیقه باقی مانده»). */
export function deadlineText(deadlineISODT: string): string | null {
  const diffMs = isoDateTimeToDate(deadlineISODT).getTime() - Date.now();
  if (diffMs <= 0) return null; // overdue
  const mins = Math.ceil(diffMs / 60_000);
  const hours = Math.floor(mins / 60);
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    return `${toFa(days)} روز باقی مانده`;
  }
  if (hours >= 1) {
    const rem = mins % 60;
    return rem ? `${toFa(hours)} ساعت و ${toFa(rem)} دقیقه باقی مانده` : `${toFa(hours)} ساعت باقی مانده`;
  }
  return `${toFa(Math.max(1, mins))} دقیقه باقی مانده`;
}

export interface DiscountResult {
  ok: boolean;
  message: string;
  percent?: number;
  discountAmount?: number;
  payable?: number;
}

/** Validate a discount code against the mock catalog (Persian errors). */
export function validateDiscount(
  rawCode: string,
  amount: number,
  codes: DiscountCode[],
  todayStr: string
): DiscountResult {
  const value = rawCode.trim().toUpperCase();
  if (!value) return { ok: false, message: "کد تخفیف را وارد کنید" };
  const code = codes.find((c) => c.code.toUpperCase() === value);
  if (!code) return { ok: false, message: "کد تخفیف یافت نشد" };
  if (!code.active) return { ok: false, message: "این کد تخفیف غیرفعال است" };
  if (code.expiresAtISO < todayStr) return { ok: false, message: "این کد تخفیف منقضی شده است" };
  if (code.usedCount >= code.maxUses) return { ok: false, message: "ظرفیت استفاده از این کد تکمیل شده است" };
  if (amount < code.minAmount) {
    return {
      ok: false,
      message: `حداقل مبلغ برای این کد ${toFa(Math.round(code.minAmount / 1000))} هزار تومان است`,
    };
  }
  const discountAmount = Math.round((amount * code.percent) / 100);
  return {
    ok: true,
    message: `${toFa(code.percent)}٪ تخفیف اعمال شد`,
    percent: code.percent,
    discountAmount,
    payable: amount - discountAmount,
  };
}

/** Appointments of one doctor only (perf: generateSlotsForDate scans the whole list otherwise). */
export function doctorAppointments<T extends { doctorId: string }>(appointments: T[], doctorId: string): T[] {
  return appointments.filter((a) => a.doctorId === doctorId);
}

/** Is cancellation still allowed? (until 12h before the appointment) */
export function canCancelAppointment(date: string, time: string): boolean {
  const target = isoDateTimeToDate(`${date}T${time}:00`).getTime();
  return target - Date.now() >= 12 * 3600_000;
}

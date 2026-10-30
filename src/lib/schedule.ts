/**
 * Slot generation & schedule helpers.
 * Shared by: doctor availability manager, doctor booking calendar,
 * patient booking wizard, doctor list («نزدیک‌ترین نوبت»).
 */

import {
  JALALI_WEEKDAYS,
  addDaysISO,
  diffDays,
  timeToMinutes,
  todayISO,
  weekdayIndex,
} from "@/lib/jalali";
import type { Appointment, DateOverride, Doctor, TimeRange } from "@/types";
import { z } from "zod";

export interface GeneratedSlot {
  time: string; // HH:mm
  visitType: "in-person" | "online";
  duration: number;
  maxPerSlot: number;
  bookedCount: number;
  remaining: number;
}

/** Is this date inside an off-day / holiday range? */
export function findOffDay(doctor: Doctor, dateISO: string) {
  return doctor.offDays.find((o) => dateISO >= o.startDate && dateISO <= o.endDate);
}

/** Effective ranges for a date: date override wins over weekly schedule. */
export function effectiveRanges(doctor: Doctor, dateISO: string): TimeRange[] {
  const override: DateOverride | undefined = doctor.overrides.find((o) => o.date === dateISO);
  if (override) return override.ranges;
  const off = findOffDay(doctor, dateISO);
  if (off) return [];
  const day = doctor.weeklySchedule[weekdayIndex(dateISO)];
  if (!day || !day.active) return [];
  return day.ranges;
}

export function isDoctorWorking(doctor: Doctor, dateISO: string): boolean {
  return effectiveRanges(doctor, dateISO).length > 0;
}

export function bookedTimesFor(appointments: Appointment[], doctorId: string, dateISO: string): Map<string, number> {
  const map = new Map<string, number>();
  for (const a of appointments) {
    if (a.doctorId === doctorId && a.date === dateISO && a.status !== "cancelled" && a.status !== "no-show") {
      map.set(a.time, (map.get(a.time) ?? 0) + 1);
    }
  }
  return map;
}

/** Generate concrete time slots for a date, considering booked appointments. */
export function generateSlotsForDate(
  doctor: Doctor,
  dateISO: string,
  appointments: Appointment[]
): GeneratedSlot[] {
  const ranges = effectiveRanges(doctor, dateISO);
  const booked = bookedTimesFor(appointments, doctor.id, dateISO);
  const slots: GeneratedSlot[] = [];
  const seen = new Set<string>();
  for (const range of ranges) {
    const step = Math.max(10, range.duration + range.buffer);
    for (let m = timeToMinutes(range.start); m + range.duration <= timeToMinutes(range.end); m += step) {
      const time = `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
      if (seen.has(time)) continue;
      seen.add(time);
      const bookedCount = booked.get(time) ?? 0;
      slots.push({
        time,
        visitType: range.visitType,
        duration: range.duration,
        maxPerSlot: range.maxPerSlot,
        bookedCount,
        remaining: Math.max(0, range.maxPerSlot - bookedCount),
      });
    }
  }
  return slots.sort((a, b) => a.time.localeCompare(b.time));
}

/** Next dateISO (within horizon days) with a free slot; null if none. */
export function nextAvailableDate(
  doctor: Doctor,
  appointments: Appointment[],
  horizonDays = 21
): { dateISO: string; slot: GeneratedSlot } | null {
  for (let i = 1; i <= horizonDays; i++) {
    const dateISO = addDaysISO(todayISO(), i);
    const slot = generateSlotsForDate(doctor, dateISO, appointments).find((s) => s.remaining > 0);
    if (slot) return { dateISO, slot };
  }
  return null;
}

/** Dates in [from, to] where the doctor has working hours. */
export function workingDates(doctor: Doctor, fromISO: string, toISO: string): string[] {
  const out: string[] = [];
  const total = diffDays(toISO, fromISO);
  for (let i = 0; i <= total; i++) {
    const dateISO = addDaysISO(fromISO, i);
    if (effectiveRanges(doctor, dateISO).length > 0) out.push(dateISO);
  }
  return out;
}

/* ----------------------------- Validation ----------------------------- */

const time24 = /^([01]\d|2[0-3]):[0-5]\d$/;

export const timeRangeSchema = z
  .object({
    start: z.string().regex(time24, "ساعت شروع معتبر نیست (مثال: ۰۹:۰۰)"),
    end: z.string().regex(time24, "ساعت پایان معتبر نیست (مثال: ۱۳:۰۰)"),
    visitType: z.enum(["in-person", "online"], { message: "نوع ویزیت را انتخاب کنید" }),
    duration: z.number().min(10, "مدت ویزیت حداقل ۱۰ دقیقه است").max(120, "مدت ویزیت حداکثر ۱۲۰ دقیقه است"),
    buffer: z.number().min(0, "فاصله نمی‌تواند منفی باشد").max(60, "فاصله حداکثر ۶۰ دقیقه است"),
    maxPerSlot: z.number().min(1, "حداقل ۱ بیمار در هر بازه").max(20, "حداکثر ۲۰ بیمار در هر بازه"),
  })
  .refine((r) => timeToMinutes(r.end) - timeToMinutes(r.start) >= r.duration, {
    message: "بازه انتخابی کوتاه‌تر از مدت یک ویزیت است",
  })
  .refine((r) => timeToMinutes(r.end) > timeToMinutes(r.start), {
    message: "ساعت پایان باید بعد از ساعت شروع باشد",
  });

export const dayScheduleSchema = z.object({
  active: z.boolean(),
  ranges: z.array(timeRangeSchema).superRefine((ranges, ctx) => {
    const sorted = [...ranges].sort((a, b) => timeToMinutes(a.start) - timeToMinutes(b.start));
    for (let i = 0; i < sorted.length; i++) {
      for (let j = i + 1; j < sorted.length; j++) {
        if (timeToMinutes(sorted[j].start) < timeToMinutes(sorted[i].end)) {
          ctx.addIssue({
            code: "custom",
            message: "بازه‌ها نباید همپوشانی داشته باشند؛ لطفاً ساعات را اصلاح کنید",
          });
          return;
        }
      }
    }
  }),
});

/** Validate whole weekly schedule; returns Persian error messages keyed by weekday. */
export function validateWeeklySchedule(schedule: Record<number, { active: boolean; ranges: TimeRange[] }>): Record<string, string[]> {
  const errors: Record<string, string[]> = {};
  for (const key of Object.keys(schedule).map(Number)) {
    const day = schedule[key];
    if (!day.active) continue;
    const result = dayScheduleSchema.safeParse(day);
    if (!result.success) {
      const msgs = [...new Set(result.error.issues.map((i) => i.message))];
      if (msgs.length) errors[JALALI_WEEKDAYS[key]] = msgs;
    }
  }
  return errors;
}

/** Detect booked appointments that conflict with a proposed schedule change. */
export function findConflictingAppointments(
  doctor: Doctor,
  appointments: Appointment[],
  lookaheadDays = 45
): Appointment[] {
  const today = todayISO();
  return appointments.filter((a) => {
    if (a.doctorId !== doctor.id) return false;
    if (a.status === "cancelled" || a.status === "no-show") return false;
    const d = diffDays(a.date, today);
    if (d < 0 || d > lookaheadDays) return false;
    const slots = generateSlotsForDate(doctor, a.date, appointments);
    return !slots.some((s) => s.time === a.time);
  });
}

export const WEEKDAY_LABELS = JALALI_WEEKDAYS;

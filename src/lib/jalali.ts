/**
 * Jalali (Shamsi) date helpers built on top of `date-fns-jalali`.
 *
 * Storage convention: all dates are stored as Gregorian ISO strings
 * `YYYY-MM-DD` (local civil dates) and datetimes as `YYYY-MM-DDTHH:mm:ss`.
 * Jalali is a presentation concern only — every display goes through here.
 */

import {
  addDays as jAddDays,
  addMonths as jAddMonths,
  differenceInCalendarDays,
  eachDayOfInterval,
  endOfMonth as jEndOfMonth,
  format as jFormat,
  isSameDay,
  startOfMonth as jStartOfMonth,
  startOfWeek as jStartOfWeek,
  subDays as jSubDays,
  subMonths as jSubMonths,
} from "date-fns-jalali";
import { toFa } from "@/lib/fa";

export const JALALI_MONTHS = [
  "فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور",
  "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند",
] as const;

/** 0 = شنبه … 6 = جمعه */
export const JALALI_WEEKDAYS = [
  "شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه",
] as const;

export const JALALI_WEEKDAYS_SHORT = [
  "ش", "ی", "د", "س", "چ", "پ", "ج",
] as const;

/* ---------- Date <-> ISO conversions ---------- */

/** Build a Date from an ISO `YYYY-MM-DD` (or datetime `YYYY-MM-DDTHH:mm`) at local noon (safe for date math). */
export function isoToDate(iso: string): Date {
  const [datePart] = iso.split("T");
  const [y, m, d] = datePart.split("-").map(Number);
  if (iso.includes("T")) {
    const [hh, mm, ss] = iso.split("T")[1].split(":").map(Number);
    return new Date(y, (m || 1) - 1, d || 1, hh || 0, mm || 0, ss || 0, 0);
  }
  return new Date(y, (m || 1) - 1, d || 1, 12, 0, 0, 0);
}

/** Build a Date from an ISO datetime string `YYYY-MM-DDTHH:mm(:ss)`. */
export function isoDateTimeToDate(iso: string): Date {
  const [datePart, timePart = "12:00:00"] = iso.split("T");
  const [y, m, d] = datePart.split("-").map(Number);
  const [hh, mm, ss] = timePart.split(":").map(Number);
  return new Date(y, (m || 1) - 1, d || 1, hh || 0, mm || 0, ss || 0, 0);
}

/** `YYYY-MM-DD` for a Date (Gregorian ISO storage format). */
export function dateToISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function todayISO(): string {
  return dateToISO(new Date());
}

export function nowISODateTime(): string {
  const d = new Date();
  const date = dateToISO(d);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${date}T${hh}:${mm}:00`;
}

export function addDaysISO(iso: string, n: number): string {
  return dateToISO(jAddDays(isoToDate(iso), n));
}
export function subDaysISO(iso: string, n: number): string {
  return dateToISO(jSubDays(isoToDate(iso), n));
}
export function addMonthsISO(iso: string, n: number): string {
  return dateToISO(jAddMonths(isoToDate(iso), n));
}
export function subMonthsISO(iso: string, n: number): string {
  return dateToISO(jSubMonths(isoToDate(iso), n));
}
export function diffDays(isoA: string, isoB: string): number {
  return differenceInCalendarDays(isoToDate(isoA), isoToDate(isoB));
}
export function isSameISODate(isoA: string, isoB: string): boolean {
  return isoA === isoB;
}
export function eachDayISO(startISO: string, endISO: string): string[] {
  return eachDayOfInterval({ start: isoToDate(startISO), end: isoToDate(endISO) }).map(dateToISO);
}
export function startOfMonthISO(iso: string): string {
  return dateToISO(jStartOfMonth(isoToDate(iso)));
}
export function endOfMonthISO(iso: string): string {
  return dateToISO(jEndOfMonth(isoToDate(iso)));
}
/** Saturday-based week start. */
export function startOfWeekISO(iso: string): string {
  return dateToISO(jStartOfWeek(isoToDate(iso), { weekStartsOn: 6 }));
}
export function endOfWeekISO(iso: string): string {
  return addDaysISO(startOfWeekISO(iso), 6);
}

/** 0 = شنبه … 6 = جمعه */
export function weekdayIndex(iso: string): number {
  return (isoToDate(iso).getDay() + 1) % 7;
}

/* ---------- Formatting (all output uses Persian digits) ---------- */

/** Format a stored date with a Jalali pattern, e.g. `d MMMM yyyy`. */
export function formatJalali(iso: string, pattern = "d MMMM yyyy"): string {
  if (!iso) return "—";
  return toFa(jFormat(isoToDate(iso), pattern));
}

/** «پنجشنبه ۱۲ آبان ۱۴۰۵» */
export function faDate(iso: string): string {
  return formatJalali(iso, "EEEE d MMMM yyyy");
}

/** «۱۲ آبان» */
export function faDateShort(iso: string): string {
  return formatJalali(iso, "d MMMM");
}

/** «۱۲ آبان ۱۴۰۵» */
export function faDateMedium(iso: string): string {
  return formatJalali(iso, "d MMMM yyyy");
}

/** «۱۴۰۵/۰۸/۱۲» */
export function faDateNumeric(iso: string): string {
  return formatJalali(iso, "yyyy/MM/dd");
}

/** datetime → «۱۴۰۵/۰۸/۱۲ - ۱۴:۳۰» */
export function faDateTime(iso: string): string {
  return formatJalali(iso, "yyyy/MM/dd - HH:mm");
}

/** datetime → «۱۲ آبان، ۱۴:۳۰» */
export function faDateTimeShort(iso: string): string {
  return formatJalali(iso, "d MMMM، HH:mm");
}

/** '14:30' -> «۱۴:۳۰» */
export function faTime(time: string): string {
  if (!time) return "—";
  return toFa(time);
}

/** Persian weekday of a stored date, e.g. «شنبه». */
export function faWeekday(iso: string): string {
  return JALALI_WEEKDAYS[weekdayIndex(iso)];
}

/** Jalali month key like `1405-08` (used for grouping). */
export function jalaliMonthKey(iso: string): string {
  const y = jFormat(isoToDate(iso), "yyyy");
  const m = jFormat(isoToDate(iso), "MM");
  return `${y}-${m}`;
}

/** Label for a Jalali month key, e.g. `1405-08` -> «آبان ۱۴۰۵». */
export function faMonthLabel(key: string): string {
  const [y, m] = key.split("-");
  return `${JALALI_MONTHS[Number(m) - 1]} ${toFa(y)}`;
}

/** Relative label: «امروز», «فردا», «دیروز», «۳ روز دیگر», «۲ هفته پیش» … */
export function faFromNow(iso: string): string {
  const days = diffDays(iso, todayISO());
  if (days === 0) return "امروز";
  if (days === 1) return "فردا";
  if (days === -1) return "دیروز";
  if (days > 1 && days < 7) return `${toFa(days)} روز دیگر`;
  if (days < -1 && days > -7) return `${toFa(-days)} روز پیش`;
  if (days > 0) return `${toFa(Math.round(days / 7))} هفته دیگر`;
  return `${toFa(Math.round(-days / 7))} هفته پیش`;
}

/** duration in minutes -> «۴۵ دقیقه» */
export function faDuration(minutes: number): string {
  if (minutes < 60) return `${toFa(minutes)} دقیقه`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${toFa(h)} ساعت و ${toFa(m)} دقیقه` : `${toFa(h)} ساعت`;
}

/** minutes -> «۰۹:۳۰» (24h clock, latin; wrap with faTime for Persian digits) */
export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + (m || 0);
}

/** Is a stored date in the past (before today)? */
export function isPastISO(iso: string): boolean {
  return diffDays(iso, todayISO()) < 0;
}

/** Jalali year/month/day parts of an ISO date. */
export function jalaliParts(iso: string): { jy: number; jm: number; jd: number } {
  return {
    jy: Number(jFormat(isoToDate(iso), "yyyy")),
    jm: Number(jFormat(isoToDate(iso), "M")),
    jd: Number(jFormat(isoToDate(iso), "d")),
  };
}

export { isSameDay };

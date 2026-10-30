/**
 * Persian (fa-IR) number & digit helpers.
 * All user-visible numbers in the app go through these helpers.
 */

const FA_DIGITS = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"] as const;

/** Convert every Latin digit in a string to a Persian digit. */
export function toFa(value: string | number): string {
  return String(value).replace(/[0-9]/g, (d) => FA_DIGITS[Number(d)]);
}

/** Convert Persian/Arabic digits back to Latin (for inputs). */
export function toEnDigits(value: string): string {
  return value
    .replace(/[۰-۹]/g, (d) => String(FA_DIGITS.indexOf(d as (typeof FA_DIGITS)[number])))
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
}

const numberFormatter = new Intl.NumberFormat("fa-IR");

/** Format a number with Persian digits and thousand separators. */
export function faNum(n: number): string {
  return numberFormatter.format(Math.round(n));
}

/** Format a money amount in Toman, e.g. «۲۵۰٬۰۰۰ تومان». */
export function toman(n: number): string {
  return `${faNum(n)} تومان`;
}

/** Compact Toman, e.g. «۱٫۲ میلیون تومان». */
export function tomanCompact(n: number): string {
  if (n >= 1_000_000_000) return `${faNum(Math.round(n / 100_000_000) / 10)} میلیارد تومان`;
  if (n >= 1_000_000) return `${faNum(Math.round(n / 100_000) / 10)} میلیون تومان`;
  if (n >= 1_000) return `${faNum(Math.round(n / 100) / 10)} هزار تومان`;
  return `${faNum(n)} تومان`;
}

/** Percentage with Persian digits, e.g. «۱۲٪». */
export function faPercent(n: number, digits = 0): string {
  const fixed = n.toFixed(digits);
  return `${toFa(fixed)}٪`;
}

/** Iranian mobile format: ۰۹۱۲ ۳۴۵ ۶۷۸۹ */
export function faPhone(phone: string): string {
  const p = toEnDigits(phone).replace(/\D/g, "");
  if (p.length === 11) {
    return `${toFa(p.slice(0, 4))} ${toFa(p.slice(4, 7))} ${toFa(p.slice(7))}`;
  }
  return toFa(p);
}

/** Fake but consistent Iranian national-id format (10 Persian digits). */
export function faNationalId(id: string): string {
  return toFa(id);
}

/** Generate a demo tracking code like «NO-۴۸۲۱». */
export function faCode(prefix: string, n: number | string): string {
  return `${prefix}-${toFa(n)}`;
}

/** Parse a Persian-digit numeric input into a JS number (NaN if invalid). */
export function parseFaNumber(input: string): number {
  const normalized = toEnDigits(input).replace(/[^\d.-]/g, "");
  const n = Number(normalized);
  return Number.isFinite(n) ? n : NaN;
}

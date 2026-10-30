/**
 * Central Persian labels, statuses, colors and catalogs.
 * Every UI label for a status/type/category lives here — pages must not hardcode them.
 */

export const APP_NAME = "دکترها";
export const APP_TAGLINE = "پلتفرم جامع سلامت و نوبت‌دهی آنلاین";

/* ------------------------------- Roles ------------------------------- */

export type Role = "patient" | "doctor" | "support" | "admin";

export const ROLE_LABELS: Record<Role, string> = {
  patient: "بیمار",
  doctor: "پزشک",
  support: "پشتیبان",
  admin: "مدیر کل",
};

export const ROLE_HOME: Record<Role, string> = {
  patient: "/patient",
  doctor: "/doctor",
  support: "/support",
  admin: "/admin",
};

/* ----------------------------- Visit types ----------------------------- */

export type VisitType = "in-person" | "phone" | "text" | "video";

export const VISIT_TYPE_LABELS: Record<VisitType, string> = {
  "in-person": "حضوری",
  phone: "تلفنی",
  text: "متنی",
  video: "ویدیویی",
};

/* ------------------------------- Statuses ------------------------------ */

export type AppointmentStatus = "pending" | "confirmed" | "completed" | "cancelled" | "no-show";
export type PaymentStatus = "paid" | "unpaid" | "refunded";
export type ConsultationStatus = "waiting" | "answered" | "closed";
export type TicketStatus = "open" | "in-progress" | "awaiting-user" | "answered" | "closed";
export type TicketPriority = "low" | "medium" | "high" | "urgent";
export type TicketCategory = "booking" | "payment" | "consult" | "lab" | "technical" | "other";
export type LabOrderStatus = "registered" | "review" | "paid" | "sampling" | "processing" | "received";
export type SettlementStatus = "pending" | "approved" | "paid" | "rejected";
export type VerificationStatus = "pending" | "verified" | "rejected";
export type DoctorAccountStatus = "active" | "suspended" | "pending";
export type PublishStatus = "published" | "draft";
export type ModerationStatus = "published" | "hidden" | "pending";
export type TransactionKind =
  | "appointment"
  | "consultation"
  | "lab"
  | "topup"
  | "commission"
  | "settlement"
  | "refund";

export const APPOINTMENT_STATUS_LABELS: Record<AppointmentStatus, string> = {
  pending: "در انتظار تأیید",
  confirmed: "تأییدشده",
  completed: "انجام‌شده",
  cancelled: "لغوشده",
  "no-show": "عدم حضور",
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  paid: "پرداخت‌شده",
  unpaid: "پرداخت‌نشده",
  refunded: "بازگشت‌یافته",
};

export const CONSULTATION_STATUS_LABELS: Record<ConsultationStatus, string> = {
  waiting: "در انتظار پاسخ پزشک",
  answered: "پاسخ داده شد",
  closed: "بسته شده",
};

export const TICKET_STATUS_LABELS: Record<TicketStatus, string> = {
  open: "باز",
  "in-progress": "در حال بررسی",
  "awaiting-user": "در انتظار پاسخ کاربر",
  answered: "پاسخ داده شد",
  closed: "بسته شده",
};

export const TICKET_STATUS_ORDER: TicketStatus[] = [
  "open", "in-progress", "awaiting-user", "answered", "closed",
];

export const TICKET_PRIORITY_LABELS: Record<TicketPriority, string> = {
  low: "کم",
  medium: "متوسط",
  high: "زیاد",
  urgent: "فوری",
};

export const TICKET_CATEGORY_LABELS: Record<TicketCategory, string> = {
  booking: "نوبت‌دهی",
  payment: "پرداخت",
  consult: "مشاوره",
  lab: "آزمایشگاه",
  technical: "فنی",
  other: "سایر",
};

/** First-response SLA in hours per priority. */
export const TICKET_SLA_HOURS: Record<TicketPriority, number> = {
  urgent: 2,
  high: 8,
  medium: 24,
  low: 48,
};

export const LAB_ORDER_STATUS_LABELS: Record<LabOrderStatus, string> = {
  registered: "ثبت سفارش",
  review: "در بررسی آزمایشگاه",
  paid: "پرداخت‌شده",
  sampling: "نمونه‌گیری انجام شد",
  processing: "در حال آماده‌سازی",
  received: "جواب دریافت شد",
};

export const LAB_ORDER_STEPS: LabOrderStatus[] = [
  "registered", "review", "paid", "sampling", "processing", "received",
];

export const SETTLEMENT_STATUS_LABELS: Record<SettlementStatus, string> = {
  pending: "در انتظار بررسی",
  approved: "تأییدشده",
  paid: "پرداخت‌شده",
  rejected: "ردشده",
};

export const VERIFICATION_STATUS_LABELS: Record<VerificationStatus, string> = {
  pending: "در انتظار احراز هویت",
  verified: "احراز هویت‌شده",
  rejected: "ردشده",
};

export const DOCTOR_ACCOUNT_STATUS_LABELS: Record<DoctorAccountStatus, string> = {
  active: "فعال",
  suspended: "غیرفعال",
  pending: "در انتظار تأیید",
};

export const PUBLISH_STATUS_LABELS: Record<PublishStatus, string> = {
  published: "منتشرشده",
  draft: "پیش‌نویس",
};

export const MODERATION_STATUS_LABELS: Record<ModerationStatus, string> = {
  published: "منتشرشده",
  hidden: "پنهان‌شده",
  pending: "در انتظار بررسی",
};

export const TRANSACTION_KIND_LABELS: Record<TransactionKind, string> = {
  appointment: "نوبت حضوری",
  consultation: "مشاوره آنلاین",
  lab: "آزمایش",
  topup: "شارژ کیف پول",
  commission: "کمیسیون پلتفرم",
  settlement: "تسویه حساب",
  refund: "بازگشت وجه",
};

/* -------------------------- Badge color mapping ------------------------- */
/* statusKey -> { label, badge: tailwind classes, dot: tailwind bg class } */

type BadgeStyle = { badge: string; dot: string };

const BADGE_AMBER = "bg-amber-500/12 text-amber-700 dark:text-amber-400 border-amber-500/25";
const BADGE_TEAL = "bg-teal-500/12 text-teal-700 dark:text-teal-400 border-teal-500/25";
const BADGE_GREEN = "bg-emerald-500/12 text-emerald-700 dark:text-emerald-400 border-emerald-500/25";
const BADGE_RED = "bg-rose-500/12 text-rose-700 dark:text-rose-400 border-rose-500/25";
const BADGE_GRAY = "bg-slate-500/12 text-slate-600 dark:text-slate-400 border-slate-500/25";
const BADGE_SKY = "bg-sky-500/12 text-sky-700 dark:text-sky-400 border-sky-500/25";
const BADGE_VIOLET = "bg-violet-500/12 text-violet-700 dark:text-violet-400 border-violet-500/25";
const BADGE_ORANGE = "bg-orange-500/12 text-orange-700 dark:text-orange-400 border-orange-500/25";

export const STATUS_BADGE_STYLES: Record<string, BadgeStyle> = {
  // appointment
  pending: { badge: BADGE_AMBER, dot: "bg-amber-500" },
  confirmed: { badge: BADGE_TEAL, dot: "bg-teal-500" },
  completed: { badge: BADGE_GREEN, dot: "bg-emerald-500" },
  cancelled: { badge: BADGE_RED, dot: "bg-rose-500" },
  "no-show": { badge: BADGE_ORANGE, dot: "bg-orange-500" },
  // payment
  paid: { badge: BADGE_GREEN, dot: "bg-emerald-500" },
  unpaid: { badge: BADGE_RED, dot: "bg-rose-500" },
  refunded: { badge: BADGE_GRAY, dot: "bg-slate-500" },
  // consultation
  waiting: { badge: BADGE_AMBER, dot: "bg-amber-500" },
  answered: { badge: BADGE_GREEN, dot: "bg-emerald-500" },
  closed: { badge: BADGE_GRAY, dot: "bg-slate-500" },
  // ticket statuses
  open: { badge: BADGE_SKY, dot: "bg-sky-500" },
  "in-progress": { badge: BADGE_AMBER, dot: "bg-amber-500" },
  "awaiting-user": { badge: BADGE_VIOLET, dot: "bg-violet-500" },
  // ticket priorities
  low: { badge: BADGE_GRAY, dot: "bg-slate-500" },
  medium: { badge: BADGE_SKY, dot: "bg-sky-500" },
  high: { badge: BADGE_ORANGE, dot: "bg-orange-500" },
  urgent: { badge: BADGE_RED, dot: "bg-rose-500" },
  // lab steps
  registered: { badge: BADGE_SKY, dot: "bg-sky-500" },
  review: { badge: BADGE_AMBER, dot: "bg-amber-500" },
  sampling: { badge: BADGE_TEAL, dot: "bg-teal-500" },
  processing: { badge: BADGE_VIOLET, dot: "bg-violet-500" },
  received: { badge: BADGE_GREEN, dot: "bg-emerald-500" },
  // settlement
  approved: { badge: BADGE_TEAL, dot: "bg-teal-500" },
  rejected: { badge: BADGE_RED, dot: "bg-rose-500" },
  // verification / account
  verified: { badge: BADGE_GREEN, dot: "bg-emerald-500" },
  active: { badge: BADGE_GREEN, dot: "bg-emerald-500" },
  suspended: { badge: BADGE_RED, dot: "bg-rose-500" },
  // moderation
  published: { badge: BADGE_GREEN, dot: "bg-emerald-500" },
  hidden: { badge: BADGE_GRAY, dot: "bg-slate-500" },
  draft: { badge: BADGE_GRAY, dot: "bg-slate-500" },
  // misc
  blocked: { badge: BADGE_RED, dot: "bg-rose-500" },
};

export function badgeStyleFor(statusKey: string): BadgeStyle {
  return STATUS_BADGE_STYLES[statusKey] ?? BADGE_GRAY;
}

/* ------------------------------- Catalogs ------------------------------ */

export interface Specialty {
  id: string;
  title: string;
  description: string;
}

export const SPECIALTIES: Specialty[] = [
  { id: "womens", title: "زنان و زایمان", description: "بارداری، زایمان، سلامت بانوان و بیماری‌های زنان" },
  { id: "cardio", title: "قلب و عروق", description: "فشار خون، آریتمی، بیماری‌های قلبی و عروقی" },
  { id: "derma", title: "پوست و مو", description: "درماتولوژی، مشکلات پوستی، مو و زیبایی" },
  { id: "ortho", title: "ارتوپدی", description: "شکستگی، مفاصل، ستون فقرات و آسیب‌های ورزشی" },
  { id: "neuro", title: "مغز و اعصاب", description: "سردرد، صرع، سکته و بیماری‌های عصبی" },
  { id: "psych", title: "روانپزشکی", description: "افسردگی، اضطراب، اختلالات خواب و روحی" },
  { id: "peds", title: "اطفال", description: "سلامت کودکان، واکسیناسیون و رشد نوزادان" },
  { id: "ophthal", title: "چشم‌پزشکی", description: "معاینه چشم، عینک، آب‌مروارید و LASIK" },
  { id: "dental", title: "دندانپزشکی", description: "ایمپلنت، ارتودنسی، کامپوزیت و درمان ریشه" },
  { id: "internal", title: "داخلی", description: "دیابت، گوارش، عفونی و بیماری‌های داخلی" },
  { id: "endocrine", title: "غدد", description: "تیروئید، دیابت و اختلالات هورمونی" },
  { id: "nutrition", title: "تغذیه", description: "رژیم‌های درمانی، چاقی و تغذیه بالینی" },
];

export const SPECIALTY_LABELS: Record<string, string> = Object.fromEntries(
  SPECIALTIES.map((s) => [s.id, s.title])
);
export const SPECIALTY_IDS = SPECIALTIES.map((s) => s.id);

export const CITIES = ["تهران", "مشهد", "اصفهان", "شیراز", "تبریز", "کرج", "اهواز"] as const;

export const INSURERS = [
  "بیمه تکمیلی ایران", "بیمه آسیا", "بیمه پاسارگاد", "بیمه سامان", "بیمه دانا", "بدون بیمه",
] as const;

export const LANGUAGES = ["فارسی", "انگلیسی", "عربی", "ترکی"] as const;

export const DURATIONS = [10, 15, 20, 30, 45, 60] as const;

/* -------------------------- Lab test catalog --------------------------- */

export interface LabTestItem {
  id: string;
  name: string;
  price: number;
  category: string;
}

export const LAB_TESTS: LabTestItem[] = [
  { id: "t-cbc", name: "آزمایش شمارش کامل سلول‌های خون (CBC)", price: 185_000, category: "خون" },
  { id: "t-tsh", name: "تیروئید (TSH, T3, T4)", price: 320_000, category: "هورمونی" },
  { id: "t-fbs", name: "قند خون ناشتا (FBS)", price: 95_000, category: "خون" },
  { id: "t-lipid", name: "چربی خون (لیپید پروفایل)", price: 280_000, category: "خون" },
  { id: "t-vitd", name: "ویتامین D", price: 410_000, category: "ویتامین" },
  { id: "t-iron", name: "آهن و فریتین", price: 265_000, category: "خون" },
  { id: "t-liver", name: "آنزیم‌های کبدی (LFT)", price: 240_000, category: "کبد" },
  { id: "t-kidney", name: "آزمایش عملکرد کلیه", price: 230_000, category: "کلیه" },
  { id: "t-preg", name: "تست بارداری (βhCG)", price: 160_000, category: "هورمونی" },
  { id: "t-uri", name: "آنالیز ادرار", price: 120_000, category: "ادرار" },
  { id: "t-hba", name: "هموگلوبین گلیکوزیله (HbA1c)", price: 350_000, category: "خون" },
  { id: "t-vitb", name: "ویتامین B12", price: 390_000, category: "ویتامین" },
];

/* ------------------------- Clinic service catalog ------------------------ */

export interface ClinicServiceItem {
  id: string;
  specialtyId: string;
  title: string;
  priceMin: number;
  priceMax: number;
}

export const CLINIC_SERVICES: ClinicServiceItem[] = [
  { id: "s-implant", specialtyId: "dental", title: "ایمپلنت دندان", priceMin: 12_000_000, priceMax: 35_000_000 },
  { id: "s-laser", specialtyId: "derma", title: "لیزر پوست", priceMin: 1_500_000, priceMax: 8_000_000 },
  { id: "s-compo", specialtyId: "dental", title: "کامپوزیت دندان", priceMin: 900_000, priceMax: 3_500_000 },
  { id: "s-ortho", specialtyId: "dental", title: "ارتودنسی ثابت", priceMin: 25_000_000, priceMax: 80_000_000 },
  { id: "s-lasik", specialtyId: "ophthal", title: "عمل لیزیک (LASIK)", priceMin: 20_000_000, priceMax: 45_000_000 },
  { id: "s-sono", specialtyId: "womens", title: "سونوگرافی شکم", priceMin: 600_000, priceMax: 1_500_000 },
  { id: "s-botox", specialtyId: "derma", title: "تزریق بوتاکس", priceMin: 3_000_000, priceMax: 12_000_000 },
  { id: "s-physio", specialtyId: "ortho", title: "فیزیوتراپی جلسه‌ای", priceMin: 400_000, priceMax: 900_000 },
  { id: "s-diet", specialtyId: "nutrition", title: "برنامه غذایی اختصاصی", priceMin: 350_000, priceMax: 1_200_000 },
  { id: "s-endo", specialtyId: "dental", title: "درمان ریشه (عصب‌کشی)", priceMin: 2_000_000, priceMax: 7_000_000 },
  { id: "s-cardio-eco", specialtyId: "cardio", title: "اکوکاردیوگرافی", priceMin: 1_200_000, priceMax: 3_000_000 },
  { id: "s-eeg", specialtyId: "neuro", title: "نوار مغز (EEG)", priceMin: 900_000, priceMax: 2_500_000 },
];

/* ------------------------------ Fee ranges ------------------------------ */

/** visit fee ranges per specialty (Toman) */
export const SPECIALTY_FEE_RANGE: Record<string, [number, number]> = {
  womens: [350_000, 800_000],
  cardio: [400_000, 900_000],
  derma: [300_000, 750_000],
  ortho: [350_000, 850_000],
  neuro: [450_000, 1_000_000],
  psych: [400_000, 950_000],
  peds: [280_000, 650_000],
  ophthal: [300_000, 700_000],
  dental: [250_000, 600_000],
  internal: [250_000, 600_000],
  endocrine: [350_000, 800_000],
  nutrition: [200_000, 500_000],
};

/** platform commission defaults (%) */
export const DEFAULT_COMMISSION_RATE = 12;
export const COMMISSION_RANGE: [number, number] = [5, 25];

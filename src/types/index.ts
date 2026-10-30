/**
 * Shared domain types for the whole demo platform.
 * All records use string ISO dates (`YYYY-MM-DD`, datetimes `YYYY-MM-DDTHH:mm:ss`).
 */

import type {
  AppointmentStatus,
  ClinicServiceItem,
  Specialty,
  ConsultationStatus,
  DoctorAccountStatus,
  LabOrderStatus,
  ModerationStatus,
  PaymentStatus,
  PublishStatus,
  Role,
  SettlementStatus,
  TicketCategory,
  TicketPriority,
  TicketStatus,
  TransactionKind,
  VerificationStatus,
  VisitType,
} from "@/lib/constants";

export type Gender = "male" | "female";

export interface Attachment {
  name: string;
  sizeKB: number;
  type: "image" | "pdf";
}

/* ------------------------------- Doctor -------------------------------- */

export interface TimeRange {
  id: string;
  start: string; // HH:mm
  end: string; // HH:mm
  visitType: "in-person" | "online";
  duration: number; // minutes per visit
  buffer: number; // minutes between visits
  maxPerSlot: number;
}

export interface DaySchedule {
  active: boolean;
  ranges: TimeRange[];
}

/** key: 0 (شنبه) … 6 (جمعه) */
export type WeeklySchedule = Record<number, DaySchedule>;

export interface OffDay {
  id: string;
  startDate: string; // ISO
  endDate: string; // ISO inclusive
  reason: string;
}

export interface DateOverride {
  id: string;
  date: string; // ISO
  ranges: TimeRange[];
  note?: string;
}

export interface Doctor {
  id: string;
  name: string; // includes «دکتر» prefix
  gender: Gender;
  specialtyId: string;
  city: string;
  address: string;
  licenseNumber: string; // پروانه پزشکی
  experienceYears: number;
  bio: string;
  education: string[];
  certificates: string[];
  avatarHue: number;
  visitFee: number;
  phoneFee: number;
  textFee: number;
  videoFee: number;
  rating: number; // 0..5
  reviewCount: number;
  verification: VerificationStatus;
  accountStatus: DoctorAccountStatus;
  commissionRate: number; // %
  languages: string[];
  insurers: string[];
  availableOnline: boolean;
  weeklySchedule: WeeklySchedule;
  offDays: OffDay[];
  overrides: DateOverride[];
  isDemo?: boolean;
}

/* ------------------------------- Patient ------------------------------- */

export interface FamilyMember {
  id: string;
  name: string;
  relation: string;
  gender: Gender;
  birthDateISO: string;
  nationalId: string;
}

export interface Patient {
  id: string;
  name: string;
  phone: string;
  nationalId: string;
  gender: Gender;
  birthDateISO: string;
  city: string;
  address: string;
  insurance: string;
  bloodType: string;
  walletBalance: number;
  blocked: boolean;
  avatarHue: number;
  allergies: string[];
  chronicConditions: string[];
  family: FamilyMember[];
  createdAtISO: string;
  isDemo?: boolean;
}

/* ----------------------------- Appointments ---------------------------- */

export interface Appointment {
  id: string;
  code: string; // tracking code e.g. NO-10432
  doctorId: string;
  patientId: string;
  forFamilyMember?: FamilyMember; // snapshot when booking for a relative
  date: string; // ISO
  time: string; // HH:mm
  duration: number; // minutes
  visitType: VisitType;
  status: AppointmentStatus;
  paymentStatus: PaymentStatus;
  fee: number; // Toman paid by patient
  commission: number; // Toman platform commission
  reason: string;
  notes: string; // doctor notes
  prescription?: string;
  createdAtISO: string;
  isDemo?: boolean;
}

/* ---------------------------- Consultations ---------------------------- */

export interface ConsultationMessage {
  id: string;
  sender: "patient" | "doctor";
  text: string;
  attachments: Attachment[];
  sentAtISO: string;
}

export interface Consultation {
  id: string;
  code: string; // CO-xxxx
  doctorId: string;
  patientId: string;
  type: "text" | "phone" | "video";
  status: ConsultationStatus;
  subject: string;
  question: string;
  messages: ConsultationMessage[];
  fee: number;
  paymentStatus: PaymentStatus;
  createdAtISO: string;
  deadlineISO: string; // response deadline
  prescriptionNote?: string;
  isDemo?: boolean;
}

/* ------------------------------- Reviews ------------------------------- */

export interface Review {
  id: string;
  doctorId: string;
  patientId: string;
  appointmentId?: string;
  consultationId?: string;
  rating: number; // 1..5
  comment: string;
  reply?: string;
  status: ModerationStatus;
  createdAtISO: string;
}

/* ------------------------------ Lab orders ----------------------------- */

export interface LabOrderTest {
  id: string;
  name: string;
  price: number;
}

export interface LabOrderHistoryEntry {
  status: LabOrderStatus;
  atISO: string;
}

export interface LabOrder {
  id: string;
  code: string; // LB-xxxx
  patientId: string;
  labId: string;
  doctorId?: string;
  tests: LabOrderTest[];
  totalFee: number;
  status: LabOrderStatus;
  paymentStatus: PaymentStatus;
  prescriptionFile?: Attachment;
  homeSampling: boolean;
  history: LabOrderHistoryEntry[];
  createdAtISO: string;
  resultNote?: string;
  isDemo?: boolean;
}

/* ----------------------------- Transactions ---------------------------- */

export interface Transaction {
  id: string;
  code: string; // TR-xxxx
  kind: TransactionKind;
  amount: number; // Toman, positive
  direction: "in" | "out"; // in = to platform, out = payout/refund
  patientId?: string;
  doctorId?: string;
  appointmentId?: string;
  consultationId?: string;
  labOrderId?: string;
  settlementId?: string;
  status: "success" | "failed" | "pending";
  description: string;
  createdAtISO: string;
}

export interface Settlement {
  id: string;
  code: string; // ST-xxxx
  doctorId: string;
  amount: number;
  status: SettlementStatus;
  requestedAtISO: string;
  paidAtISO?: string;
  bankName: string;
  iban: string;
  note?: string;
}

/* ------------------------------- Tickets ------------------------------- */

export interface TicketMessage {
  id: string;
  senderId: string;
  senderRole: Role;
  senderName: string;
  text: string;
  internal: boolean; // staff-only note
  attachments: Attachment[];
  sentAtISO: string;
}

export interface Ticket {
  id: string;
  code: string; // TK-xxxx
  subject: string;
  creatorId: string;
  creatorRole: "patient" | "doctor";
  creatorName: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  messages: TicketMessage[];
  assignedAgentId?: string;
  relatedEntityType?: "appointment" | "lab-order" | "consultation";
  relatedEntityId?: string;
  createdAtISO: string;
  updatedAtISO: string;
  firstResponseAtISO?: string;
  resolvedAtISO?: string;
  rating?: number;
  ratingComment?: string;
  isDemo?: boolean;
}

export interface StaffUser {
  id: string;
  name: string;
  role: "admin" | "support";
  email: string;
  avatarHue: number;
  active: boolean;
  permissions: Record<string, boolean>;
}

export interface CannedReply {
  id: string;
  title: string;
  text: string;
}

export interface Faq {
  id: string;
  question: string;
  answer: string;
  category: TicketCategory | "general";
  published: boolean;
  order: number;
}

/* ----------------------------- Content & ads ---------------------------- */

export interface Article {
  id: string;
  title: string;
  slug: string;
  category: string;
  excerpt: string;
  body: string;
  authorName: string;
  doctorId?: string;
  coverHue: number;
  status: PublishStatus;
  publishedAtISO: string;
  readMinutes: number;
  views: number;
  tags: string[];
}

export interface Banner {
  id: string;
  title: string;
  subtitle: string;
  hue: number;
  link: string;
  active: boolean;
  order: number;
}

export interface MedicalCenter {
  id: string;
  name: string;
  type: "clinic" | "lab" | "hospital";
  city: string;
  address: string;
  phone: string;
  active: boolean;
  homeSampling?: boolean;
}

/* ------------------------------ Discounting ----------------------------- */

export interface DiscountCode {
  id: string;
  code: string; // e.g. WELCOME15
  percent: number;
  maxUses: number;
  usedCount: number;
  active: boolean;
  expiresAtISO: string;
  minAmount: number;
}

/* ------------------------------- Auditing ------------------------------- */

export interface AuditLogEntry {
  id: string;
  actorName: string;
  actorRole: Role;
  action: string;
  target: string;
  atISO: string;
}

/* ----------------------------- Notifications ---------------------------- */

export interface AppNotification {
  id: string;
  role: Role;
  userId?: string;
  title: string;
  body: string;
  read: boolean;
  createdAtISO: string;
  link?: string;
}

/* -------------------------------- Session ------------------------------- */

export interface Session {
  role: Role;
  userId: string;
  name: string;
  doctorId?: string; // when role === doctor
  patientId?: string; // when role === patient
  avatarHue: number;
}

/* ------------------------------- Platform ------------------------------- */

export interface MonthlyStat {
  monthKey: string; // Jalali `1405-08`
  searches: number;
  profileViews: number;
  bookings: number;
  payments: number;
  gmv: number;
  commission: number;
  newPatients: number;
  newDoctors: number;
}

export interface DbSeed {
  specialties: Specialty[];
  services: ClinicServiceItem[];
  doctors: Doctor[];
  patients: Patient[];
  appointments: Appointment[];
  consultations: Consultation[];
  reviews: Review[];
  labOrders: LabOrder[];
  transactions: Transaction[];
  settlements: Settlement[];
  tickets: Ticket[];
  staff: StaffUser[];
  cannedReplies: CannedReply[];
  faqs: Faq[];
  articles: Article[];
  banners: Banner[];
  centers: MedicalCenter[];
  discountCodes: DiscountCode[];
  auditLog: AuditLogEntry[];
  notifications: AppNotification[];
  monthlyStats: MonthlyStat[];
  favorites: { patientId: string; doctorId: string }[];
  seededAtISO: string;
}

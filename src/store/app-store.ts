"use client";

/**
 * The mock "database" — one persisted Zustand store holding ALL demo data.
 * Seeded on first load with deterministic data; survives refresh via localStorage.
 * Every panel mutates state ONLY through these actions so relations stay consistent
 * (e.g. booking an appointment creates its transaction + notifications).
 */

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type {
  Appointment,
  Article,
  Attachment,
  Banner,
  CannedReply,
  Consultation,
  DbSeed,
  DiscountCode,
  Doctor,
  Faq,
  FamilyMember,
  LabOrder,
  LabOrderTest,
  MedicalCenter,
  OffDay,
  Patient,
  Review,
  Settlement,
  StaffUser,
  Ticket,
  TicketMessage,
  Transaction,
  WeeklySchedule,
  DateOverride,
} from "@/types";
import type {
  AppointmentStatus,
  ClinicServiceItem,
  LabOrderStatus,
  ModerationStatus,
  Role,
  Specialty,
  TicketCategory,
  TicketPriority,
  VerificationStatus,
  VisitType,
} from "@/lib/constants";
import { buildSeed } from "@/mock/seed";
import { addDaysISO, todayISO, nowISODateTime } from "@/lib/jalali";

/* ------------------------- input types for actions ------------------------- */

export interface BookAppointmentInput {
  doctorId: string;
  patientId: string;
  forFamilyMember?: FamilyMember;
  date: string;
  time: string;
  visitType: VisitType;
  reason?: string;
  payNow?: boolean; // mock payment success
}

export interface CreateConsultationInput {
  doctorId: string;
  patientId: string;
  type: "text" | "phone" | "video";
  subject: string;
  question: string;
}

export interface CreateLabOrderInput {
  patientId: string;
  labId: string;
  doctorId?: string;
  tests: LabOrderTest[];
  homeSampling: boolean;
  prescriptionFile?: Attachment;
}

export interface CreateTicketInput {
  creatorId: string;
  creatorRole: "patient" | "doctor";
  creatorName: string;
  subject: string;
  category: TicketCategory;
  priority: TicketPriority;
  body: string;
  relatedEntity?: [Ticket["relatedEntityType"], string];
}

export interface SettlementRequestInput {
  doctorId: string;
  amount: number;
  bankName: string;
  iban: string;
}

/* ------------------------------ store type ------------------------------ */

export interface AppStore extends DbSeed {
  _hasHydrated: boolean;
  setHasHydrated: (v: boolean) => void;

  /* meta */
  addAuditLog: (entry: { actorName: string; actorRole: Role; action: string; target: string }) => void;
  resetDemoData: () => void;

  /* notifications */
  pushNotification: (n: { role: Role; userId?: string; title: string; body: string; link?: string }) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: (role: Role, userId?: string) => void;

  /* appointments */
  bookAppointment: (input: BookAppointmentInput) => Appointment;
  updateAppointment: (id: string, patch: Partial<Appointment>) => void;
  setAppointmentStatus: (id: string, status: AppointmentStatus, actorName?: string) => void;
  rescheduleAppointment: (id: string, date: string, time: string) => void;

  /* consultations */
  createConsultation: (input: CreateConsultationInput) => { consultation: Consultation };
  addConsultationMessage: (
    consultationId: string,
    msg: { sender: "patient" | "doctor"; text: string; attachments?: Attachment[] }
  ) => void;
  setConsultationStatus: (id: string, status: Consultation["status"]) => void;
  setConsultationPrescription: (id: string, note: string) => void;

  /* reviews */
  addReview: (input: { doctorId: string; patientId: string; appointmentId?: string; rating: number; comment: string }) => void;
  replyToReview: (id: string, reply: string) => void;
  setReviewStatus: (id: string, status: ModerationStatus, actorName?: string) => void;

  /* lab orders */
  createLabOrder: (input: CreateLabOrderInput) => LabOrder;
  setLabOrderStatus: (id: string, status: LabOrderStatus) => void;
  payLabOrder: (id: string) => void;

  /* wallet & finance */
  topupWallet: (patientId: string, amount: number, discountCode?: string) => void;

  /* settlements */
  requestSettlement: (input: SettlementRequestInput) => Settlement;
  updateSettlement: (id: string, patch: Partial<Settlement>, actorName?: string) => void;

  /* tickets */
  createTicket: (input: CreateTicketInput) => Ticket;
  addTicketMessage: (
    ticketId: string,
    msg: { senderId: string; senderRole: Role; senderName: string; text: string; internal?: boolean; attachments?: Attachment[] }
  ) => void;
  updateTicket: (id: string, patch: Partial<Pick<Ticket, "status" | "priority" | "category" | "assignedAgentId">>) => void;
  closeTicket: (id: string, actorName?: string) => void;
  reopenTicket: (id: string) => void;
  rateTicket: (id: string, rating: number, comment?: string) => void;

  /* doctors */
  updateDoctor: (id: string, patch: Partial<Doctor>) => void;
  updateDoctorSchedule: (id: string, schedule: WeeklySchedule) => void;
  addDoctorOffDay: (id: string, offDay: Omit<OffDay, "id">) => void;
  removeDoctorOffDay: (id: string, offDayId: string) => void;
  addDoctorOverride: (id: string, override: Omit<DateOverride, "id">) => void;
  removeDoctorOverride: (id: string, overrideId: string) => void;
  setDoctorVerification: (id: string, status: VerificationStatus, actorName: string, reason?: string) => void;
  setDoctorAccountStatus: (id: string, status: Doctor["accountStatus"], actorName: string) => void;

  /* patients */
  updatePatient: (id: string, patch: Partial<Patient>) => void;
  blockPatient: (id: string, blocked: boolean, actorName: string) => void;
  addFamilyMember: (patientId: string, member: Omit<FamilyMember, "id">) => void;
  updateFamilyMember: (patientId: string, memberId: string, patch: Partial<FamilyMember>) => void;
  removeFamilyMember: (patientId: string, memberId: string) => void;
  toggleFavorite: (patientId: string, doctorId: string) => void;

  /* content */
  upsertArticle: (article: Article) => void;
  deleteArticle: (id: string) => void;
  upsertBanner: (banner: Banner) => void;
  deleteBanner: (id: string) => void;
  upsertSpecialty: (specialty: Specialty) => void;
  deleteSpecialty: (id: string) => void;
  upsertService: (service: ClinicServiceItem) => void;
  deleteService: (id: string) => void;
  upsertCenter: (center: MedicalCenter) => void;
  deleteCenter: (id: string) => void;
  upsertDiscountCode: (code: DiscountCode) => void;
  deleteDiscountCode: (id: string) => void;

  /* staff */
  upsertStaffUser: (user: StaffUser) => void;
  updateStaffPermissions: (id: string, permissions: Record<string, boolean>) => void;
  toggleStaffActive: (id: string, actorName: string) => void;

  /* canned & faq */
  upsertCannedReply: (reply: CannedReply) => void;
  deleteCannedReply: (id: string) => void;
  upsertFaq: (faq: Faq) => void;
  deleteFaq: (id: string) => void;
}

/* ------------------------------ helpers ------------------------------ */

const genId = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 8)}${Date.now() % 1000}`;
let codeSeq = Math.floor(Math.random() * 4000) + 90000;
const genCode = (prefix: string) => `${prefix}-${++codeSeq}`;

/* ------------------------------ store ------------------------------ */

const seed = buildSeed();

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      ...seed,
      _hasHydrated: false,
      setHasHydrated: (v) => set({ _hasHydrated: v }),

      /* ------------------------------ meta ------------------------------ */
      addAuditLog: (entry) =>
        set((s) => ({
          auditLog: [{ id: genId("aud"), atISO: nowISODateTime(), ...entry }, ...s.auditLog],
        })),

      resetDemoData: () => {
        const fresh = buildSeed();
        set({ ...fresh });
      },

      /* -------------------------- notifications -------------------------- */
      pushNotification: (n) =>
        set((s) => ({
          notifications: [
            { id: genId("ntf"), read: false, createdAtISO: nowISODateTime(), ...n },
            ...s.notifications,
          ],
        })),
      markNotificationRead: (id) =>
        set((s) => ({
          notifications: s.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)),
        })),
      markAllNotificationsRead: (role, userId) =>
        set((s) => ({
          notifications: s.notifications.map((n) =>
            n.role === role && (n.userId ? n.userId === userId || n.userId === undefined : true) ? { ...n, read: true } : n
          ),
        })),

      /* --------------------------- appointments --------------------------- */
      bookAppointment: (input) => {
        const doctor = get().doctors.find((d) => d.id === input.doctorId)!;
        const feeMap: Record<VisitType, number> = {
          "in-person": doctor.visitFee,
          phone: doctor.phoneFee,
          text: doctor.textFee,
          video: doctor.videoFee,
        };
        const fee = feeMap[input.visitType];
        const appointment: Appointment = {
          id: genId("apt"),
          code: genCode("NO"),
          doctorId: input.doctorId,
          patientId: input.patientId,
          forFamilyMember: input.forFamilyMember,
          date: input.date,
          time: input.time,
          duration: input.visitType === "in-person" ? 15 : 20,
          visitType: input.visitType,
          status: input.payNow ? "confirmed" : "pending",
          paymentStatus: input.payNow ? "paid" : "unpaid",
          fee,
          commission: Math.round(fee * (doctor.commissionRate / 100)),
          reason: input.reason ?? "",
          notes: "",
          createdAtISO: nowISODateTime(),
        };
        const transaction: Transaction | null = input.payNow
          ? {
              id: genId("trx"),
              code: genCode("TR"),
              kind: input.visitType === "in-person" ? "appointment" : "consultation",
              amount: fee,
              direction: "in",
              patientId: input.patientId,
              doctorId: input.doctorId,
              appointmentId: appointment.id,
              status: "success",
              description: `پرداخت نوبت ${appointment.code}`,
              createdAtISO: nowISODateTime(),
            }
          : null;
        set((s) => ({
          appointments: [appointment, ...s.appointments],
          transactions: transaction ? [transaction, ...s.transactions] : s.transactions,
        }));
        get().pushNotification({
          role: "doctor",
          userId: doctor.id,
          title: "نوبت جدید ثبت شد",
          body: `برای ${appointment.date} ساعت ${appointment.time} نوبت جدید ثبت شد.`,
          link: "/doctor/calendar",
        });
        return appointment;
      },

      updateAppointment: (id, patch) =>
        set((s) => ({ appointments: s.appointments.map((a) => (a.id === id ? { ...a, ...patch } : a)) })),

      setAppointmentStatus: (id, status, actorName) => {
        const appointment = get().appointments.find((a) => a.id === id);
        set((s) => ({ appointments: s.appointments.map((a) => (a.id === id ? { ...a, status } : a)) }));
        if (!appointment) return;
        // refund side-effect on cancel of a paid appointment
        if (status === "cancelled" && appointment.paymentStatus === "paid") {
          const refund: Transaction = {
            id: genId("trx"),
            code: genCode("TR"),
            kind: "refund",
            amount: appointment.fee,
            direction: "out",
            patientId: appointment.patientId,
            doctorId: appointment.doctorId,
            appointmentId: appointment.id,
            status: "success",
            description: `بازگشت وجه نوبت لغوشده ${appointment.code}`,
            createdAtISO: nowISODateTime(),
          };
          set((s) => ({
            transactions: [refund, ...s.transactions],
            appointments: s.appointments.map((a) => (a.id === id ? { ...a, paymentStatus: "refunded" } : a)),
          }));
        }
        if (status === "completed") {
          get().pushNotification({
            role: "patient",
            userId: appointment.patientId,
            title: "ویزیت شما انجام شد",
            body: `نوبت ${appointment.code} با موفقیت انجام شد. می‌توانید نظر خود را ثبت کنید.`,
            link: "/patient/appointments",
          });
        }
      },

      rescheduleAppointment: (id, date, time) => {
        set((s) => ({ appointments: s.appointments.map((a) => (a.id === id ? { ...a, date, time, status: "pending" } : a)) }));
        const appointment = get().appointments.find((a) => a.id === id);
        if (appointment) {
          get().pushNotification({
            role: "doctor",
            userId: appointment.doctorId,
            title: "تغییر زمان نوبت",
            body: `نوبت ${appointment.code} به ${date} ساعت ${time} تغییر یافت.`,
            link: "/doctor/calendar",
          });
        }
      },

      /* --------------------------- consultations --------------------------- */
      createConsultation: (input) => {
        const doctor = get().doctors.find((d) => d.id === input.doctorId)!;
        const fee = input.type === "text" ? doctor.textFee : input.type === "phone" ? doctor.phoneFee : doctor.videoFee;
        const createdAtISO = nowISODateTime();
        const consultation = {
          id: genId("con"),
          code: genCode("CO"),
          doctorId: input.doctorId,
          patientId: input.patientId,
          type: input.type,
          status: "waiting" as const,
          subject: input.subject,
          question: input.question,
          messages: [
            {
              id: genId("msg"),
              sender: "patient" as const,
              text: `${input.subject}\n${input.question}`,
              attachments: [],
              sentAtISO: createdAtISO,
            },
          ],
          fee,
          paymentStatus: "paid" as const,
          createdAtISO,
          deadlineISO: addDaysISO(todayISO(), 1) + "T" + createdAtISO.split("T")[1],
        };
        const transaction: Transaction = {
          id: genId("trx"),
          code: genCode("TR"),
          kind: "consultation",
          amount: fee,
          direction: "in",
          patientId: input.patientId,
          doctorId: input.doctorId,
          consultationId: consultation.id,
          status: "success",
          description: `پرداخت مشاوره ${consultation.code}`,
          createdAtISO,
        };
        set((s) => ({ consultations: [consultation, ...s.consultations], transactions: [transaction, ...s.transactions] }));
        get().pushNotification({
          role: "doctor",
          userId: input.doctorId,
          title: "مشاوره جدید",
          body: "یک مشاوره جدید در انتظار پاسخ شماست.",
          link: "/doctor/consultations",
        });
        return { consultation };
      },

      addConsultationMessage: (consultationId, msg) => {
        const full = {
          id: genId("msg"),
          sender: msg.sender,
          text: msg.text,
          attachments: msg.attachments ?? [],
          sentAtISO: nowISODateTime(),
        };
        set((s) => ({
          consultations: s.consultations.map((c) =>
            c.id === consultationId
              ? {
                  ...c,
                  messages: [...c.messages, full],
                  status: msg.sender === "doctor" && c.status === "waiting" ? "answered" : c.status,
                }
              : c
          ),
        }));
        const consultation = get().consultations.find((c) => c.id === consultationId);
        if (consultation && msg.sender === "doctor") {
          get().pushNotification({
            role: "patient",
            userId: consultation.patientId,
            title: "پاسخ مشاوره",
            body: `پزشک به مشاوره ${consultation.code} پاسخ داد.`,
            link: "/patient/consultations",
          });
        }
      },

      setConsultationStatus: (id, status) =>
        set((s) => ({ consultations: s.consultations.map((c) => (c.id === id ? { ...c, status } : c)) })),

      setConsultationPrescription: (id, note) =>
        set((s) => ({ consultations: s.consultations.map((c) => (c.id === id ? { ...c, prescriptionNote: note } : c)) })),

      /* ------------------------------ reviews ------------------------------ */
      addReview: (input) => {
        const review: Review = {
          id: genId("rev"),
          ...input,
          status: "published",
          createdAtISO: nowISODateTime(),
        };
        set((s) => ({
          reviews: [review, ...s.reviews],
          doctors: s.doctors.map((d) => {
            if (d.id !== input.doctorId) return d;
            const count = d.reviewCount + 1;
            const rating = Math.round(((d.rating * d.reviewCount + input.rating) / count) * 10) / 10;
            return { ...d, reviewCount: count, rating };
          }),
        }));
        get().pushNotification({
          role: "doctor",
          userId: input.doctorId,
          title: "نظر جدید ثبت شد",
          body: "یک نظر جدید برای شما ثبت شد.",
          link: "/doctor/reviews",
        });
      },

      replyToReview: (id, reply) =>
        set((s) => ({ reviews: s.reviews.map((r) => (r.id === id ? { ...r, reply } : r)) })),

      setReviewStatus: (id, status, actorName) => {
        set((s) => ({ reviews: s.reviews.map((r) => (r.id === id ? { ...r, status } : r)) }));
        if (actorName && status !== "published") {
          get().addAuditLog({ actorName, actorRole: "admin", action: status === "hidden" ? "مخفی‌سازی نظر" : "بررسی نظر", target: "مدیریت نظرات" });
        }
      },

      /* ----------------------------- lab orders ----------------------------- */
      createLabOrder: (input) => {
        const totalFee = input.tests.reduce((sum, t) => sum + t.price, 0);
        const order: LabOrder = {
          id: genId("lab"),
          code: genCode("LB"),
          patientId: input.patientId,
          labId: input.labId,
          doctorId: input.doctorId,
          tests: input.tests,
          totalFee,
          status: "registered",
          paymentStatus: "unpaid",
          prescriptionFile: input.prescriptionFile,
          homeSampling: input.homeSampling,
          history: [{ status: "registered", atISO: nowISODateTime() }],
          createdAtISO: nowISODateTime(),
        };
        set((s) => ({ labOrders: [order, ...s.labOrders] }));
        return order;
      },

      setLabOrderStatus: (id, status) => {
        const order = get().labOrders.find((l) => l.id === id);
        if (!order) return;
        const already = order.history.some((h) => h.status === status);
        set((s) => ({
          labOrders: s.labOrders.map((l) =>
            l.id === id
              ? {
                  ...l,
                  status,
                  paymentStatus: status === "paid" || (l.paymentStatus === "paid") ? "paid" : l.paymentStatus,
                  history: already ? l.history : [...l.history, { status, atISO: nowISODateTime() }],
                  resultNote: status === "received" && !l.resultNote ? "همه مقادیر در محدوده نرمال هستند؛ نتیجه تفصیلی در فایل PDF پیوست است." : l.resultNote,
                }
              : l
          ),
        }));
        if (status === "received") {
          get().pushNotification({
            role: "patient",
            userId: order.patientId,
            title: "جواب آزمایش آماده شد",
            body: `جواب آزمایش «${order.tests[0]?.name}» در بخش آزمایش‌ها قابل مشاهده است.`,
            link: "/patient/labs",
          });
        }
      },

      payLabOrder: (id) => {
        const order = get().labOrders.find((l) => l.id === id);
        if (!order || order.paymentStatus === "paid") return;
        const transaction: Transaction = {
          id: genId("trx"),
          code: genCode("TR"),
          kind: "lab",
          amount: order.totalFee,
          direction: "in",
          patientId: order.patientId,
          labOrderId: order.id,
          status: "success",
          description: `پرداخت آزمایش ${order.code}`,
          createdAtISO: nowISODateTime(),
        };
        set((s) => ({
          transactions: [transaction, ...s.transactions],
          labOrders: s.labOrders.map((l) =>
            l.id === id
              ? {
                  ...l,
                  paymentStatus: "paid",
                  status: "paid",
                  history: l.history.some((h) => h.status === "paid") ? l.history : [...l.history, { status: "paid", atISO: nowISODateTime() }],
                }
              : l
          ),
        }));
      },

      /* ---------------------------- wallet & finance ---------------------------- */
      topupWallet: (patientId, amount, discountCode) => {
        const patient = get().patients.find((p) => p.id === patientId);
        const transaction: Transaction = {
          id: genId("trx"),
          code: genCode("TR"),
          kind: "topup",
          amount,
          direction: "in",
          patientId,
          status: "success",
          description: discountCode ? `شارژ کیف پول (کد تخفیف ${discountCode})` : "شارژ کیف پول",
          createdAtISO: nowISODateTime(),
        };
        set((s) => ({
          transactions: [transaction, ...s.transactions],
          patients: s.patients.map((p) => (p.id === patientId ? { ...p, walletBalance: p.walletBalance + amount } : p)),
        }));
        if (patient) {
          get().pushNotification({
            role: "patient",
            userId: patientId,
            title: "کیف پول شارژ شد",
            body: `مبلغ ${amount.toLocaleString("fa-IR")} تومان به کیف پول شما اضافه شد.`,
            link: "/patient/wallet",
          });
        }
      },

      /* ----------------------------- settlements ----------------------------- */
      requestSettlement: (input) => {
        const settlement: Settlement = {
          id: genId("stl"),
          code: genCode("ST"),
          ...input,
          status: "pending",
          requestedAtISO: nowISODateTime(),
        };
        set((s) => ({ settlements: [settlement, ...s.settlements] }));
        const doctor = get().doctors.find((d) => d.id === input.doctorId);
        get().pushNotification({
          role: "admin",
          title: "درخواست تسویه جدید",
          body: `${doctor?.name} درخواست تسویه حساب ثبت کرد.`,
          link: "/admin/finance",
        });
        return settlement;
      },

      updateSettlement: (id, patch, actorName) => {
        set((s) => ({
          settlements: s.settlements.map((st) => (st.id === id ? { ...st, ...patch } : st)),
        }));
        const settlement = get().settlements.find((st) => st.id === id);
        if (!settlement) return;
        if (patch.status === "paid" && !settlement.paidAtISO) {
          const transaction: Transaction = {
            id: genId("trx"),
            code: genCode("TR"),
            kind: "settlement",
            amount: settlement.amount,
            direction: "out",
            doctorId: settlement.doctorId,
            settlementId: settlement.id,
            status: "success",
            description: `تسویه حساب ${settlement.code}`,
            createdAtISO: nowISODateTime(),
          };
          set((s) => ({ transactions: [transaction, ...s.transactions] }));
          get().pushNotification({
            role: "doctor",
            userId: settlement.doctorId,
            title: "تسویه حساب پرداخت شد",
            body: `مبلغ تسویه ${settlement.code} به حساب شما واریز شد.`,
            link: "/doctor/finance",
          });
        }
        if (actorName) {
          get().addAuditLog({
            actorName,
            actorRole: "admin",
            action: patch.status === "paid" ? "پرداخت درخواست تسویه" : patch.status === "rejected" ? "رد درخواست تسویه" : "تأیید درخواست تسویه",
            target: `درخواست تسویه ${settlement.code}`,
          });
        }
      },

      /* ------------------------------- tickets ------------------------------- */
      createTicket: (input) => {
        const createdAtISO = nowISODateTime();
        const ticket: Ticket = {
          id: genId("tkt"),
          code: genCode("TK"),
          subject: input.subject,
          creatorId: input.creatorId,
          creatorRole: input.creatorRole,
          creatorName: input.creatorName,
          category: input.category,
          priority: input.priority,
          status: "open",
          messages: [
            {
              id: genId("tmsg"),
              senderId: input.creatorId,
              senderRole: input.creatorRole,
              senderName: input.creatorName,
              text: input.body,
              internal: false,
              attachments: [],
              sentAtISO: createdAtISO,
            },
          ],
          relatedEntityType: input.relatedEntity?.[0],
          relatedEntityId: input.relatedEntity?.[1],
          createdAtISO,
          updatedAtISO: createdAtISO,
        };
        set((s) => ({ tickets: [ticket, ...s.tickets] }));
        get().pushNotification({
          role: "support",
          title: "تیکت جدید",
          body: `تیکت «${input.subject}» ثبت شد.`,
          link: "/support/tickets",
        });
        return ticket;
      },

      addTicketMessage: (ticketId, msg) => {
        const full: TicketMessage = {
          id: genId("tmsg"),
          senderId: msg.senderId,
          senderRole: msg.senderRole,
          senderName: msg.senderName,
          text: msg.text,
          internal: msg.internal ?? false,
          attachments: msg.attachments ?? [],
          sentAtISO: nowISODateTime(),
        };
        set((s) => ({
          tickets: s.tickets.map((t) => {
            if (t.id !== ticketId) return t;
            let status = t.status;
            if (!full.internal) {
              if (msg.senderRole === "support" || msg.senderRole === "admin") {
                status = "answered";
                if (t.status === "closed") status = "in-progress";
              } else if (t.creatorRole === msg.senderRole) {
                status = t.status === "closed" ? "closed" : "in-progress";
              }
            }
            return {
              ...t,
              messages: [...t.messages, full],
              status,
              updatedAtISO: full.sentAtISO,
              firstResponseAtISO:
                !t.firstResponseAtISO && (msg.senderRole === "support" || msg.senderRole === "admin")
                  ? full.sentAtISO
                  : t.firstResponseAtISO,
            };
          }),
        }));
        const ticket = get().tickets.find((t) => t.id === ticketId);
        if (ticket && (msg.senderRole === "support" || msg.senderRole === "admin") && !full.internal) {
          get().pushNotification({
            role: ticket.creatorRole,
            userId: ticket.creatorId,
            title: "پاسخ پشتیبانی",
            body: `به تیکت «${ticket.subject}» پاسخ جدیدی داده شد.`,
            link: ticket.creatorRole === "patient" ? "/patient/support" : "/doctor/support",
          });
        } else if (ticket && ticket.assignedAgentId && (msg.senderRole === "patient" || msg.senderRole === "doctor")) {
          get().pushNotification({
            role: "support",
            userId: ticket.assignedAgentId,
            title: "پاسخ کاربر در تیکت",
            body: `${ticket.creatorName} به تیکت «${ticket.subject}» پاسخ داد.`,
            link: "/support/tickets",
          });
        }
      },

      updateTicket: (id, patch) =>
        set((s) => ({ tickets: s.tickets.map((t) => (t.id === id ? { ...t, ...patch, updatedAtISO: nowISODateTime() } : t)) })),

      closeTicket: (id, actorName) => {
        set((s) => ({
          tickets: s.tickets.map((t) => (t.id === id ? { ...t, status: "closed", resolvedAtISO: nowISODateTime(), updatedAtISO: nowISODateTime() } : t)),
        }));
        const ticket = get().tickets.find((t) => t.id === id);
        if (ticket) {
          get().pushNotification({
            role: ticket.creatorRole,
            userId: ticket.creatorId,
            title: "تیکت بسته شد",
            body: `تیکت «${ticket.subject}» بسته شد. اگر مشکل داران ادامه دارد، تیکت جدیدی ثبت کنید.`,
            link: ticket.creatorRole === "patient" ? "/patient/support" : "/doctor/support",
          });
        }
      },

      reopenTicket: (id) =>
        set((s) => ({
          tickets: s.tickets.map((t) => (t.id === id ? { ...t, status: "in-progress", resolvedAtISO: undefined, updatedAtISO: nowISODateTime() } : t)),
        })),

      rateTicket: (id, rating, comment) =>
        set((s) => ({
          tickets: s.tickets.map((t) => (t.id === id ? { ...t, rating, ratingComment: comment } : t)),
        })),

      /* ------------------------------- doctors ------------------------------- */
      updateDoctor: (id, patch) => set((s) => ({ doctors: s.doctors.map((d) => (d.id === id ? { ...d, ...patch } : d)) })),
      updateDoctorSchedule: (id, schedule) => set((s) => ({ doctors: s.doctors.map((d) => (d.id === id ? { ...d, weeklySchedule: schedule } : d)) })),
      addDoctorOffDay: (id, offDay) =>
        set((s) => ({
          doctors: s.doctors.map((d) => (d.id === id ? { ...d, offDays: [{ ...offDay, id: genId("off") }, ...d.offDays] } : d)),
        })),
      removeDoctorOffDay: (id, offDayId) =>
        set((s) => ({ doctors: s.doctors.map((d) => (d.id === id ? { ...d, offDays: d.offDays.filter((o) => o.id !== offDayId) } : d)) })),
      addDoctorOverride: (id, override) =>
        set((s) => ({
          doctors: s.doctors.map((d) => (d.id === id ? { ...d, overrides: [{ ...override, id: genId("ovr") }, ...d.overrides] } : d)),
        })),
      removeDoctorOverride: (id, overrideId) =>
        set((s) => ({ doctors: s.doctors.map((d) => (d.id === id ? { ...d, overrides: d.overrides.filter((o) => o.id !== overrideId) } : d)) })),

      setDoctorVerification: (id, status, actorName, reason) => {
        set((s) => ({
          doctors: s.doctors.map((d) =>
            d.id === id ? { ...d, verification: status, accountStatus: status === "verified" ? "active" : d.accountStatus } : d
          ),
        }));
        get().addAuditLog({
          actorName,
          actorRole: "admin",
          action: status === "verified" ? "تأیید مدارک پزشک" : "رد مدارک پزشک",
          target: id,
        });
        if (status === "verified") {
          get().pushNotification({ role: "doctor", userId: id, title: "احراز هویت تأیید شد", body: "مدارک شما تأیید شد؛ از این پس در نتایج جستجو نمایش داده می‌شوید." });
        }
      },

      setDoctorAccountStatus: (id, status, actorName) => {
        set((s) => ({ doctors: s.doctors.map((d) => (d.id === id ? { ...d, accountStatus: status } : d)) }));
        get().addAuditLog({
          actorName,
          actorRole: "admin",
          action: status === "suspended" ? "تعلیق پزشک" : "فعال‌سازی پزشک",
          target: id,
        });
      },

      /* ------------------------------- patients ------------------------------- */
      updatePatient: (id, patch) => set((s) => ({ patients: s.patients.map((p) => (p.id === id ? { ...p, ...patch } : p)) })),
      blockPatient: (id, blocked, actorName) => {
        set((s) => ({ patients: s.patients.map((p) => (p.id === id ? { ...p, blocked } : p)) }));
        get().addAuditLog({ actorName, actorRole: "admin", action: blocked ? "مسدودسازی حساب کاربر" : "رفع مسدودی حساب کاربر", target: id });
      },
      addFamilyMember: (patientId, member) =>
        set((s) => ({
          patients: s.patients.map((p) =>
            p.id === patientId ? { ...p, family: [...p.family, { ...member, id: genId("fam") }] } : p
          ),
        })),
      updateFamilyMember: (patientId, memberId, patch) =>
        set((s) => ({
          patients: s.patients.map((p) =>
            p.id === patientId ? { ...p, family: p.family.map((m) => (m.id === memberId ? { ...m, ...patch } : m)) } : p
          ),
        })),
      removeFamilyMember: (patientId, memberId) =>
        set((s) => ({
          patients: s.patients.map((p) => (p.id === patientId ? { ...p, family: p.family.filter((m) => m.id !== memberId) } : p)),
        })),
      toggleFavorite: (patientId, doctorId) =>
        set((s) => {
          const exists = s.favorites.some((f) => f.patientId === patientId && f.doctorId === doctorId);
          return {
            favorites: exists
              ? s.favorites.filter((f) => !(f.patientId === patientId && f.doctorId === doctorId))
              : [...s.favorites, { patientId, doctorId }],
          };
        }),

      /* ------------------------------- content ------------------------------- */
      upsertArticle: (article) =>
        set((s) => ({
          articles: s.articles.some((a) => a.id === article.id)
            ? s.articles.map((a) => (a.id === article.id ? article : a))
            : [article, ...s.articles],
        })),
      deleteArticle: (id) => set((s) => ({ articles: s.articles.filter((a) => a.id !== id) })),
      upsertBanner: (banner) =>
        set((s) => ({
          banners: s.banners.some((b) => b.id === banner.id) ? s.banners.map((b) => (b.id === banner.id ? banner : b)) : [banner, ...s.banners],
        })),
      deleteBanner: (id) => set((s) => ({ banners: s.banners.filter((b) => b.id !== id) })),
      upsertSpecialty: (specialty) =>
        set((s) => ({
          specialties: s.specialties.some((sp) => sp.id === specialty.id)
            ? s.specialties.map((sp) => (sp.id === specialty.id ? specialty : sp))
            : [...s.specialties, specialty],
        })),
      deleteSpecialty: (id) => set((s) => ({ specialties: s.specialties.filter((sp) => sp.id !== id) })),
      upsertService: (service) =>
        set((s) => ({
          services: s.services.some((x) => x.id === service.id) ? s.services.map((x) => (x.id === service.id ? service : x)) : [...s.services, service],
        })),
      deleteService: (id) => set((s) => ({ services: s.services.filter((x) => x.id !== id) })),
      upsertCenter: (center) =>
        set((s) => ({
          centers: s.centers.some((c) => c.id === center.id) ? s.centers.map((c) => (c.id === center.id ? center : c)) : [center, ...s.centers],
        })),
      deleteCenter: (id) => set((s) => ({ centers: s.centers.filter((c) => c.id !== id) })),
      upsertDiscountCode: (code) =>
        set((s) => ({
          discountCodes: s.discountCodes.some((d) => d.id === code.id)
            ? s.discountCodes.map((d) => (d.id === code.id ? code : d))
            : [code, ...s.discountCodes],
        })),
      deleteDiscountCode: (id) => set((s) => ({ discountCodes: s.discountCodes.filter((d) => d.id !== id) })),

      /* -------------------------------- staff -------------------------------- */
      upsertStaffUser: (user) =>
        set((s) => ({
          staff: s.staff.some((x) => x.id === user.id) ? s.staff.map((x) => (x.id === user.id ? user : x)) : [...s.staff, user],
        })),
      updateStaffPermissions: (id, permissions) =>
        set((s) => ({ staff: s.staff.map((x) => (x.id === id ? { ...x, permissions } : x)) })),
      toggleStaffActive: (id, actorName) => {
        const user = get().staff.find((x) => x.id === id);
        set((s) => ({ staff: s.staff.map((x) => (x.id === id ? { ...x, active: !x.active } : x)) }));
        get().addAuditLog({ actorName, actorRole: "admin", action: user?.active ? "غیرفعال‌سازی کارمند" : "فعال‌سازی کارمند", target: id });
      },

      /* ----------------------------- canned & faq ----------------------------- */
      upsertCannedReply: (reply) =>
        set((s) => ({
          cannedReplies: s.cannedReplies.some((r) => r.id === reply.id)
            ? s.cannedReplies.map((r) => (r.id === reply.id ? reply : r))
            : [...s.cannedReplies, reply],
        })),
      deleteCannedReply: (id) => set((s) => ({ cannedReplies: s.cannedReplies.filter((r) => r.id !== id) })),
      upsertFaq: (faq) =>
        set((s) => ({
          faqs: s.faqs.some((f) => f.id === faq.id) ? s.faqs.map((f) => (f.id === faq.id ? faq : f)) : [...s.faqs, faq],
        })),
      deleteFaq: (id) => set((s) => ({ faqs: s.faqs.filter((f) => f.id !== id) })),
    }),
    {
      name: "doktorha-db-v1",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => {
        const { _hasHydrated, setHasHydrated, ...rest } = s;
        return rest as AppStore;
      },
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);

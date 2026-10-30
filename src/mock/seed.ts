/**
 * Deterministic seed data for the whole demo.
 * - Uses @faker-js/faker (fa locale) with a FIXED seed so data is stable.
 * - All dates are ISO strings; "today" is the anchor for realistic timelines.
 * - One main demo doctor (دکتر سارا محمدی), one main demo patient (علی رضایی),
 *   one admin (محمد کریمی) and one support agent (نگار حسینی) with rich linked data.
 */

import { fakerFA } from "@faker-js/faker";
import type { DbSeed, Appointment, Consultation, Doctor, FamilyMember, LabOrder, Patient, Review, Settlement, Ticket, Transaction } from "@/types";
import {
  CITIES,
  CLINIC_SERVICES,
  DEFAULT_COMMISSION_RATE,
  INSURERS,
  LAB_TESTS,
  LAB_ORDER_STEPS,
  LANGUAGES,
  SPECIALTIES,
  SPECIALTY_FEE_RANGE,
  type AppointmentStatus,
  type LabOrderStatus,
  type TicketCategory,
  type TicketPriority,
  type TicketStatus,
  type VisitType,
} from "@/lib/constants";
import { addDaysISO, dateToISO, jalaliMonthKey, subDaysISO, todayISO, nowISODateTime } from "@/lib/jalali";
import { generateSlotsForDate, isDoctorWorking } from "@/lib/schedule";
import * as P from "@/mock/pools";

/* ------------------------------ helpers ------------------------------- */

const SEED = 20261030;
const pick = <T,>(arr: readonly T[]): T => fakerFA.helpers.arrayElement(arr);
const int = (min: number, max: number) => fakerFA.number.int({ min, max });
const bool = (probability = 0.5) => fakerFA.number.int({ min: 0, max: 99 }) < probability * 100;
const TODAY = () => todayISO();

let seq = 0;
const nid = (prefix: string) => `${prefix}-${String(++seq).padStart(4, "0")}`;
let noCode = 10000;
const code = (prefix: string) => `${prefix}-${++noCode}`;

function randTime(): string {
  const h = int(8, 20);
  const m = pick([0, 15, 30, 45]);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function randDateTime(dateISO: string, minHour = 9, maxHour = 18): string {
  const h = int(minHour, maxHour);
  const m = pick([0, 15, 30, 45]);
  return `${dateISO}T${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`;
}

/** add N hours to an ISO datetime string, returning an ISO datetime string */
function plusHours(isoDateTime: string, hours: number): string {
  const d = new Date(isoDateTime);
  const shifted = new Date(d.getTime() + hours * 3600_000);
  return `${dateToISO(shifted)}T${String(shifted.getHours()).padStart(2, "0")}:${String(shifted.getMinutes()).padStart(2, "0")}:00`;
}

function personName(gender: "male" | "female"): string {
  return `${gender === "female" ? pick(P.FEMALE_NAMES) : pick(P.MALE_NAMES)} ${pick(P.LAST_NAMES)}`;
}

/* --------------------------- weekly schedules -------------------------- */

type RangeSpec = [string, string, "in-person" | "online"];

function makeRange(spec: RangeSpec, duration: number, buffer: number, maxPerSlot: number) {
  return {
    id: nid("tr"),
    start: spec[0],
    end: spec[1],
    visitType: spec[2],
    duration,
    buffer,
    maxPerSlot,
  };
}

const RANGE_PRESETS: RangeSpec[][] = [
  [["09:00", "13:00", "in-person"]],
  [["09:00", "13:00", "in-person"], ["16:00", "20:00", "in-person"]],
  [["10:00", "14:00", "in-person"], ["17:00", "20:00", "online"]],
  [["08:30", "12:30", "in-person"], ["15:00", "18:00", "in-person"]],
  [["16:00", "21:00", "in-person"]],
  [["09:00", "12:00", "online"], ["14:00", "17:00", "in-person"]],
  [["11:00", "19:00", "in-person"]],
];

function buildWeeklySchedule(activeDays: number[], preset: RangeSpec[], duration: number, buffer: number, maxPerSlot: number) {
  const schedule: Doctor["weeklySchedule"] = {};
  for (let day = 0; day < 7; day++) {
    schedule[day] = activeDays.includes(day)
      ? { active: true, ranges: preset.map((r) => makeRange(r, duration, buffer, maxPerSlot)) }
      : { active: false, ranges: [] };
  }
  return schedule;
}

/* ------------------------------- seed -------------------------------- */

export function buildSeed(): DbSeed {
  fakerFA.seed(SEED);
  seq = 0;
  noCode = 10000;

  const today = TODAY();

  /* ---------------------------- centers ---------------------------- */
  const centers: DbSeed["centers"] = [];
  const centerSpecs: [string, "clinic" | "lab" | "hospital", string][] = [
    ["کلینیک تخصصی پوست و زیبایی آرامش", "clinic", "تهران"],
    ["مجتمع پزشکی ابن‌سینا", "clinic", "تهران"],
    ["آزمایشگاه پاتوبیولوژی پارس", "lab", "تهران"],
    ["آزمایشگاه مراکش", "lab", "مشهد"],
    ["بیمارستان تخصصی میعاد", "hospital", "تهران"],
    ["آزمایشگاه زندگی‌آباد", "lab", "تهران"],
    ["کلینیک دندانپزشکی لبخند", "clinic", "اصفهان"],
    ["آزمایشگاه دی میلاد", "lab", "اصفهان"],
    ["مرکز قلب امیرکبیر", "clinic", "شیراز"],
    ["آزمایشگاه خون‌رسان", "lab", "تبریز"],
    ["بیمارستان آموزشی شهراز", "hospital", "شیراز"],
    ["کلینیک توانبخشی نیکان", "clinic", "کرج"],
    ["آزمایشگاه سینا", "lab", "اهواز"],
    ["درمانگاه شبانه‌روزی امید", "clinic", "مشهد"],
  ];
  for (const [name, type, city] of centerSpecs) {
    centers.push({
      id: nid("cen"),
      name, type, city,
      address: pick(P.ADDRESSES).replace("{n}", String(int(2, 240))),
      phone: `0${pick(["21", "31", "51", "71", "41", "26", "61"])}${String(int(20000000, 89999999))}`,
      active: bool(0.9),
      homeSampling: type === "lab" ? bool(0.6) : undefined,
    });
  }
  const labCenters = centers.filter((c) => c.type === "lab");

  /* ---------------------------- doctors ---------------------------- */

  // main demo doctor first
  const mainDoctor: Doctor = {
    id: "doc-0001",
    name: "دکتر سارا محمدی",
    gender: "female",
    specialtyId: "derma",
    city: "تهران",
    address: "سعادت‌آباد، بلوار دریا، نبش خیابان صراف‌ها، ساختمان مدیکال، طبقه ۳",
    licenseNumber: "12-345678",
    experienceYears: 12,
    bio: "دکتر سارا محمدی، متخصص پوست و مو با بیش از ۱۲ سال سابقه درمانی. عضو انجمن پوست ایران و مدرس دوره‌های لیزر و زیبایی. حوزه‌های تخصصی: درمان آکنه و جوشگاه، درمان لک و ملانوز، لیزر موهای زائد و مشاوره مراقبت از پوست. در حال حاضر در کلینیک تخصصی پوست و زیبایی آرامش تهران حضور دارند و ویزیت آنلاین نیز ارائه می‌کنند.",
    education: [
      "دکترای عمومی پزشکی از دانشگاه علوم پزشکی تهران",
      "دکترای تخصصی پوست از دانشگاه علوم پزشکی شهید بهشتی",
      "فلوشیپ لیزرهای پزشکی از دانشگاه علوم پزشکی ایران",
      "عضو انجمن پوست ایران",
    ],
    certificates: [
      "گواهینامه بین‌المللی روش‌های پیشرفته لیزر",
      "کارگاه زیبایی و لیزر پزشکی",
      "دوره مشاوره آنلاین پزشکی",
    ],
    avatarHue: 173,
    visitFee: 480_000,
    phoneFee: 350_000,
    textFee: 250_000,
    videoFee: 550_000,
    rating: 4.8,
    reviewCount: 24,
    verification: "verified",
    accountStatus: "active",
    commissionRate: 12,
    languages: ["فارسی", "انگلیسی"],
    insurers: [INSURERS[0], INSURERS[1]],
    availableOnline: true,
    weeklySchedule: {
      0: { active: true, ranges: [
        makeRange(["09:00", "13:00", "in-person"], 15, 0, 2),
        makeRange(["16:00", "20:00", "in-person"], 15, 0, 2),
      ] },
      1: { active: true, ranges: [
        makeRange(["09:00", "13:00", "in-person"], 15, 0, 2),
        makeRange(["17:00", "20:00", "online"], 20, 5, 1),
      ] },
      2: { active: true, ranges: [makeRange(["10:00", "14:00", "in-person"], 15, 0, 2)] },
      3: { active: true, ranges: [
        makeRange(["09:00", "13:00", "in-person"], 15, 0, 2),
        makeRange(["16:00", "19:30", "online"], 20, 5, 1),
      ] },
      4: { active: true, ranges: [makeRange(["09:00", "12:00", "in-person"], 15, 0, 1)] },
      5: { active: false, ranges: [] },
      6: { active: false, ranges: [] },
    },
    offDays: [
      { id: nid("off"), startDate: addDaysISO(today, 12), endDate: addDaysISO(today, 14), reason: "مرخصی سفر خانوادگی" },
      { id: nid("off"), startDate: addDaysISO(today, 27), endDate: addDaysISO(today, 27), reason: "دوره آموزشی لیزر" },
    ],
    overrides: [
      {
        id: nid("ovr"),
        date: today,
        ranges: [
          makeRange(["09:00", "13:00", "in-person"], 15, 0, 2),
          makeRange(["16:00", "19:00", "in-person"], 15, 0, 2),
        ],
        note: "شیفت اضافه کلینیک",
      },
      {
        id: nid("ovr"),
        date: addDaysISO(today, 2),
        ranges: [makeRange(["08:00", "12:00", "in-person"], 15, 0, 2)],
        note: "جبران مرخصی هفته قبل",
      },
    ],
    isDemo: true,
  };

  const doctors: Doctor[] = [mainDoctor];
  const usedNames = new Set([mainDoctor.name]);

  // one more derma doctor, then cover the rest of the specialties
  for (let i = 0; i < 29; i++) {
    const specialtyId = i === 0 ? "derma" : SPECIALTIES[i % SPECIALTIES.length].id;
    const female = bool(0.5);
    let name = `دکتر ${personName(female ? "female" : "male")}`;
    let guard = 0;
    while (usedNames.has(name) && guard++ < 40) {
      name = `دکتر ${personName(female ? "female" : "male")}`;
    }
    usedNames.add(name);
    const city = pick(CITIES);
    const [feeMin, feeMax] = SPECIALTY_FEE_RANGE[specialtyId];
    const visitFee = Math.round(int(feeMin, feeMax) / 10_000) * 10_000;
    const experienceYears = int(3, 28);
    const activeDays = fakerFA.helpers
      .arrayElements([0, 1, 2, 3, 4, 5, 6], int(3, 5))
      .sort((a, b) => a - b);
    const verificationRoll = int(1, 100);
    const verification = verificationRoll <= 12 ? "pending" : verificationRoll <= 15 ? "rejected" : "verified";
    const accountStatus = verification === "pending" ? "pending" : verification === "rejected" ? "suspended" : bool(0.06) ? "suspended" : "active";
    const specialtyTitle = SPECIALTIES.find((s) => s.id === specialtyId)!.title;
    doctors.push({
      id: `doc-${String(i + 2).padStart(4, "0")}`,
      name,
      gender: female ? "female" : "male",
      specialtyId,
      city,
      address: `${city}، ${pick(P.ADDRESSES).replace("{n}", String(int(2, 240)))}`,
      licenseNumber: `${int(1, 99)}-${int(100000, 999999)}`,
      experienceYears,
      bio: `${name}، ${specialtyTitle}، با بیش از ${experienceYears} سال سابقه درمانی و آموزش. حوزه‌های کاری: ${pick(P.APPOINTMENT_REASONS)}، ${pick(P.APPOINTMENT_REASONS)} و مشاوره تخصصی. در حال حاضر عضو انجمن تخصصی مربوطه بوده و در سامانه دکترها نوبت حضوری و آنلاین ارائه می‌کنند.`,
      education: [
        `دکترای عمومی پزشکی از دانشگاه ${pick(P.EDU_UNIS)}`,
        `دکترای تخصصی ${specialtyTitle} از دانشگاه ${pick(P.EDU_UNIS)}`,
        bool(0.5) ? pick(P.CERTIFICATES) : `فلوشیپ ${pick(P.EDU_FIELDS)} از دانشگاه ${pick(P.EDU_UNIS)}`,
      ],
      certificates: fakerFA.helpers.arrayElements(P.CERTIFICATES, int(1, 3)),
      avatarHue: int(0, 359),
      visitFee,
      phoneFee: Math.round(visitFee * 0.7 / 10_000) * 10_000,
      textFee: Math.round(visitFee * 0.5 / 10_000) * 10_000,
      videoFee: Math.round(visitFee * 1.15 / 10_000) * 10_000,
      rating: 0,
      reviewCount: 0,
      verification,
      accountStatus,
      commissionRate: DEFAULT_COMMISSION_RATE + (bool(0.3) ? int(-3, 5) : 0),
      languages: fakerFA.helpers.arrayElements(LANGUAGES, bool(0.4) ? 2 : 1),
      insurers: fakerFA.helpers.arrayElements(INSURERS, int(1, 3)),
      availableOnline: bool(0.55),
      weeklySchedule: buildWeeklySchedule(activeDays, pick(RANGE_PRESETS), pick([15, 20, 30]), pick([0, 0, 5, 10]), int(1, 3)),
      offDays: bool(0.4)
        ? [{
            id: nid("off"),
            startDate: addDaysISO(today, int(5, 25)),
            endDate: addDaysISO(today, int(26, 30)),
            reason: pick(["مرخصی استعلاجی", "سفر کاری", "دوره آموزشی تخصصی", "مراسم خانوادگی"]),
          }]
        : [],
      overrides: [],
      isDemo: false,
    });
  }

  /* ---------------------------- patients ---------------------------- */

  const mainPatient: Patient = {
    id: "pat-0001",
    name: "علی رضایی",
    phone: "0912-345-6789",
    nationalId: "0079458123",
    gender: "male",
    birthDateISO: "1990-04-15",
    city: "تهران",
    address: "تهران، خیابان کارگر شمالی، کوچه گلستان، پلاک ۱۲",
    insurance: INSURERS[0],
    bloodType: "O+",
    walletBalance: 1_850_000,
    blocked: false,
    avatarHue: 210,
    allergies: ["پنی‌سیلین"],
    chronicConditions: ["فشار خون بالا"],
    family: [
      { id: nid("fam"), name: "سمیرا رضایی", relation: "همسر", gender: "female", birthDateISO: "1993-09-02", nationalId: "0064581223" },
      { id: nid("fam"), name: "نیما رضایی", relation: "پسر", gender: "male", birthDateISO: "2019-12-11", nationalId: "0091258744" },
      { id: nid("fam"), name: "شیرین کاظمی", relation: "مادر", gender: "female", birthDateISO: "1965-02-20", nationalId: "0021456987" },
    ],
    createdAtISO: `${subDaysISO(today, 380)}T09:12:00`,
    isDemo: true,
  };

  const patients: Patient[] = [mainPatient];
  const usedPatientNames = new Set([mainPatient.name]);
  for (let i = 0; i < 119; i++) {
    const female = bool(0.5);
    let name = personName(female ? "female" : "male");
    let guard = 0;
    while (usedPatientNames.has(name) && guard++ < 40) name = personName(female ? "female" : "male");
    usedPatientNames.add(name);
    // spread registration over last 12 months with growth (more recent = more)
    const daysAgo = Math.round(Math.abs(fakerFA.number.float({ min: -10, max: 360 })));
    patients.push({
      id: `pat-${String(i + 2).padStart(4, "0")}`,
      name,
      phone: `09${pick(["12", "19", "35", "02", "91", "21", "90"])}${String(int(1000000, 9999999))}`,
      nationalId: String(int(1000000000, 9999999999)),
      gender: female ? "female" : "male",
      birthDateISO: `${int(1935, 2005)}-${String(int(1, 12)).padStart(2, "0")}-${String(int(1, 28)).padStart(2, "0")}`,
      city: pick(CITIES),
      address: `${pick(CITIES)}، ${pick(P.ADDRESSES).replace("{n}", String(int(2, 240)))}`,
      insurance: pick(INSURERS),
      bloodType: pick(["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"]),
      walletBalance: bool(0.3) ? int(0, 2_000_000) : 0,
      blocked: bool(0.04),
      avatarHue: int(0, 359),
      allergies: bool(0.3) ? fakerFA.helpers.arrayElements(["پنی‌سیلین", "گردو", "پول پرند", "گلوتن", "لاکتوز", "آسپرین"], 1) : [],
      chronicConditions: bool(0.35) ? fakerFA.helpers.arrayElements(["دیابت نوع ۲", "فشار خون بالا", "آسم", "کم‌کاری تیروئید", "میگرن", "کم‌خونی"], int(1, 2)) : [],
      family: bool(0.25)
        ? [{
            id: nid("fam"),
            name: personName(bool(0.5) ? "female" : "male"),
            relation: pick(P.RELATIONS),
            gender: bool(0.5) ? "female" : "male",
            birthDateISO: `${int(1930, 2015)}-${String(int(1, 12)).padStart(2, "0")}-${String(int(1, 28)).padStart(2, "0")}`,
            nationalId: String(int(1000000000, 9999999999)),
          } satisfies FamilyMember]
        : [],
      createdAtISO: `${subDaysISO(today, daysAgo)}T${String(int(8, 21)).padStart(2, "0")}:${pick(["05", "17", "30", "45"])}:00`,
      isDemo: false,
    });
  }

  /* -------------------------- appointments -------------------------- */

  const appointments: Appointment[] = [];
  const activeDoctors = doctors.filter((d) => d.accountStatus === "active");

  function feeFor(doctor: Doctor, visitType: VisitType): number {
    if (visitType === "in-person") return doctor.visitFee;
    if (visitType === "phone") return doctor.phoneFee;
    if (visitType === "video") return doctor.videoFee;
    return doctor.textFee;
  }

  function addAppointment(
    doctor: Doctor,
    patient: Patient,
    dateISO: string,
    time: string,
    status: AppointmentStatus,
    visitType: VisitType = "in-person",
    opts: { forFamilyMember?: FamilyMember; reason?: string } = {}
  ): Appointment {
    const fee = feeFor(doctor, visitType);
    const paymentStatus =
      status === "completed" ? "paid" : status === "cancelled" ? (bool(0.5) ? "refunded" : "unpaid") : status === "no-show" ? "paid" : bool(0.85) ? "paid" : "unpaid";
    const a: Appointment = {
      id: nid("apt"),
      code: code("NO"),
      doctorId: doctor.id,
      patientId: patient.id,
      forFamilyMember: opts.forFamilyMember,
      date: dateISO,
      time,
      duration: visitType === "in-person" ? 15 : 20,
      visitType,
      status,
      paymentStatus,
      fee,
      commission: Math.round(fee * (doctor.commissionRate / 100)),
      reason: opts.reason ?? pick(P.APPOINTMENT_REASONS),
      notes: status === "completed" ? pick(P.APPOINTMENT_NOTES) : "",
      prescription: status === "completed" && bool(0.6) ? pick(P.PRESCRIPTIONS) : undefined,
      createdAtISO: randDateTime(subDaysISO(dateISO, int(1, 14)), 9, 21),
      isDemo: doctor.isDemo || patient.isDemo || undefined,
    };
    appointments.push(a);
    return a;
  }

  // main doctor: dense past + today + future appointments
  const mainPastDates: string[] = [];
  for (let back = 180; back >= 1; back--) {
    const dateISO = subDaysISO(today, back);
    if (isDoctorWorking(mainDoctor, dateISO) && bool(0.55)) mainPastDates.push(dateISO);
  }
  const usedSlotsKey = new Set<string>();
  const otherPatients = patients.slice(1);

  for (const dateISO of mainPastDates) {
    const slots = generateSlotsForDate(mainDoctor, dateISO, appointments);
    const slotsCount = Math.min(slots.length, int(1, 3));
    const chosen = fakerFA.helpers.arrayElements(slots, slotsCount);
    for (const slot of chosen) {
      const key = `${dateISO}|${slot.time}`;
      if (usedSlotsKey.has(key)) continue;
      usedSlotsKey.add(key);
      const patient = pick(otherPatients);
      const roll = int(1, 100);
      const status: AppointmentStatus = roll <= 78 ? "completed" : roll <= 88 ? "cancelled" : roll <= 96 ? "no-show" : "completed";
      const visitType: VisitType = slot.visitType === "online" ? pick(["video", "text", "phone"] as VisitType[]) : "in-person";
      addAppointment(mainDoctor, patient, dateISO, slot.time, status, visitType);
    }
  }

  // today's appointments for the main doctor (via override hours)
  {
    const todaySlots = generateSlotsForDate(mainDoctor, today, appointments);
    const morning = todaySlots.slice(0, Math.min(3, todaySlots.length));
    const evening = todaySlots.slice(3, 8);
    morning.forEach((slot, i) => {
      addAppointment(mainDoctor, pick(otherPatients), today, slot.time, i < 2 ? "completed" : "confirmed", "in-person");
    });
    evening.slice(0, 3).forEach((slot) => {
      addAppointment(mainDoctor, pick(otherPatients), today, slot.time, bool(0.6) ? "confirmed" : "pending", "in-person");
    });
  }

  // upcoming 30 days for main doctor
  for (let fwd = 1; fwd <= 30; fwd++) {
    const dateISO = addDaysISO(today, fwd);
    if (!isDoctorWorking(mainDoctor, dateISO) || !bool(0.7)) continue;
    const slots = generateSlotsForDate(mainDoctor, dateISO, appointments);
    const chosen = fakerFA.helpers.arrayElements(slots, int(0, 3));
    for (const slot of chosen) {
      const key = `${dateISO}|${slot.time}`;
      if (usedSlotsKey.has(key)) continue;
      usedSlotsKey.add(key);
      const roll = int(1, 100);
      addAppointment(mainDoctor, pick(otherPatients), dateISO, slot.time, roll <= 60 ? "confirmed" : "pending", slot.visitType === "online" ? "video" : "in-person");
    }
  }

  // main patient: personal history across doctors + upcoming
  {
    const heartDoc = doctors.find((d) => d.specialtyId === "cardio")!;
    const pedsDoc = doctors.find((d) => d.specialtyId === "peds")!;
    const nutriDoc = doctors.find((d) => d.specialtyId === "nutrition")!;
    // yesterday completed visit with main doctor (review prompt)
    let yesterday = subDaysISO(today, 1);
    while (!isDoctorWorking(mainDoctor, yesterday)) yesterday = subDaysISO(yesterday, 1);
    addAppointment(mainDoctor, mainPatient, yesterday, "10:00", "completed", "in-person", { reason: "پیگیری درمان جوشگاه" });
    // upcoming confirmed tomorrow at 10:00
    let tomorrow = addDaysISO(today, 1);
    while (!isDoctorWorking(mainDoctor, tomorrow)) tomorrow = addDaysISO(tomorrow, 1);
    addAppointment(mainDoctor, mainPatient, tomorrow, "10:00", "confirmed", "in-person", { reason: "بررسی تکمیل درمان" });
    // pending with cardio doctor in 5 days
    addAppointment(heartDoc, mainPatient, addDaysISO(today, 5), "12:30", "pending", "in-person", { reason: "کنترل فشار خون" });
    // completed visit for the son (family member booking demo)
    const son = mainPatient.family[1];
    addAppointment(pedsDoc, mainPatient, subDaysISO(today, 20), "09:30", "completed", "in-person", { reason: "واکسیناسیون کودک", forFamilyMember: son });
    // a cancelled one
    addAppointment(nutriDoc, mainPatient, subDaysISO(today, 12), "16:00", "cancelled", "in-person", { reason: "مشاوره رژیم غذایی" });
    // history with main doctor
    for (const back of [25, 42, 70, 95, 120, 160, 200]) {
      let d = subDaysISO(today, back);
      while (!isDoctorWorking(mainDoctor, d)) d = subDaysISO(d, 1);
      addAppointment(mainDoctor, mainPatient, d, pick(["09:00", "09:15", "10:30", "11:45"]), "completed", "in-person");
    }
  }

  // other active doctors: past + a few upcoming
  for (const doctor of activeDoctors) {
    if (doctor.id === mainDoctor.id) continue;
    let count = 0;
    for (let back = 180; back >= 1 && count < 17; back -= 2) {
      const dateISO = subDaysISO(today, back);
      if (!isDoctorWorking(doctor, dateISO) || !bool(0.5)) continue;
      count++;
      const roll = int(1, 100);
      const status: AppointmentStatus = roll <= 82 ? "completed" : roll <= 91 ? "cancelled" : "no-show";
      addAppointment(doctor, pick(patients), dateISO, randTime(), status, bool(0.12) ? "video" : "in-person");
    }
    // a couple of upcoming
    for (const fwd of [2, 4, 7, 11, 15, 21, 26]) {
      if (!bool(0.45)) continue;
      const dateISO = addDaysISO(today, fwd);
      if (!isDoctorWorking(doctor, dateISO)) continue;
      addAppointment(doctor, pick(patients), dateISO, randTime(), bool(0.65) ? "confirmed" : "pending", bool(0.15) ? "video" : "in-person");
    }
  }

  /* --------------------------- consultations ------------------------ */

  const consultations: Consultation[] = [];
  const onlineDoctors = activeDoctors.filter((d) => d.availableOnline);

  function addConsultation(
    doctor: Doctor,
    patient: Patient,
    status: Consultation["status"],
    type: Consultation["type"],
    createdDaysAgo: number,
    deadlineHours = 24
  ): Consultation {
    const createdAtISO = randDateTime(subDaysISO(today, createdDaysAgo), 9, 21);
    const deadlineISO = plusHours(createdAtISO, deadlineHours);
    const messages: Consultation["messages"] = [
      {
        id: nid("msg"),
        sender: "patient",
        text: `${pick(P.CONSULT_SUBJECTS)}\n${pick(P.CONSULT_QUESTIONS)}`,
        attachments: bool(0.25) ? [{ name: "report.jpg", sizeKB: int(120, 900), type: "image" as const }] : [],
        sentAtISO: createdAtISO,
      },
    ];
    if (status === "answered" || status === "closed") {
      messages.push({
        id: nid("msg"),
        sender: "doctor",
        text: pick(P.CONSULT_ANSWERS),
        attachments: [],
        sentAtISO: randDateTime(subDaysISO(today, Math.max(0, createdDaysAgo - 1)), 8, 22),
      });
      if (bool(0.5)) {
        messages.push({
          id: nid("msg"),
          sender: "patient",
          text: pick(P.CONSULT_FOLLOWUPS),
          attachments: [],
          sentAtISO: randDateTime(subDaysISO(today, Math.max(0, createdDaysAgo - 1)), 8, 22),
        });
        if (bool(0.4)) {
          messages.push({
            id: nid("msg"),
            sender: "doctor",
            text: pick(P.CONSULT_ANSWERS),
            attachments: [],
            sentAtISO: randDateTime(subDaysISO(today, Math.max(0, createdDaysAgo - 2)), 8, 22),
          });
        }
      }
    }
    const fee = type === "text" ? doctor.textFee : type === "phone" ? doctor.phoneFee : doctor.videoFee;
    const c: Consultation = {
      id: nid("con"),
      code: code("CO"),
      doctorId: doctor.id,
      patientId: patient.id,
      type,
      status,
      subject: pick(P.CONSULT_SUBJECTS),
      question: pick(P.CONSULT_QUESTIONS),
      messages,
      fee,
      paymentStatus: "paid",
      createdAtISO,
      deadlineISO,
      prescriptionNote: status === "closed" && bool(0.5) ? pick(P.PRESCRIPTIONS) : undefined,
      isDemo: doctor.isDemo || patient.isDemo || undefined,
    };
    consultations.push(c);
    return c;
  }

  // main doctor consultations
  for (let i = 0; i < 16; i++) addConsultation(mainDoctor, pick(otherPatients), "answered", pick(["text", "text", "video", "phone"] as const), int(2, 30));
  // waiting ones (2 overdue, 6 normal)
  for (let i = 0; i < 2; i++) addConsultation(mainDoctor, pick(otherPatients), "waiting", "text", 2, -2); // overdue
  for (let i = 0; i < 6; i++) addConsultation(mainDoctor, pick(otherPatients), "waiting", pick(["text", "video"] as const), 0, 18);
  for (let i = 0; i < 8; i++) addConsultation(mainDoctor, pick(otherPatients), "closed", pick(["text", "phone", "video"] as const), int(20, 90));

  // main patient consultations
  addConsultation(mainDoctor, mainPatient, "answered", "text", 3);
  addConsultation(mainDoctor, mainPatient, "waiting", "text", 0, 20);
  addConsultation(mainDoctor, mainPatient, "closed", "video", 30);
  addConsultation(pick(onlineDoctors), mainPatient, "answered", "phone", 10);
  addConsultation(pick(onlineDoctors), mainPatient, "waiting", "text", 1);

  // others
  for (let i = 0; i < 175; i++) {
    const doctor = pick(onlineDoctors);
    const status = pick(["answered", "answered", "waiting", "closed", "answered", "closed", "waiting"] as const);
    addConsultation(doctor, pick(otherPatients), status, pick(["text", "text", "text", "video", "phone"] as const), int(1, 150));
  }

  /* ------------------------------- reviews --------------------------- */

  const reviews: Review[] = [];
  const completedForMain = appointments.filter((a) => a.doctorId === mainDoctor.id && a.status === "completed");
  fakerFA.helpers
    .arrayElements(completedForMain, Math.min(24, completedForMain.length))
    .forEach((a) => {
      reviews.push({
        id: nid("rev"),
        doctorId: mainDoctor.id,
        patientId: a.patientId,
        appointmentId: a.id,
        rating: pick([5, 5, 5, 5, 5, 4, 4, 4, 4, 3, 5, 2, 5, 4, 5, 3, 5, 4, 5, 5, 4, 5, 5, 4]),
        comment: pick(P.REVIEW_COMMENTS),
        reply: bool(0.4) ? pick(P.REVIEW_REPLIES) : undefined,
        status: "published",
        createdAtISO: randDateTime(a.date, 10, 21),
      });
    });

  for (const doctor of doctors) {
    if (doctor.id === mainDoctor.id) continue;
    const completed = appointments.filter((a) => a.doctorId === doctor.id && a.status === "completed");
    const chosen = fakerFA.helpers.arrayElements(completed, Math.min(5, completed.length));
    for (const a of chosen) {
      const roll = int(1, 100);
      const status = roll <= 88 ? "published" : roll <= 94 ? "pending" : "hidden";
      reviews.push({
        id: nid("rev"),
        doctorId: doctor.id,
        patientId: a.patientId,
        appointmentId: a.id,
        rating: pick([5, 5, 5, 4, 4, 4, 4, 3, 5, 2]),
        comment: pick(P.REVIEW_COMMENTS),
        reply: bool(0.3) ? pick(P.REVIEW_REPLIES) : undefined,
        status: status as Review["status"],
        createdAtISO: randDateTime(a.date, 10, 21),
      });
    }
  }

  // sync doctor rating/reviewCount with seeded reviews (consistency!)
  for (const doctor of doctors) {
    const docsReviews = reviews.filter((r) => r.doctorId === doctor.id);
    doctor.reviewCount = docsReviews.length;
    doctor.rating = docsReviews.length
      ? Math.round((docsReviews.reduce((s, r) => s + r.rating, 0) / docsReviews.length) * 10) / 10
      : 4.5;
  }

  /* ----------------------------- lab orders -------------------------- */

  const labOrders: LabOrder[] = [];
  function addLabOrder(patient: Patient, statusIndex: number, daysAgo: number): void {
    const tests = fakerFA.helpers.arrayElements(LAB_TESTS, int(1, 4)).map((t) => ({ id: t.id, name: t.name, price: t.price }));
    const totalFee = tests.reduce((s, t) => s + t.price, 0);
    const lab = pick(labCenters);
    const createdAt = randDateTime(subDaysISO(today, daysAgo), 8, 20);
    const status = LAB_ORDER_STEPS[statusIndex];
    const history: LabOrder["history"] = [];
    for (let s = 0; s <= statusIndex; s++) {
      history.push({ status: LAB_ORDER_STEPS[s], atISO: s === 0 ? createdAt : randDateTime(subDaysISO(today, Math.max(0, daysAgo - s * 2)), 8, 20) });
    }
    labOrders.push({
      id: nid("lab"),
      code: code("LB"),
      patientId: patient.id,
      labId: lab.id,
      doctorId: bool(0.5) ? mainDoctor.id : pick(doctors).id,
      tests,
      totalFee,
      status,
      paymentStatus: statusIndex >= 2 ? "paid" : "unpaid",
      prescriptionFile: bool(0.4) ? { name: "نسخه آزمایش.pdf", sizeKB: int(100, 600), type: "pdf" } : undefined,
      homeSampling: bool(0.35),
      history,
      createdAtISO: createdAt,
      resultNote: status === "received" ? "همه مقادیر در محدوده نرمال هستند؛ نتیجه تفصیلی در فایل PDF پیوست است." : undefined,
      isDemo: patient.isDemo || undefined,
    });
  }

  // main patient: one order at each step
  addLabOrder(mainPatient, 5, 6); // received
  addLabOrder(mainPatient, 4, 2); // processing
  addLabOrder(mainPatient, 3, 1); // sampling
  addLabOrder(mainPatient, 2, 1); // paid
  addLabOrder(mainPatient, 1, 0); // review
  addLabOrder(mainPatient, 0, 0); // registered
  for (let i = 0; i < 74; i++) {
    addLabOrder(pick(patients), int(0, 5), int(1, 45));
  }

  /* ---------------------------- transactions ------------------------ */

  const transactions: Transaction[] = [];
  for (const a of appointments) {
    if (a.paymentStatus !== "paid") continue;
    transactions.push({
      id: nid("trx"),
      code: code("TR"),
      kind: a.visitType === "in-person" ? "appointment" : "consultation",
      amount: a.fee,
      direction: "in",
      patientId: a.patientId,
      doctorId: a.doctorId,
      appointmentId: a.id,
      status: "success",
      description: `پرداخت نوبت ${a.code} — ${a.visitType === "in-person" ? "ویزیت حضوری" : "ویزیت آنلاین"}`,
      createdAtISO: randDateTime(a.date, 9, 21),
    });
  }
  for (const c of consultations) {
    transactions.push({
      id: nid("trx"),
      code: code("TR"),
      kind: "consultation",
      amount: c.fee,
      direction: "in",
      patientId: c.patientId,
      doctorId: c.doctorId,
      consultationId: c.id,
      status: "success",
      description: `پرداخت مشاوره ${c.code}`,
      createdAtISO: c.createdAtISO,
    });
  }
  for (const l of labOrders) {
    if (l.paymentStatus !== "paid") continue;
    transactions.push({
      id: nid("trx"),
      code: code("TR"),
      kind: "lab",
      amount: l.totalFee,
      direction: "in",
      patientId: l.patientId,
      labOrderId: l.id,
      status: "success",
      description: `پرداخت آزمایش ${l.code}`,
      createdAtISO: l.history[Math.min(2, l.history.length - 1)].atISO,
    });
  }
  // topups
  for (const p of fakerFA.helpers.arrayElements(patients, 55)) {
    transactions.push({
      id: nid("trx"),
      code: code("TR"),
      kind: "topup",
      amount: int(1, 20) * 100_000,
      direction: "in",
      patientId: p.id,
      status: "success",
      description: "شارژ کیف پول",
      createdAtISO: randDateTime(subDaysISO(today, int(1, 170)), 8, 22),
    });
  }
  // refunds for some cancelled+refunded appointments
  for (const a of appointments) {
    if (a.status === "cancelled" && a.paymentStatus === "refunded" && bool(0.7)) {
      transactions.push({
        id: nid("trx"),
        code: code("TR"),
        kind: "refund",
        amount: a.fee,
        direction: "out",
        patientId: a.patientId,
        doctorId: a.doctorId,
        appointmentId: a.id,
        status: "success",
        description: `بازگشت وجه نوبت لغوشده ${a.code}`,
        createdAtISO: randDateTime(a.date, 9, 21),
      });
    }
  }

  /* ---------------------------- settlements -------------------------- */

  const settlements: Settlement[] = [];
  const bankNames = ["بانک ملت", "بانک سامان", "بانک پارسیان", "بانک صادرات", "بانک ملی"];
  function doctorEarnings(d: Doctor): number {
    return transactions
      .filter((t) => t.doctorId === d.id && t.kind === "appointment" || t.kind === "consultation" && t.doctorId === d.id)
      .reduce((s, t) => s + Math.round(t.amount * (1 - d.commissionRate / 100)), 0);
  }
  function addSettlement(doctor: Doctor, status: Settlement["status"], daysAgo: number, ratio = 0.15): void {
    const amount = Math.max(500_000, Math.round(doctorEarnings(doctor) * ratio));
    const s: Settlement = {
      id: nid("stl"),
      code: code("ST"),
      doctorId: doctor.id,
      amount,
      status,
      requestedAtISO: randDateTime(subDaysISO(today, daysAgo), 9, 18),
      paidAtISO: status === "paid" ? randDateTime(subDaysISO(today, Math.max(1, daysAgo - 3)), 10, 16) : undefined,
      bankName: pick(bankNames),
      iban: `IR${String(int(10, 99))}${String(int(100000000000, 999999999999))}0${int(100, 999)}`,
      note: status === "rejected" ? "مغایرت در اطلاعات حساب بانکی — لطفاً شماره شبا را اصلاح کنید" : undefined,
    };
    settlements.push(s);
    if (status === "paid") {
      transactions.push({
        id: nid("trx"),
        code: code("TR"),
        kind: "settlement",
        amount,
        direction: "out",
        doctorId: doctor.id,
        settlementId: s.id,
        status: "success",
        description: `تسویه حساب ${s.code}`,
        createdAtISO: s.paidAtISO!,
      });
    }
  }

  addSettlement(mainDoctor, "pending", 1, 0.1);
  addSettlement(mainDoctor, "paid", 35, 0.2);
  addSettlement(mainDoctor, "approved", 3, 0.08);
  for (const doctor of fakerFA.helpers.arrayElements(activeDoctors.filter((d) => d.id !== mainDoctor.id), 12)) {
    addSettlement(doctor, pick(["pending", "paid", "approved", "paid", "rejected"] as Settlement["status"][]), int(2, 60), 0.2);
  }

  /* ------------------------------ staff ------------------------------ */

  const PERMISSION_KEYS = [
    "dashboard", "doctors", "patients", "appointments", "centers", "services", "finance",
    "discounts", "reviews", "content", "banners", "support", "staff", "audit", "settings",
  ];
  const allPerms = Object.fromEntries(PERMISSION_KEYS.map((k) => [k, true]));
  const supportPerms = Object.fromEntries(PERMISSION_KEYS.map((k) => [k, k === "support" || k === "dashboard"]));
  const staff: DbSeed["staff"] = [
    { id: "stf-0001", name: "محمد کریمی", role: "admin", email: "admin@doktorha.ir", avatarHue: 258, active: true, permissions: allPerms },
    { id: "stf-0002", name: "نگار حسینی", role: "support", email: "support1@doktorha.ir", avatarHue: 330, active: true, permissions: supportPerms },
    { id: "stf-0003", name: "مریم صابری", role: "support", email: "support2@doktorha.ir", avatarHue: 28, active: true, permissions: supportPerms },
    { id: "stf-0004", name: "حسین دلاوری", role: "support", email: "support3@doktorha.ir", avatarHue: 200, active: false, permissions: supportPerms },
    { id: "stf-0005", name: "زهرا رحیمی", role: "admin", email: "admin2@doktorha.ir", avatarHue: 100, active: true, permissions: { ...allPerms, settings: false, staff: false } },
  ];

  /* ------------------------------ tickets ---------------------------- */

  const tickets: Ticket[] = [];
  const supportAgents = staff.filter((s) => s.role === "support" && s.active);
  const ticketCategories = Object.keys(P.TICKET_SUBJECTS);
  type TicketMessageT = Ticket["messages"][number];

  function addTicket(opts: {
    creatorId: string;
    creatorRole: "patient" | "doctor";
    creatorName: string;
    category: TicketCategory;
    priority: TicketPriority;
    status: TicketStatus;
    daysAgo: number;
    body?: string;
    relatedEntity?: [Ticket["relatedEntityType"], string | undefined];
  }): Ticket {
    const createdAtISO = randDateTime(subDaysISO(today, opts.daysAgo), 8, 22);
    const subject = pick(P.TICKET_SUBJECTS[opts.category]);
    const messages: TicketMessageT[] = [
      {
        id: nid("tmsg"),
        senderId: opts.creatorId,
        senderRole: opts.creatorRole,
        senderName: opts.creatorName,
        text: opts.body ?? P.TICKET_BODIES[opts.category]
          .replace("{doctor}", mainDoctor.name)
          .replace("{code}", `NO-${int(10000, 99999)}`),
        internal: false,
        attachments: [],
        sentAtISO: createdAtISO,
      },
    ];
    let firstResponseAtISO: string | undefined;
    let resolvedAtISO: string | undefined;
    if (opts.status !== "open") {
      firstResponseAtISO = plusHours(createdAtISO, int(1, 8));
      messages.push({
        id: nid("tmsg"),
        senderId: supportAgents[0].id,
        senderRole: "support",
        senderName: supportAgents[0].name,
        text: pick(P.TICKET_SUPPORT_REPLIES),
        internal: false,
        attachments: [],
        sentAtISO: firstResponseAtISO,
      });
      if (bool(0.5)) {
        messages.push({
          id: nid("tmsg"),
          senderId: opts.creatorId,
          senderRole: opts.creatorRole,
          senderName: opts.creatorName,
          text: pick(P.TICKET_USER_REPLIES),
          internal: false,
          attachments: [],
          sentAtISO: plusHours(firstResponseAtISO, int(2, 12)),
        });
        if (bool(0.4)) {
          messages.push({
            id: nid("tmsg"),
            senderId: supportAgents[0].id,
            senderRole: "support",
            senderName: supportAgents[0].name,
            text: pick(P.TICKET_SUPPORT_REPLIES),
            internal: false,
            attachments: [],
            sentAtISO: plusHours(firstResponseAtISO, int(4, 20)),
          });
        }
      }
      if (bool(0.4)) {
        messages.push({
          id: nid("tmsg"),
          senderId: supportAgents[0].id,
          senderRole: "support",
          senderName: supportAgents[0].name,
          text: pick(P.INTERNAL_NOTES),
          internal: true,
          attachments: [],
          sentAtISO: plusHours(firstResponseAtISO, int(1, 4)),
        });
      }
    }
    if (opts.status === "closed") {
      resolvedAtISO = plusHours(messages[messages.length - 1].sentAtISO, int(3, 30));
    }
    const t: Ticket = {
      id: nid("tkt"),
      code: code("TK"),
      subject,
      creatorId: opts.creatorId,
      creatorRole: opts.creatorRole,
      creatorName: opts.creatorName,
      category: opts.category,
      priority: opts.priority,
      status: opts.status,
      messages,
      assignedAgentId: opts.status === "open" && bool(0.4) ? undefined : pick(supportAgents).id,
      relatedEntityType: opts.relatedEntity?.[0],
      relatedEntityId: opts.relatedEntity?.[1],
      createdAtISO,
      updatedAtISO: messages[messages.length - 1].sentAtISO,
      firstResponseAtISO,
      resolvedAtISO,
      rating: opts.status === "closed" ? pick([5, 5, 4, 5, 4, 3]) : undefined,
      ratingComment: opts.status === "closed" && bool(0.4) ? "پاسخ سریع و حل کامل مشکل. ممنون از تیم پشتیبانی." : undefined,
      isDemo: opts.creatorId === mainPatient.id || opts.creatorId === mainDoctor.id || undefined,
    };
    tickets.push(t);
    return t;
  }

  const cat = (c: string) => c as TicketCategory;

  // main patient & main doctor tickets
  addTicket({ creatorId: mainPatient.id, creatorRole: "patient", creatorName: mainPatient.name, category: cat("payment"), priority: "high", status: "answered", daysAgo: 0, body: "سلام، مبلغ نوبت پرداخت شد ولی همچنان در بخش پرداخت‌های من وضعیت «در انتظار» است. لطفاً بررسی کنید." });
  addTicket({ creatorId: mainPatient.id, creatorRole: "patient", creatorName: mainPatient.name, category: cat("lab"), priority: "medium", status: "closed", daysAgo: 8, relatedEntity: ["lab-order", labOrders.find((l) => l.patientId === mainPatient.id && l.status === "received")?.id] });
  addTicket({ creatorId: mainPatient.id, creatorRole: "patient", creatorName: mainPatient.name, category: cat("booking"), priority: "low", status: "open", daysAgo: 0, body: "سلام، امکان انتخاب نوبت حضوری بعد از ساعت ۱۸ برای دکتر سارا محمدی میشه اضافه بشه؟" });
  addTicket({ creatorId: mainPatient.id, creatorRole: "patient", creatorName: mainPatient.name, category: cat("technical"), priority: "medium", status: "in-progress", daysAgo: 1 });
  addTicket({ creatorId: mainDoctor.id, creatorRole: "doctor", creatorName: mainDoctor.name, category: cat("payment"), priority: "high", status: "in-progress", daysAgo: 0, body: "سلام، درخواست تسویه دو روز پیش ثبت شده و هنوز بررسی نشده. لطفاً پیگیری شود." });
  addTicket({ creatorId: mainDoctor.id, creatorRole: "doctor", creatorName: mainDoctor.name, category: cat("technical"), priority: "medium", status: "answered", daysAgo: 3, body: "در تقویم نوبت‌ها، روز چهارشنبه ساعت ۱۱ به بعد نمایش داده نمی‌شود." });

  // general population
  const statusesPlan: TicketStatus[] = [
    ...Array(12).fill("open"), ...Array(9).fill("in-progress"), ...Array(8).fill("awaiting-user"),
    ...Array(13).fill("answered"), ...Array(12).fill("closed"),
  ];
  const priorities: TicketPriority[] = ["low", "medium", "medium", "high", "medium", "urgent", "high", "low", "medium"];
  for (const status of statusesPlan) {
    const fromDoctor = bool(0.35);
    const creator = fromDoctor ? pick(doctors) : pick(patients);
    addTicket({
      creatorId: creator.id,
      creatorRole: fromDoctor ? "doctor" : "patient",
      creatorName: creator.name,
      category: cat(pick(ticketCategories)),
      priority: pick(priorities),
      status,
      daysAgo: int(0, 40),
    });
  }
  // some overdue open tickets for SLA highlighting
  for (let i = 0; i < 4; i++) {
    const fromDoctor = bool(0.4);
    const creator = fromDoctor ? pick(doctors) : pick(patients);
    addTicket({
      creatorId: creator.id,
      creatorRole: fromDoctor ? "doctor" : "patient",
      creatorName: creator.name,
      category: cat(pick(ticketCategories)),
      priority: "urgent",
      status: "open",
      daysAgo: int(2, 5),
    });
  }

  /* ---------------------------- canned/faq --------------------------- */

  const cannedReplies: DbSeed["cannedReplies"] = P.CAN_REPLIES.map((r, i) => ({ id: `crl-${i + 1}`, ...r }));
  const faqs: DbSeed["faqs"] = P.FAQ_ITEMS.map((f, i) => ({
    id: `faq-${i + 1}`,
    question: f.q,
    answer: f.a,
    category: i < 2 ? "booking" : i === 2 ? "consult" : i === 3 ? "lab" : i === 4 ? "payment" : i === 5 ? "booking" : i === 6 ? "other" : "technical",
    published: true,
    order: i + 1,
  }));

  /* ----------------------------- articles ---------------------------- */

  const mkArticle = (
    i: number,
    title: string,
    category: string,
    excerpt: string,
    body: string,
    tags: string[],
    status: "published" | "draft",
    readMinutes: number
  ): DbSeed["articles"][number] => ({
    id: `art-${i}`,
    title,
    slug: `mag-${i}`,
    category,
    excerpt,
    body,
    authorName: i === 1 ? mainDoctor.name : "تحریریه دکترها",
    doctorId: i === 1 ? mainDoctor.id : undefined,
    coverHue: (i * 47) % 360,
    status,
    publishedAtISO: `${subDaysISO(today, i * 6 + 3)}T10:00:00`,
    readMinutes,
    views: int(350, 12400),
    tags,
  });

  const articles: DbSeed["articles"] = [
    mkArticle(1, "راهنمای مراقبت از پوست در فصل سرد", "پوست و مو",
      "سرما و بادهای زمستانی سد دفاعی پوست را تضعیف می‌کنند؛ با این چند توصیه ساده پوست خود را حفظ کنید.",
      "با فرا رسیدن ماه‌های سرد، بسیاری از ما با خشکی پوست، قرمزی و خارش روبه‌رو می‌شویم. دلیل اصلی این مشکل، کاهش رطوبت هوا و آسیب سد چربی طبیعی پوست است.\n\nاولین توصیه، استفاده روزانه از مرطوب‌کننده‌های بدون عطر است. کرم‌های حاوی سرامید و گلیسرین سد پوستی را بازسازی می‌کنند و بهترین زمان مصرف، بلافاصله بعد از حمام است. دومین نکته، پرهیز از آب داغ است؛ آب ولرم رطوبت پوست را کمتر تخلیه می‌کند.\n\nاستفاده از ضدآفتاب در زمستان را فراموش نکنید؛ اشعه UVA در روزهای ابری هم فعال است و لک‌ها را تشدید می‌کند. اگر پوست شما مستعد اگزما است، از شوینده‌های ملایم و فاقد سولفات استفاده کنید و هومیدیفایر (رطوبت‌ساز) در اتاق خواب داشته باشید.\n\nدر صورت بروز ترک، خونریزی یا خارش شدید که با مراقبت خانگی بهبود نمی‌یابد، معاینه توسط متخصص پوست توصیه می‌شود.",
      ["پوست", "مراقبت", "زمستان"], "published", 4),
    mkArticle(2, "۱۰ توصیه تغذیه‌ای برای کنترل قند خون", "تغذیه",
      "رژیم غذایی مناسب می‌تواند قند خون را بدون افزایش دارو در محدوده سالم نگه دارد.",
      "کنترل قند خون تنها با دارو ممکن نیست؛ الگوی غذایی نقشی تعیین‌کننده دارد. اول، وعده‌های اصلی را حذف نکنید و آن‌ها را به ۵ وعده کوچک تقسیم کنید تا قند خون نوسان کمتری داشته باشد.\n\nدوم، الیاف را افزایش دهید؛ سبزیجات، حبوبات و جو دوسر جذب قند را کند می‌کنند. سوم، نان سفید و برنج سفید را با نان سبوس‌دار و برنج قهوه‌ای جایگزین کنید.\n\nنوشیدنی‌های شیرین را حذف کنید و به‌جای آبمیوه، میوه کامل با الیاف مصرف کنید. مصرف پروتئین کم‌چرب در هر وعده، سیری طولانی‌تری ایجاد می‌کند. در نهایت، پیگیری منظم قند ناشتا و مشاوره با پزشک متخصص تغذیه یا غدد، برنامه را شخصی‌سازی می‌کند.",
      ["دیابت", "تغذیه", "قند خون"], "published", 5),
    mkArticle(3, "فشار خون بالا؛ قاتل خاموش را جدی بگیریم", "سلامت قلب",
      "فشار خون بالا سال‌ها بدون علامت است اما خطر سکته و نارسایی قلبی را چند برابر می‌کند.",
      "فشار خون بالا به «قاتل خاموش» معروف است؛ چون اغلب تا زمان بروز عارضه جدی، علامتی ندارد. حدود یک‌سوم بزرگسالان به آن مبتلا هستند و بسیاری از آن بی‌خبرند.\n\nکاهش مصرف نمک به کمتر از ۵ گرم در روز، پیاده‌روی ۳۰ دقیقه‌ای روزانه، ترک سیگار و کنترل وزن، چهار ستون پیشگیری هستند. قهوه و انرژی‌زاها فشار لحظه‌ای را بالا می‌برند؛ مصرف آن‌ها را مقتصدانه مدیریت کنید.\n\nاگر سابقه خانوادگی دارید، فشار خون را هفته‌ای یک بار در خانه اندازه‌گیری کنید. اعداد بالای ۱۴۰/۹۰ نیاز به ارزیابی پزشکی دارد. در سامانه دکترها می‌توانید بدون معطلی از پزشکان قلب نوبت حضوری یا مشاوره تلفنی بگیرید.",
      ["فشار خون", "قلب", "پیشگیری"], "published", 4),
    mkArticle(4, "اضطراب شبانه؛ راهکارهای عملی برای خواب آرام", "سلامت روان",
      "ذهن پر از نگرانی، خواب را می‌دزدد. با این تکنیک‌ها آرامش شبانه را بازگردانید.",
      "خیلی از ما شب‌ها با اضطراب به تخت می‌رویم: فهرست کارهای فردا، نگرانی‌های مالی یا مسائل خانوادگی. نتیجه، خواب دیرهنگام و بی‌کیفیت است.\n\nتکنیک اول: «ساعت نگرانی» — یک زمان مشخص در بعدازظهر برای نوشتن نگرانی‌ها و اقدام بعدی هر کدام. ذهن وقتی نگرانی روی کاغذ بیاید، آرام‌تر می‌شود.\n\nتکنیک دوم: ورزش ریتمیک نفس؛ چهار ثانیه دم، چهار ثانیه نگه‌داشتن، شش ثانیه بازدم. این ریتم سیستم پاراسمپاتیک را فعال می‌کند.\n\nسوم: محیط خواب را فقط برای خواب نگه دارید؛ موبایل یک ساعت قبل از خواب کنار گذاشته شود. اگر اضطراب بیش از سه هفته ادامه داشت یا با تپش قلب و حملات هراس همراه بود، مشاوره با روانپزشک یا روان‌شناس را جدی بگیرید؛ مشاوره متنی و تلفنی در دکترها بدون مراجعه حضوری در دسترس است.",
      ["اضطراب", "خواب", "سلامت روان"], "published", 6),
    mkArticle(5, "تب کودکان؛ چه زمانی نگران‌کننده است؟", "کودکان",
      "تب در کودکان همیشه خطرناک نیست، اما چند نشانه خطر است که باید فوراً به پزشک مراجعه کنید.",
      "تب، واکنش طبیعی بدن کودک به عفونت است و در اکثر موارد بی‌خطر. اما برای والدان، شب‌های تب‌دار سخت‌ترین لحظات هستند.\n\nدر کودکان زیر ۳ ماه، هر تب بالای ۳۸ درجه نیاز به مراجعه فوری دارد. در کودکان بزرگ‌تر، اگر تب بیش از سه روز ادامه یافت، کودک بی‌اشتها و کم‌انرژی بود، دچار تشنج شد یا علائم کم‌آبی (خشکی دهان، کاهش ادرار) داشت، حتماً به پزشک مراجعه کنید.\n\nاستامینامفن یا ایبوپروفن با دوز مناسب وزن، لباس نازک و مایعات فراوان کمک‌کننده‌اند. پاشویه با الکل و آب سرد ممنوع است؛ لرز بدتر می‌شود.\n\nبرای مشاوره شبانه، می‌توانید از بخش مشاوره متنی با پزشکان اطفال سامانه استفاده کنید؛ پاسخ‌ها معمولاً در کمتر از چند دقیقه ثبت می‌شود.",
      ["کودکان", "تب", "والدین"], "published", 3),
    mkArticle(6, "خشکی چشم در عصر نمایشگرها", "چشم",
      "ساعت‌ها نگاه به صفحه‌نمایش، اشک را تبخیر می‌کند. قانون ۲۰-۲۰-۲۰ را بشناسید.",
      "سندرم خشکی چشم در کاربران صفحه‌نمایش چند برابر شده است. وقتی به صفحه خیره می‌شویم، تعداد پلک‌زدن از ۱۵ بار در دقیقه به ۵ بار کاهش می‌یابد و لایه اشک تبخیر می‌شود.\n\nقانون ۲۰-۲۰-۲۰: هر ۲۰ دقیقه، ۲۰ ثانیه به فاصله‌ای حدود ۶ متری نگاه کنید. ارتفاع صفحه‌نمایش کمی پایین‌تر از سطح چشم باشد تا پلک‌ها بسته‌تر بمانند.\n\nاستفاده از قطره اشک مصنوعی بدون نگهدارنده، برای موارد خفیف کافی است. در خشکی‌های شدید با سوزش و تاری دید، معاینه چشم‌پزشک و آزمایش اشک توصیه می‌شود. مصرف آب کافی و رطوبت مناسب محیط نیز مؤثر است.",
      ["چشم", "نمایشگر", "خشکی چشم"], "published", 3),
    mkArticle(7, "بهداشت دهان و دندان؛ فراتر از مسواک", "دندان",
      "مسواک تنها ۶۰٪ سطح دندان را تمیز می‌کند؛ نخ دندان و مسواک بین‌دندانی را جدی بگیرید.",
      "همه مسواک می‌زنیم، اما آمار پوسیدگی و بیماری لثه همچنان بالاست. دلیل اصلی، نادیده گرفتن فضاهای بین دندانی است؛ جایی که مسواک به آن نمی‌رسد و ۴۰٪ سطح دندان‌ها را تشکیل می‌دهد.\n\nنخ دندان روزی یک بار، ترجیحاً قبل از خواب، پلاک بین دندانی را حذف می‌کند. مسواک بین‌دندانی برای فاصله‌های بازتر مؤثرتر است.\n\nمسواک‌زدن دو دقیقه‌ای با حرکت چرخشی ملایم و خمیردندان حاوی فلوراید استاندارد طلایی است. زبان را هم مسواک بزنید؛ منبع اصلی بوی دهان است.\n\nجرم‌گیری سالانه و معاینه منظم، پوسیدگی‌های اولیه را قبل از نیاز به عصب‌کشی شناسایی می‌کند. در دکترها می‌توانید از دندانپزشکان نزدیک خود نوبت بگیرید.",
      ["دندان", "بهداشت", "لثه"], "published", 3),
    mkArticle(8, "مزایای مشاوره پزشکی آنلاین؛ چه زمانی کافی است؟", "سلامت عمومی",
      "برای بسیاری از مشکلات، مشاوره آنلاین پاسخ کاملی می‌دهد؛ سریع‌تر، ارزان‌تر و بدون تردد.",
      "تجربه جهانی و ایرانی نشان داده است که بخش زیادی از مراجعات حضوری، در واقع سؤال و پیگیری است که می‌تواند آنلاین حل شود: بررسی نتیجه آزمایش، تجدید نسخه، توصیه‌های مراقبتی و مشکلات خفیف پوستی یا گوارشی.\n\nمزیت اول، سرعت است؛ به‌جای چند روز انتظار برای نوبت، در همان روز پاسخ می‌گیرید. مزیت دوم، هزینه کمتر؛ تعرفه مشاوره تلفنی معمولاً ۳۰٪ کمتر از ویزیت حضوری است.\n\nاما مرزها را بشناسید: درد قفسه سینه، تنگی نفس ناگهانی، آسیب‌های شدید و علائم اورژانسی، مشاوره آنلاین جایگزین اورژانس نیست.\n\nدر سامانه دکترها، مشاوره متنی، تلفنی و ویدیویی با پزشکان تأییدشده ارائه می‌شود و اگر پزشک تشخیص دهد، خودش شما را برای ویزیت حضوری ارجاع می‌کند.",
      ["مشاوره آنلاین", "تله‌مد", "خدمات"], "published", 4),
    mkArticle(9, "کمبود ویتامین D؛ همه‌گیر پنهان", "سلامت عمومی",
      "بیش از ۷۰٪ جمعیت ایران کمبود ویتامین D دارند؛ چرا و چه کنیم؟",
      "ویتامین D تنها برای استخوان نیست؛ در عملکرد سیستم ایمنی، خلق‌وخو و متابولیسم هم نقش دارد. مطالعات ایرانی نشان می‌دهد اکثریت جمعیت، حتی در شهرهای آفتابی، دچار کمبود هستند؛ سبک زندگی داخل‌نشین و پوشش کامل در برابر آفتاب دلایل اصلی‌اند.\n\nعلائم کمبود: خستگی مزمن، درد عضلانی و استخوانی، خلق پایین و عفونت‌های مکرر. تشخیص با آزمایش خون ۲۵(OH)D ساده است؛ سطح مطلوب بالای ۳۰ نانوگرم بر میلی‌لیتر.\n\nتأمین درمانی با قرص‌های مکمل و با نظر پزشک انجام می‌شود؛ دوز بالا بدون آزمایش توصیه نمی‌شود. نور آفتاب ۱۰ تا ۳۰ دقیقه‌ای روی ساعد و صورت، چند روز در هفته، پیشگیری طبیعی است. برای سنجش سطح ویتامین D خود می‌توانید آزمایش را در سامانه سفارش دهید و نتیجه را از پزشک غدد پیگیری کنید.",
      ["ویتامین D", "آزمایش", "سلامت"], "published", 4),
    mkArticle(10, "ورزش سبک و سلامت قلب؛ راهنمای شروع", "سلامت قلب",
      "برای قلب، ۱۵۰ دقیقه پیاده‌روی سریع در هفته معجزه می‌کند؛ از همین هفته شروع کنید.",
      "قلب عضله است و مثل هر عضله، فعالیت منظم می‌خواهد. خبر خوب اینکه برای رسیدن به اثر محافظتی قلب، ورزش سنگین لازم نیست؛ ۱۵۰ دقیقه فعالیت هوازی متوسط در هفته کافی است.\n\nشروع ایده‌آل: ۵ روز، ۳۰ دقیقه پیاده‌روی تند. اگر کم‌انرژی هستید، سه دوره ۱۰ دقیقه‌ای هم اثر دارد. طناب‌کشی سبک، دوچرخه ثابت و شنا گزینه‌های هوازی دیگرند.\n\nقبل از شروع، اگر بالای ۴۵ سال هستید، سیگاری هستید یا سابقه قلبی خانوادگی دارید، با ارزیابی پزشک شروع کنید. درد قفسه سینه یا تنگی نفس غیرعادی هنگام ورزش، علامت توقف فوری است.\n\nگام‌های کوچک و پیوسته، بهتر از ورزش‌های شدید و ناگهانی است؛ استمرار مهم‌تر از شدت است.",
      ["قلب", "ورزش", "پیشگیری"], "draft", 5),
  ];

  /* ------------------------------ banners ---------------------------- */

  const banners: DbSeed["banners"] = [
    { id: "ban-1", title: "نوبت‌دهی آنلاین بدون معطلی", subtitle: "بیش از ۳۰ پزشک متخصص در ۱۲ تخصص آماده پاسخ‌گویی هستند", hue: 173, link: "/doctors", active: true, order: 1 },
    { id: "ban-2", title: "مشاوره تلفنی در همان روز", subtitle: "برای نوبت فوری، مشاوره تلفنی ۵ دقیقه‌ای رزرو کنید", hue: 220, link: "/doctors", active: true, order: 2 },
    { id: "ban-3", title: "آزمایش در منزل", subtitle: "نمونه‌گیری در محل شما با ۲۰٪ تخفیف ویژه این هفته", hue: 32, link: "/patient/labs", active: true, order: 3 },
    { id: "ban-4", title: "عضویت پزشکان", subtitle: "درآمد و تجربه نوبت‌دهی آنلاین را به مطب خود بیاورید", hue: 280, link: "/", active: false, order: 4 },
  ];

  /* --------------------------- discount codes ------------------------ */

  const discountCodes: DbSeed["discountCodes"] = [
    { id: "dsc-1", code: "WELCOME15", percent: 15, maxUses: 500, usedCount: 217, active: true, expiresAtISO: addDaysISO(today, 60), minAmount: 200_000 },
    { id: "dsc-2", code: "FIRST20", percent: 20, maxUses: 200, usedCount: 198, active: true, expiresAtISO: addDaysISO(today, 5), minAmount: 500_000 },
    { id: "dsc-3", code: "SKIN10", percent: 10, maxUses: 300, usedCount: 121, active: true, expiresAtISO: addDaysISO(today, 30), minAmount: 100_000 },
    { id: "dsc-4", code: "LAB25", percent: 25, maxUses: 100, usedCount: 100, active: false, expiresAtISO: subDaysISO(today, 10), minAmount: 300_000 },
    { id: "dsc-5", code: "TELEMED10", percent: 10, maxUses: 1000, usedCount: 452, active: true, expiresAtISO: addDaysISO(today, 90), minAmount: 150_000 },
    { id: "dsc-6", code: "FAMILY5", percent: 5, maxUses: 400, usedCount: 39, active: true, expiresAtISO: addDaysISO(today, 45), minAmount: 100_000 },
  ];

  /* ----------------------------- audit log --------------------------- */

  const auditLog: DbSeed["auditLog"] = [];
  for (let i = 0; i < 40; i++) {
    const a = pick(P.AUDIT_ACTIONS);
    auditLog.push({
      id: nid("aud"),
      actorName: pick([staff[0].name, staff[4].name, staff[1].name]),
      actorRole: bool(0.75) ? "admin" : "support",
      action: a.action,
      target: `${a.target} — ${pick(["موفق", "موفق", "موفق", "با هشدار"])}`,
      atISO: randDateTime(subDaysISO(today, int(0, 30)), 8, 21),
    });
  }

  /* --------------------------- notifications ------------------------- */

  const notifications: DbSeed["notifications"] = [];
  const mkNotif = (
    role: DbSeed["notifications"][number]["role"],
    userId: string | undefined,
    title: string,
    body: string,
    daysAgo: number,
    read = false,
    link?: string
  ) =>
    notifications.push({
      id: nid("ntf"),
      role,
      userId,
      title,
      body,
      read,
      createdAtISO: randDateTime(subDaysISO(today, daysAgo), 8, 21),
      link,
    });

  mkNotif("doctor", mainDoctor.id, "نوبت جدید ثبت شد", "برای فردا ساعت ۱۰:۰۰ یک نوبت حضوری جدید ثبت شد.", 0, false, "/doctor/calendar");
  mkNotif("doctor", mainDoctor.id, "مشاوره جدید", "یک مشاوره متنی جدید در انتظار پاسخ شماست.", 0, false, "/doctor/consultations");
  mkNotif("doctor", mainDoctor.id, "نظر جدید ثبت شد", "یک نظر ۵ ستاره جدید برای شما ثبت شد.", 1, true, "/doctor/reviews");
  mkNotif("doctor", mainDoctor.id, "درخواست تسویه تأیید شد", "درخواست تسویه حساب شما به مبلغ ۶٬۲۰۰٬۰۰۰ تومان تأیید شد.", 2, true, "/doctor/finance");
  mkNotif("patient", mainPatient.id, "نوبت شما تأیید شد", `نوبت شما با ${mainDoctor.name} تأیید شد.`, 0, false, "/patient/appointments");
  mkNotif("patient", mainPatient.id, "یادآوری نوبت", `نوبت شما فردا ساعت ۱۰:۰۰ با ${mainDoctor.name} است.`, 0, false, "/patient/appointments");
  mkNotif("patient", mainPatient.id, "جواب آزمایش آماده شد", "جواب آزمایش «تیروئید» در بخش آزمایش‌ها قابل مشاهده است.", 1, true, "/patient/labs");
  mkNotif("patient", mainPatient.id, "پاسخ پشتیبانی", "به تیکت «مبلغ پرداخت‌شده نوبت در انتظار است» پاسخ جدیدی داده شد.", 0, false, "/patient/support");
  mkNotif("support", staff[1].id, "تیکت جدید", "تیکت «امکان انتخاب نوبت بعد از ساعت ۱۸» ثبت شد.", 0, false, "/support/tickets");
  mkNotif("support", staff[1].id, "تیکت فوری", "یک تیکت فوری با موضوع پرداخت منتظر تخصیص است.", 0, false, "/support/tickets");
  mkNotif("admin", staff[0].id, "پزشک جدید در انتظار تأیید", "یک پزشک جدید درخواست عضویت ثبت کرد؛ مدارک را بررسی کنید.", 0, false, "/admin/doctors");
  mkNotif("admin", staff[0].id, "درخواست تسویه جدید", `${mainDoctor.name} درخواست تسویه حساب ثبت کرد.`, 1, false, "/admin/finance");
  for (let i = 0; i < 22; i++) {
    const isDoctorN = bool(0.5);
    mkNotif(
      isDoctorN ? "doctor" : "patient",
      undefined,
      pick(["به دکترها خوش آمدید", "تکمیل پروفایل، اعتماد بیشتر بیماران", "نظرسنجی جدید", "به‌روزرسانی قوانین سامانه"]),
      "این یک اعلان عمومی نمونه است تا صفحات اعلان‌ها واقعی به نظر برسند.",
      int(1, 20),
      true
    );
  }

  /* ---------------------------- favorites ---------------------------- */

  const favorites: DbSeed["favorites"] = [
    { patientId: mainPatient.id, doctorId: mainDoctor.id },
    { patientId: mainPatient.id, doctorId: doctors.find((d) => d.specialtyId === "cardio")!.id },
    { patientId: mainPatient.id, doctorId: doctors.find((d) => d.specialtyId === "nutrition")!.id },
  ];

  /* --------------------------- monthly stats ------------------------ */

  const monthlyStats: DbSeed["monthlyStats"] = [];
  for (let back = 5; back >= 0; back--) {
    const anchor = subDaysISO(today, back * 30 + 15);
    const key = jalaliMonthKey(anchor);
    const monthAppts = appointments.filter((a) => jalaliMonthKey(a.date) === key);
    const monthTrx = transactions.filter((t) => t.status === "success" && jalaliMonthKey(t.createdAtISO) === key);
    const gmv = monthTrx.filter((t) => t.direction === "in").reduce((s, t) => s + t.amount, 0);
    const commission = monthAppts
      .filter((a) => a.paymentStatus === "paid")
      .reduce((s, a) => s + a.commission, 0);
    const bookings = monthAppts.length;
    monthlyStats.push({
      monthKey: key,
      searches: Math.round(bookings * int(7, 11)),
      profileViews: Math.round(bookings * int(4, 7)),
      bookings,
      payments: monthTrx.filter((t) => t.direction === "in").length,
      gmv,
      commission,
      newPatients: patients.filter((p) => jalaliMonthKey(p.createdAtISO) === key).length || int(3, 8),
      newDoctors: back === 0 ? 1 : 0,
    });
  }

  return {
    specialties: SPECIALTIES.map((s) => ({ ...s })),
    services: CLINIC_SERVICES.map((s) => ({ ...s })),
    doctors, patients, appointments, consultations, reviews, labOrders,
    transactions, settlements, tickets, staff, cannedReplies, faqs,
    articles, banners, centers, discountCodes, auditLog, notifications,
    monthlyStats, favorites,
    seededAtISO: nowISODateTime(),
  };
}

/* Convenience: main demo user ids used across the app */
export const DEMO_IDS = {
  doctorId: "doc-0001",
  patientId: "pat-0001",
  adminId: "stf-0001",
  supportId: "stf-0002",
} as const;


"use client";

/**
 * BookingWizard — 4 انتخاب + پرداخت + تأیید: نوع ویزیت، روز، ساعت، متقاضی،
 * پرداخت (کیف پول / درگاه بانکی) و صفحه موفقیت.
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  BadgeCheck,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Landmark,
  MapPin,
  MessageCircle,
  Phone,
  Stethoscope,
  UserRound,
  Video,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { toFa, toman } from "@/lib/fa";
import { faDate, faTime, todayISO } from "@/lib/jalali";
import { generateSlotsForDate } from "@/lib/schedule";
import { APPOINTMENT_STATUS_LABELS, SPECIALTY_LABELS, VISIT_TYPE_LABELS, type VisitType } from "@/lib/constants";
import type { Appointment, Doctor } from "@/types";
import { UserAvatar } from "@/components/shared/user-avatar";
import { RatingStars } from "@/components/shared/rating-stars";
import { StatusBadge } from "@/components/shared/status-badge";
import { useCurrentPatient, validateDiscount, type DiscountResult } from "@/features/patient/helpers";
import { useAppStore } from "@/store/app-store";
import { BookingMonthGrid } from "./month-grid";

const STEPS = [
  { n: 1, title: "نوع ویزیت" },
  { n: 2, title: "انتخاب روز" },
  { n: 3, title: "انتخاب ساعت" },
  { n: 4, title: "مشخصات متقاضی" },
  { n: 5, title: "پرداخت" },
  { n: 6, title: "تأیید نهایی" },
] as const;

const VISIT_ICONS: Record<VisitType, typeof Stethoscope> = {
  "in-person": Stethoscope,
  phone: Phone,
  text: MessageCircle,
  video: Video,
};

export function BookingWizard({ doctor }: { doctor: Doctor }) {
  const patient = useCurrentPatient();
  const appointments = useAppStore((s) => s.appointments);
  const discountCodes = useAppStore((s) => s.discountCodes);
  const bookAppointment = useAppStore((s) => s.bookAppointment);

  const [step, setStep] = useState(1);
  const [visitType, setVisitType] = useState<VisitType | null>(null);
  const [date, setDate] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [applicantId, setApplicantId] = useState<string>("self");
  const [reason, setReason] = useState("");
  const [codeInput, setCodeInput] = useState("");
  const [discount, setDiscount] = useState<DiscountResult | null>(null);
  const [gatewayOpen, setGatewayOpen] = useState(false);
  const [booked, setBooked] = useState<Appointment | null>(null);

  const fee = visitType
    ? visitType === "in-person"
      ? doctor.visitFee
      : visitType === "phone"
        ? doctor.phoneFee
        : visitType === "text"
          ? doctor.textFee
          : doctor.videoFee
    : 0;
  const payable = discount?.payable ?? fee;

  const slots = useMemo(() => {
    if (!date || !visitType) return [];
    const category = visitType === "in-person" ? "in-person" : "online";
    const docAppointments = appointments.filter((a) => a.doctorId === doctor.id);
    return generateSlotsForDate(doctor, date, docAppointments).filter((s) => s.visitType === category);
  }, [doctor, date, visitType, appointments]);

  const applicant = useMemo(() => {
    if (!patient) return null;
    if (applicantId === "self") return { name: patient.name, nationalId: patient.nationalId, relation: "خودم" };
    const member = patient.family.find((m) => m.id === applicantId);
    return member ? { name: member.name, nationalId: member.nationalId, relation: member.relation } : null;
  }, [patient, applicantId]);

  const goNext = () => {
    if (step === 1 && !visitType) return toast.error("نوع ویزیت را انتخاب کنید");
    if (step === 2 && !date) return toast.error("یک روز را انتخاب کنید");
    if (step === 3 && !time) return toast.error("ساعت نوبت را انتخاب کنید");
    setStep((s) => Math.min(s + 1, 5));
  };

  const pickVisitType = (vt: VisitType) => {
    setVisitType(vt);
    setDate(null);
    setTime(null);
    setDiscount(null);
    setCodeInput("");
  };

  const applyCode = () => {
    if (!visitType) return;
    const result = validateDiscount(codeInput, fee, discountCodes, todayISO());
    if (!result.ok) {
      setDiscount(null);
      toast.error(result.message);
      return;
    }
    setDiscount(result);
    toast.success(result.message);
  };

  /** duplicate guard: same doctor + date + time while active */
  const hasActiveDuplicate = useMemo(() => {
    if (!patient || !date || !time) return false;
    return appointments.some(
      (a) =>
        a.patientId === patient.id &&
        a.doctorId === doctor.id &&
        a.date === date &&
        a.time === time &&
        (a.status === "pending" || a.status === "confirmed")
    );
  }, [appointments, patient, doctor.id, date, time]);

  const completePayment = () => {
    if (!patient || !visitType || !date || !time) return;
    if (hasActiveDuplicate) {
      setGatewayOpen(false);
      toast.error("شما در همین تاریخ و ساعت برای این پزشک نوبت فعال دارید");
      return;
    }
    const member = patient.family.find((m) => m.id === applicantId);
    const appointment = bookAppointment({
      doctorId: doctor.id,
      patientId: patient.id,
      forFamilyMember: applicantId === "self" ? undefined : member,
      date,
      time,
      visitType,
      reason: reason.trim() || undefined,
      payNow: true,
    });
    setBooked(appointment);
    setGatewayOpen(false);
    setStep(6);
    toast.success("پرداخت با موفقیت انجام شد");
  };

  const payViaWallet = () => {
    if (hasActiveDuplicate) return toast.error("شما در همین تاریخ و ساعت برای این پزشک نوبت فعال دارید");
    completePayment();
  };

  const payViaGatewayFail = () => {
    setGatewayOpen(false);
    toast.error("پرداخت ناموفق بود؛ دوباره تلاش کنید");
  };

  if (!patient) return null;

  return (
    <div className="space-y-5">
      {/* doctor summary card */}
      <Card className="overflow-hidden">
        <CardContent className="flex flex-wrap items-center gap-4 p-4">
          <UserAvatar name={doctor.name} hue={doctor.avatarHue} size="lg" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-lg font-bold">{doctor.name}</p>
            <p className="text-sm text-muted-foreground">
              {SPECIALTY_LABELS[doctor.specialtyId]} • {toFa(doctor.experienceYears)} سال سابقه
            </p>
            <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="size-3.5" aria-hidden />
              {doctor.city} — {doctor.address}
            </p>
          </div>
          <div className="flex flex-col items-start gap-1">
            <RatingStars value={doctor.rating} count={doctor.reviewCount} />
            <span className="text-xs text-muted-foreground">نوبت‌دهی تا ۴۵ روز آینده</span>
          </div>
        </CardContent>
      </Card>

      {/* stepper */}
      <ol className="flex items-center gap-1 overflow-x-auto rounded-2xl border bg-card p-2" aria-label="مراحل رزرو">
        {STEPS.map((s, i) => {
          const done = step > s.n || (step === 6 && s.n === 6);
          const current = step === s.n;
          return (
            <li key={s.n} className="flex min-w-0 flex-1 items-center gap-1.5">
              <div
                className={cn(
                  "flex items-center gap-1.5 rounded-xl px-2 py-1.5 text-xs font-medium whitespace-nowrap",
                  current && "bg-primary text-primary-foreground shadow-sm",
                  done && !current && "text-emerald-600 dark:text-emerald-400",
                  !current && !done && "text-muted-foreground"
                )}
                aria-current={current ? "step" : undefined}
              >
                <span
                  className={cn(
                    "grid size-5 shrink-0 place-items-center rounded-full border text-[10px]",
                    current ? "border-primary-foreground/40 bg-primary-foreground/15" : "",
                    done ? "border-emerald-500/40 bg-emerald-500/15" : "border-muted-foreground/30"
                  )}
                >
                  {done ? <Check className="size-3" aria-hidden /> : toFa(s.n)}
                </span>
                {s.title}
              </div>
              {i < STEPS.length - 1 && <ChevronLeft className="size-3.5 shrink-0 text-muted-foreground/40" aria-hidden />}
            </li>
          );
        })}
      </ol>

      {/* step body */}
      {step === 1 && (
        <Card>
          <CardContent className="space-y-4 p-5">
            <div>
              <h2 className="font-bold">نوع ویزیت را انتخاب کنید</h2>
              <p className="text-sm text-muted-foreground">تعرفه هر نوع ویزیت برای این پزشک در ادامه آمده است.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {(Object.keys(VISIT_TYPE_LABELS) as VisitType[]).map((vt) => {
                const disabled = vt !== "in-person" && !doctor.availableOnline;
                const vtFee = vt === "in-person" ? doctor.visitFee : vt === "phone" ? doctor.phoneFee : vt === "text" ? doctor.textFee : doctor.videoFee;
                const Icon = VISIT_ICONS[vt];
                const card = (
                  <button
                    key={vt}
                    type="button"
                    role="radio"
                    aria-checked={visitType === vt}
                    disabled={disabled}
                    onClick={() => pickVisitType(vt)}
                    className={cn(
                      "flex items-center gap-3 rounded-2xl border p-4 text-start transition-all",
                      visitType === vt ? "border-primary bg-primary/5 shadow-sm" : "hover:border-primary/40",
                      disabled && "cursor-not-allowed opacity-45"
                    )}
                  >
                    <span
                      className={cn(
                        "grid size-11 shrink-0 place-items-center rounded-xl",
                        visitType === vt ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                      )}
                    >
                      <Icon className="size-5" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-bold">{VISIT_TYPE_LABELS[vt]}</span>
                      <span className="block text-sm font-semibold text-primary tabular-nums">{toman(vtFee)}</span>
                      {disabled && <span className="block text-[11px] text-rose-500">این پزشک ویزیت آنلاین ارائه نمی‌دهد</span>}
                    </span>
                    <span
                      className={cn(
                        "grid size-5 shrink-0 place-items-center rounded-full border",
                        visitType === vt && "border-primary bg-primary text-primary-foreground"
                      )}
                      aria-hidden
                    >
                      {visitType === vt && <Check className="size-3" />}
                    </span>
                  </button>
                );
                return disabled ? (
                  <Tooltip key={vt}>
                    <TooltipTrigger asChild>{card}</TooltipTrigger>
                    <TooltipContent>این پزشک ویزیت آنلاین ارائه نمی‌دهد</TooltipContent>
                  </Tooltip>
                ) : (
                  card
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <CardContent className="space-y-4 p-5">
            <div>
              <h2 className="font-bold">روز را انتخاب کنید</h2>
              <p className="text-sm text-muted-foreground">فقط روزهای کاری پزشک فعال هستند؛ عدد زیر هر روز = نوبت آزاد.</p>
            </div>
            <BookingMonthGrid
              doctor={doctor}
              appointments={appointments}
              visitType={visitType}
              selected={date}
              onSelect={(iso) => {
                setDate(iso);
                setTime(null);
              }}
            />
          </CardContent>
        </Card>
      )}

      {step === 3 && (
        <Card>
          <CardContent className="space-y-4 p-5">
            <div>
              <h2 className="font-bold">ساعت نوبت را انتخاب کنید</h2>
              <p className="text-sm text-muted-foreground">
                {date ? faDate(date) : ""} — مدت هر نوبت حدود {toFa(15)} دقیقه است
              </p>
            </div>
            {slots.length ? (
              <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="انتخاب ساعت">
                {slots.map((slot) => {
                  const full = slot.remaining <= 0;
                  return (
                    <button
                      key={slot.time}
                      type="button"
                      role="radio"
                      aria-checked={time === slot.time}
                      disabled={full}
                      onClick={() => setTime(slot.time)}
                      className={cn(
                        "rounded-xl border px-4 py-2 text-sm font-semibold tabular-nums transition-all",
                        time === slot.time ? "border-primary bg-primary text-primary-foreground shadow-sm" : "hover:border-primary/50",
                        full && "cursor-not-allowed border-dashed text-muted-foreground/40"
                      )}
                    >
                      {faTime(slot.time)}
                      {full && <span className="ms-2 text-[11px] font-normal">تکمیل</span>}
                      {!full && <span className="ms-2 text-[11px] font-normal text-muted-foreground">({toFa(slot.remaining)} آزاد)</span>}
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                برای این روز نوبت آزادی در این نوع ویزیت باقی نمانده است؛ روز دیگری را انتخاب کنید.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {step === 4 && (
        <Card>
          <CardContent className="grid gap-5 p-5 lg:grid-cols-2">
            <div className="space-y-4">
              <div>
                <h2 className="font-bold">نوبت برای چه کسی است؟</h2>
                <p className="text-sm text-muted-foreground">می‌توانید برای خودتان یا اعضای خانواده نوبت بگیرید.</p>
              </div>
              <RadioGroup value={applicantId} onValueChange={setApplicantId} className="gap-2.5">
                <label
                  className={cn(
                    "flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition-colors",
                    applicantId === "self" && "border-primary bg-primary/5"
                  )}
                >
                  <RadioGroupItem value="self" />
                  <UserRound className="size-5 text-primary" aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold">خودم ({patient.name})</span>
                    <span className="block text-xs text-muted-foreground tabular-nums">کد ملی: {toFa(patient.nationalId)}</span>
                  </span>
                </label>
                {patient.family.map((m) => (
                  <label
                    key={m.id}
                    className={cn(
                      "flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition-colors",
                      applicantId === m.id && "border-primary bg-primary/5"
                    )}
                  >
                    <RadioGroupItem value={m.id} />
                    <UserRound className="size-5 text-muted-foreground" aria-hidden />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold">
                        {m.name} <span className="text-xs font-normal text-muted-foreground">({m.relation})</span>
                      </span>
                      <span className="block text-xs text-muted-foreground tabular-nums">کد ملی: {toFa(m.nationalId)}</span>
                    </span>
                  </label>
                ))}
              </RadioGroup>
              {patient.family.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  عضو خانواده ثبت نکرده‌اید؛ از بخش{" "}
                  <Link href="/patient/family" className="text-primary hover:underline">
                    اعضای خانواده
                  </Link>{" "}
                  اضافه کنید.
                </p>
              )}
              <div className="space-y-1.5">
                <Label htmlFor="reason">علت مراجعه (اختیاری)</Label>
                <Textarea
                  id="reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="مثلاً: پیگیری درمان قبلی، بررسی نتایج آزمایش…"
                  className="min-h-24"
                />
              </div>
            </div>

            {/* summary + discount */}
            <div className="space-y-3 rounded-2xl border bg-muted/40 p-4">
              <h3 className="flex items-center gap-2 font-bold">
                <CalendarDays className="size-4.5 text-primary" aria-hidden />
                خلاصه نوبت
              </h3>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">پزشک</dt>
                  <dd className="font-medium">{doctor.name}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">متقاضی</dt>
                  <dd className="font-medium">
                    {applicant?.name} <span className="text-xs text-muted-foreground">({applicant?.relation})</span>
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">نوع ویزیت</dt>
                  <dd className="font-medium">{visitType ? VISIT_TYPE_LABELS[visitType] : "—"}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">تاریخ و ساعت</dt>
                  <dd className="font-medium">
                    {date ? faDate(date) : "—"} — {time ? faTime(time) : "—"}
                  </dd>
                </div>
                <Separator />
                <div className="flex justify-between gap-2">
                  <dt className="font-medium">مبلغ ویزیت</dt>
                  <dd className="font-bold text-primary tabular-nums">{toman(fee)}</dd>
                </div>
                {discount?.ok && (
                  <div className="flex justify-between gap-2 text-emerald-600 dark:text-emerald-400">
                    <dt>تخفیف ({toFa(discount.percent ?? 0)}٪)</dt>
                    <dd className="tabular-nums">− {toman(discount.discountAmount ?? 0)}</dd>
                  </div>
                )}
                {discount?.ok && (
                  <div className="flex justify-between gap-2 border-t pt-2">
                    <dt className="font-bold">مبلغ قابل پرداخت</dt>
                    <dd className="font-bold text-primary tabular-nums">{toman(payable)}</dd>
                  </div>
                )}
              </dl>
              <div className="space-y-1.5 border-t pt-3">
                <Label htmlFor="discount" className="text-xs">
                  کد تخفیف دارید؟
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="discount"
                    value={codeInput}
                    onChange={(e) => setCodeInput(e.target.value)}
                    placeholder="مثلاً WELCOME15"
                    dir="ltr"
                    className="text-start"
                  />
                  <Button type="button" variant="secondary" onClick={applyCode}>
                    اعمال
                  </Button>
                </div>
                {discount?.ok && (
                  <p className="flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                    <BadgeCheck className="size-3.5" aria-hidden />
                    {discount.message}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 5 && (
        <Card>
          <CardContent className="grid gap-5 p-5 lg:grid-cols-2">
            <div className="space-y-4">
              <div>
                <h2 className="font-bold">پرداخت</h2>
                <p className="text-sm text-muted-foreground">روش پرداخت را انتخاب کنید؛ نوبت پس از پرداخت تأیید می‌شود.</p>
              </div>
              <div className="flex items-center justify-between rounded-2xl border bg-muted/40 p-4">
                <span className="text-sm text-muted-foreground">مبلغ قابل پرداخت</span>
                <span className="text-lg font-extrabold text-primary tabular-nums">{toman(payable)}</span>
              </div>
              <div className="space-y-2">
                <Button
                  size="lg"
                  className="w-full justify-start gap-2"
                  disabled={patient.walletBalance < payable}
                  onClick={payViaWallet}
                >
                  <Wallet className="size-5" aria-hidden />
                  پرداخت از کیف پول
                </Button>
                {patient.walletBalance < payable && (
                  <p className="text-xs font-medium text-rose-500">
                    موجودی کافی نیست — موجودی فعلی: {toman(patient.walletBalance)} (از بخش{" "}
                    <Link href="/patient/wallet" className="underline">
                      کیف پول
                    </Link>{" "}
                    شارژ کنید)
                  </p>
                )}
                <Button size="lg" variant="outline" className="w-full justify-start gap-2" onClick={() => setGatewayOpen(true)}>
                  <Landmark className="size-5" aria-hidden />
                  درگاه پرداخت بانکی
                </Button>
              </div>
            </div>
            <div className="rounded-2xl border bg-muted/40 p-4 text-sm">
              <h3 className="mb-2 font-bold">خلاصه سفارش</h3>
              <ul className="space-y-1.5 text-muted-foreground">
                <li>پزشک: <span className="text-foreground">{doctor.name}</span></li>
                <li>متقاضی: <span className="text-foreground">{applicant?.name}</span></li>
                <li>نوع: <span className="text-foreground">{visitType ? VISIT_TYPE_LABELS[visitType] : "—"}</span></li>
                <li>زمان: <span className="text-foreground">{date ? faDate(date) : ""} — {time ? faTime(time) : ""}</span></li>
                <li>مبلغ: <span className="text-foreground tabular-nums">{toman(payable)}</span></li>
              </ul>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 6 && booked && (
        <Card className="overflow-hidden border-emerald-500/30">
          <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
            <span className="grid size-20 place-items-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
              <BadgeCheck className="size-11" aria-hidden />
            </span>
            <div className="space-y-1">
              <h2 className="text-xl font-extrabold">نوبت شما ثبت شد</h2>
              <p className="text-sm text-muted-foreground">جزئیات نوبت برای شما ارسال شد و در «نوبت‌های من» قابل مشاهده است.</p>
            </div>
            <span className="rounded-xl bg-primary/10 px-4 py-2 text-lg font-extrabold tracking-widest text-primary tabular-nums">
              کد پیگیری: {toFa(booked.code)}
            </span>
            <div className="flex flex-wrap items-center justify-center gap-2 text-sm">
              <StatusBadge status={booked.status} label={APPOINTMENT_STATUS_LABELS[booked.status]} />
              <span className="font-semibold">{doctor.name}</span>
              <span className="text-muted-foreground">•</span>
              <span>{faDate(booked.date)}</span>
              <span className="text-muted-foreground">•</span>
              <span>ساعت {faTime(booked.time)}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              این ساعت اکنون برای سایر بیماران رزرو شده و از لیست نوبت‌های آزاد حذف می‌شود.
            </p>
            <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
              <Button asChild>
                <Link href="/patient/appointments">
                  مشاهده نوبت‌های من
                  <ChevronLeft className="size-4" aria-hidden />
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/patient/find-doctor">رزرو نوبت جدید</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* nav buttons */}
      {step < 5 && (
        <div className="flex items-center justify-between gap-3">
          <Button
            variant="ghost"
            size="sm"
            disabled={step <= 1}
            onClick={() => setStep((s) => Math.max(s - 1, 1))}
          >
            <ChevronRight className="size-4" aria-hidden />
            مرحله قبل
          </Button>
          <Button size="sm" onClick={goNext}>
            مرحله بعد
            <ChevronLeft className="size-4" aria-hidden />
          </Button>
        </div>
      )}

      {/* fake gateway */}
      <Dialog open={gatewayOpen} onOpenChange={setGatewayOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Landmark className="size-5 text-primary" aria-hidden />
              درگاه پرداخت بانکی نمونه
            </DialogTitle>
            <DialogDescription>این درگاه صرفاً برای نمایش است؛ نتیجه را انتخاب کنید.</DialogDescription>
          </DialogHeader>
          <div className="overflow-hidden rounded-2xl border">
            <div className="bg-gradient-to-l from-teal-600 to-teal-500 p-3 text-white">
              <p className="text-xs opacity-80">پرداخت اینترنتی</p>
              <p className="font-bold">بانک نمونه</p>
            </div>
            <dl className="space-y-2 p-4 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">پذیرنده</dt>
                <dd className="font-semibold">دکترها</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">مبلغ</dt>
                <dd className="font-bold text-primary tabular-nums">{toman(payable)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">شماره کارت</dt>
                <dd className="font-semibold tabular-nums" dir="ltr">
                  {toFa("6104 **** **** 1234")}
                </dd>
              </div>
            </dl>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row-reverse">
            <Button className="flex-1 gap-2 bg-emerald-600 hover:bg-emerald-700" onClick={completePayment}>
              <CreditCard className="size-4" aria-hidden />
              پرداخت موفق
            </Button>
            <Button variant="outline" className="flex-1 gap-2 text-rose-600 hover:text-rose-700" onClick={payViaGatewayFail}>
              پرداخت ناموفق
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

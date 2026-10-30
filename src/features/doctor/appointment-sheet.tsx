"use client";

/**
 * Appointment detail side sheet — shared by /doctor/calendar and /doctor/appointments.
 * Fully reactive: re-reads the appointment from the store after every action.
 * The inner component is keyed by appointment id so local state (note, reschedule
 * draft) resets cleanly when a different appointment is opened.
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  CalendarClock,
  CheckCircle2,
  Clock,
  FileText,
  Save,
  Stethoscope,
  UserRound,
  XCircle,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { JalaliDatePicker } from "@/components/shared/jalali-date-picker";
import { StatusBadge } from "@/components/shared/status-badge";
import { UserAvatar } from "@/components/shared/user-avatar";
import { useAppStore } from "@/store/app-store";
import {
  APPOINTMENT_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
  VISIT_TYPE_LABELS,
} from "@/lib/constants";
import { faDateTime, faDuration, faTime, todayISO } from "@/lib/jalali";
import { faPhone, toFa, toman } from "@/lib/fa";
import { generateSlotsForDate } from "@/lib/schedule";
import { appointmentPatientName, netFee, useDoctorPanel, VISIT_TYPE_ICONS } from "@/features/doctor/shared";
import type { Appointment, Doctor, Patient } from "@/types";

interface AppointmentSheetProps {
  appointmentId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/* ------------------------- inner (keyed per appointment) ------------------------- */

function AppointmentSheetInner({
  appointment,
  open,
  onOpenChange,
  doctor,
  patient,
  patientMap,
  allAppointments,
}: {
  appointment: Appointment;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  doctor: Doctor;
  patient: Patient | undefined;
  patientMap: Map<string, Patient>;
  allAppointments: Appointment[];
}) {
  const setAppointmentStatus = useAppStore((s) => s.setAppointmentStatus);
  const rescheduleAppointment = useAppStore((s) => s.rescheduleAppointment);
  const updateAppointment = useAppStore((s) => s.updateAppointment);

  const [note, setNote] = useState(appointment.notes);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [newDate, setNewDate] = useState<string>(appointment.date);
  const [newTime, setNewTime] = useState<string>(appointment.time);

  const freeSlots = useMemo(
    () => (newDate ? generateSlotsForDate(doctor, newDate, allAppointments).filter((s) => s.remaining > 0) : []),
    [doctor, newDate, allAppointments]
  );

  const TypeIcon = VISIT_TYPE_ICONS[appointment.visitType];
  const isCancellable = appointment.status === "pending" || appointment.status === "confirmed";
  const isPending = appointment.status === "pending";

  const confirm = () => {
    setAppointmentStatus(appointment.id, "confirmed", doctor.name);
    toast.success("نوبت تأیید شد", { description: `نوبت ${toFa(appointment.code)} برای بیمار تأیید شد.` });
  };

  const complete = () => {
    setAppointmentStatus(appointment.id, "completed", doctor.name);
    toast.success("ویزیت انجام‌شده ثبت شد", { description: "بیمار می‌تواند نظر خود را ثبت کند." });
  };

  const doCancel = () => {
    const wasPaid = appointment.paymentStatus === "paid";
    setAppointmentStatus(appointment.id, "cancelled", doctor.name);
    setConfirmCancel(false);
    toast("نوبت لغو شد", {
      description: wasPaid ? "مبلغ پرداختی به کیف پول بیمار بازگشت داده شد." : undefined,
    });
  };

  const saveNote = () => {
    updateAppointment(appointment.id, { notes: note });
    toast.success("یادداشت پزشک ذخیره شد");
  };

  const submitReschedule = () => {
    if (!newDate || !newTime) {
      toast.error("تاریخ و ساعت جدید را انتخاب کنید");
      return;
    }
    rescheduleAppointment(appointment.id, newDate, newTime);
    setRescheduleOpen(false);
    toast.success("زمان نوبت تغییر یافت", {
      description: "پس از تغییر زمان، وضعیت نوبت به «در انتظار تأیید» بازمی‌گردد.",
    });
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="left" className="w-full gap-0 overflow-y-auto sm:max-w-md">
          <SheetHeader className="border-b bg-muted/40 pb-3">
            <SheetTitle className="flex flex-wrap items-center gap-2 text-base">
              جزئیات نوبت {toFa(appointment.code)}
              <StatusBadge status={appointment.status} label={APPOINTMENT_STATUS_LABELS[appointment.status]} />
            </SheetTitle>
            <SheetDescription className="text-xs">
              {faDateTime(`${appointment.date}T${appointment.time}:00`)}
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-5 p-4">
            {/* patient */}
            <section className="rounded-xl border p-3" aria-label="اطلاعات بیمار">
              <div className="flex items-center gap-3">
                <UserAvatar name={appointment.forFamilyMember?.name ?? patient?.name ?? "بیمار"} hue={patient?.avatarHue} size="md" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{appointmentPatientName(appointment, patientMap)}</p>
                  {patient && <p className="text-xs text-muted-foreground">{faPhone(patient.phone)}</p>}
                </div>
                <Button asChild variant="outline" size="sm" className="h-8">
                  <Link href={`/doctor/patients/${appointment.patientId}`} onClick={() => onOpenChange(false)}>
                    <UserRound className="size-3.5" aria-hidden />
                    پرونده بیمار
                  </Link>
                </Button>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                {patient && <Badge variant="outline" className="text-xs">{patient.insurance}</Badge>}
                {patient && <Badge variant="outline" className="text-xs">گروه خونی: {patient.bloodType}</Badge>}
                {appointment.forFamilyMember && (
                  <Badge variant="outline" className="text-xs">
                    به نام {appointment.forFamilyMember.name} ({appointment.forFamilyMember.relation} {patient?.name})
                  </Badge>
                )}
              </div>
            </section>

            {/* visit details */}
            <section className="grid grid-cols-2 gap-3 text-sm" aria-label="جزئیات ویزیت">
              <div className="rounded-xl bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground">نوع ویزیت</p>
                <p className="mt-1 flex items-center gap-1.5 font-medium">
                  <TypeIcon className="size-4 text-primary" aria-hidden />
                  {VISIT_TYPE_LABELS[appointment.visitType]}
                </p>
              </div>
              <div className="rounded-xl bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground">ساعت</p>
                <p className="mt-1 flex items-center gap-1.5 font-medium">
                  <Clock className="size-4 text-primary" aria-hidden />
                  {faTime(appointment.time)} — {faDuration(appointment.duration)}
                </p>
              </div>
              <div className="rounded-xl bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground">وضعیت پرداخت</p>
                <p className="mt-1">
                  <StatusBadge status={appointment.paymentStatus} label={PAYMENT_STATUS_LABELS[appointment.paymentStatus]} />
                </p>
              </div>
              <div className="rounded-xl bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground">مبلغ</p>
                <p className="mt-1 font-semibold tabular-nums">{toman(appointment.fee)}</p>
                <p className="text-[11px] text-muted-foreground">سهم شما پس از کمیسیون: {toman(netFee(appointment))}</p>
              </div>
              <div className="col-span-2 rounded-xl bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground">دلیل مراجعه</p>
                <p className="mt-1 leading-relaxed">{appointment.reason || "—"}</p>
              </div>
            </section>

            {/* notes */}
            <section className="space-y-2">
              <Label htmlFor={`note-${appointment.id}`} className="flex items-center gap-1.5 text-sm">
                <FileText className="size-4 text-muted-foreground" aria-hidden />
                یادداشت پزشک
              </Label>
              <Textarea
                id={`note-${appointment.id}`}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="یادداشت معاینه، توصیه‌ها و پیگیری…"
                className="min-h-24 text-sm"
              />
              <Button size="sm" variant="outline" onClick={saveNote} disabled={note === appointment.notes}>
                <Save className="size-3.5" aria-hidden />
                ذخیره یادداشت
              </Button>
            </section>

            <Separator />

            {/* actions */}
            <section className="flex flex-wrap gap-2" aria-label="عملیات نوبت">
              {isPending && (
                <Button size="sm" onClick={confirm}>
                  <CheckCircle2 className="size-4" aria-hidden />
                  تأیید نوبت
                </Button>
              )}
              {isCancellable && (
                <>
                  <Button size="sm" onClick={complete}>
                    <Stethoscope className="size-4" aria-hidden />
                    ثبت انجام‌شد
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setRescheduleOpen(true)}>
                    <CalendarClock className="size-4" aria-hidden />
                    تغییر زمان
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => setConfirmCancel(true)}>
                    <XCircle className="size-4" aria-hidden />
                    لغو نوبت
                  </Button>
                </>
              )}
              {!isPending && !isCancellable && (
                <p className="text-xs text-muted-foreground">
                  این نوبت در وضعیت «{APPOINTMENT_STATUS_LABELS[appointment.status]}» است و عملیاتی روی آن انجام نمی‌شود.
                </p>
              )}
            </section>
          </div>
        </SheetContent>
      </Sheet>

      {/* cancel confirm */}
      <AlertDialog open={confirmCancel} onOpenChange={setConfirmCancel}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>لغو این نوبت؟</AlertDialogTitle>
            <AlertDialogDescription>
              نوبت {toFa(appointment.code)} برای {appointmentPatientName(appointment, patientMap)} در تاریخ{" "}
              {faDateTime(`${appointment.date}T${appointment.time}:00`)} لغو می‌شود
              {appointment.paymentStatus === "paid" && " و مبلغ پرداختی به بیمار بازگشت داده می‌شود"}. این عمل قابل بازگشت نیست.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>انصراف</AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-600 text-white hover:bg-rose-700"
              onClick={(e) => {
                e.preventDefault();
                doCancel();
              }}
            >
              بله، لغو کن
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* reschedule dialog */}
      <Dialog open={rescheduleOpen} onOpenChange={setRescheduleOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="text-start">
            <DialogTitle>تغییر زمان نوبت</DialogTitle>
            <DialogDescription>تاریخ و ساعت جدید را انتخاب کنید. ساعت‌های خالیِ همان روز نمایش داده می‌شود.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 text-start">
            <div className="space-y-2">
              <Label>تاریخ جدید</Label>
              <JalaliDatePicker
                value={newDate}
                onChange={(iso) => {
                  setNewDate(iso ?? todayISO());
                  setNewTime("");
                }}
                disabled={(date) => {
                  const d = new Date(date);
                  const y = d.getFullYear();
                  const m = String(d.getMonth() + 1).padStart(2, "0");
                  const day = String(d.getDate()).padStart(2, "0");
                  return `${y}-${m}-${day}` < todayISO();
                }}
              />
            </div>
            <div className="space-y-2">
              <Label>ساعت جدید</Label>
              <Select value={newTime} onValueChange={setNewTime}>
                <SelectTrigger className="w-full" aria-label="ساعت جدید">
                  <SelectValue placeholder="انتخاب ساعت" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={appointment.time}>{faTime(appointment.time)} (ساعت فعلی)</SelectItem>
                  {freeSlots.map((s) => (
                    <SelectItem key={s.time} value={s.time}>
                      {faTime(s.time)} — ظرفیت آزاد: {toFa(s.remaining)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {freeSlots.length === 0 && (
                <p className="text-xs text-amber-600">در این تاریخ نوبت خالی وجود ندارد؛ تاریخ دیگری انتخاب کنید.</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRescheduleOpen(false)}>
              انصراف
            </Button>
            <Button onClick={submitReschedule} disabled={!newDate || !newTime}>
              ثبت زمان جدید
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/* ------------------------- outer ------------------------- */

export function AppointmentSheet({ appointmentId, open, onOpenChange }: AppointmentSheetProps) {
  const { doctor, patientMap } = useDoctorPanel();
  const allAppointments = useAppStore((s) => s.appointments);

  const appointment = useMemo(
    () => allAppointments.find((a) => a.id === appointmentId),
    [allAppointments, appointmentId]
  );

  if (!appointment || !doctor) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="left" className="w-full gap-0 sm:max-w-md">
          <SheetHeader className="pb-4">
            <SheetTitle>جزئیات نوبت</SheetTitle>
            <SheetDescription className="sr-only">نوبت انتخاب‌شده پیدا نشد</SheetDescription>
          </SheetHeader>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <AppointmentSheetInner
      key={appointment.id}
      appointment={appointment}
      open={open}
      onOpenChange={onOpenChange}
      doctor={doctor}
      patient={patientMap.get(appointment.patientId)}
      patientMap={patientMap}
      allAppointments={allAppointments}
    />
  );
}

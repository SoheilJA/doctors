"use client";

/**
 * AppointmentCard — کارت نوبت با اقدامات: لغو (قانون ۱۲ ساعت)، تغییر زمان، ثبت نظر.
 */

import { useState } from "react";
import { toast } from "sonner";
import { CalendarDays, CalendarX, Check, Clock, Hash, MessageSquarePlus, UsersRound, Video } from "lucide-react";
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
import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { toFa, toman } from "@/lib/fa";
import { faDate, faFromNow, faTime } from "@/lib/jalali";
import { APPOINTMENT_STATUS_LABELS, PAYMENT_STATUS_LABELS, SPECIALTY_LABELS, VISIT_TYPE_LABELS } from "@/lib/constants";
import type { Appointment, Doctor, Patient } from "@/types";
import { StatusBadge } from "@/components/shared/status-badge";
import { UserAvatar } from "@/components/shared/user-avatar";
import { canCancelAppointment } from "@/features/patient/helpers";
import { useAppStore } from "@/store/app-store";
import { RescheduleDialog } from "./reschedule-dialog";
import { ReviewDialog } from "./review-dialog";

interface AppointmentCardProps {
  appointment: Appointment;
  doctor: Doctor;
  patient: Patient;
  reviewed: boolean;
}

export function AppointmentCard({ appointment: a, doctor, patient, reviewed }: AppointmentCardProps) {
  const setAppointmentStatus = useAppStore((s) => s.setAppointmentStatus);
  const rescheduleAppointment = useAppStore((s) => s.rescheduleAppointment);
  const addReview = useAppStore((s) => s.addReview);

  const [confirmCancel, setConfirmCancel] = useState(false);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewedNow, setReviewedNow] = useState(false);

  const isPast = a.status === "completed" || a.status === "cancelled" || a.status === "no-show";
  const muted = a.status === "cancelled" || a.status === "no-show";
  const canCancel = canCancelAppointment(a.date, a.time);

  const doCancel = () => {
    const wasPaid = a.paymentStatus === "paid";
    setAppointmentStatus(a.id, "cancelled", patient.name);
    setConfirmCancel(false);
    toast.success("نوبت لغو شد", {
      description: wasPaid ? "مبلغ تا ۷۲ ساعت آینده به حساب شما بازگردانده می‌شود." : undefined,
    });
  };

  const doReschedule = (date: string, time: string) => {
    rescheduleAppointment(a.id, date, time);
    setRescheduleOpen(false);
    toast.success("زمان نوبت تغییر کرد", {
      description: "پزشک از تغییر زمان مطلع شد و نوبت برای تأیید مجدد در وضعیت «در انتظار» قرار گرفت.",
    });
  };

  const doReview = (rating: number, comment: string) => {
    addReview({ doctorId: doctor.id, patientId: patient.id, appointmentId: a.id, rating, comment });
    setReviewOpen(false);
    setReviewedNow(true);
    toast.success("نظر شما ثبت شد؛ سپاس از همراهی شما");
  };

  return (
    <Card className={cn("overflow-hidden transition-colors", muted && "opacity-70 saturate-50")}>
      <CardContent className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center">
        {/* identity + when */}
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <UserAvatar name={doctor.name} hue={doctor.avatarHue} size="lg" />
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="truncate font-bold">{doctor.name}</p>
              <StatusBadge status={a.status} label={APPOINTMENT_STATUS_LABELS[a.status]} />
              <StatusBadge status={a.paymentStatus} label={PAYMENT_STATUS_LABELS[a.paymentStatus]} />
            </div>
            <p className="text-xs text-muted-foreground">
              {SPECIALTY_LABELS[doctor.specialtyId]} • {doctor.city}
            </p>
            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
              <Badge variant="outline" className="gap-1 text-xs tabular-nums">
                <CalendarDays className="size-3" aria-hidden />
                {faDate(a.date)}
              </Badge>
              <Badge variant="outline" className="gap-1 text-xs tabular-nums">
                <Clock className="size-3" aria-hidden />
                {faTime(a.time)}
              </Badge>
              <Badge variant="secondary" className="gap-1 text-xs">
                {a.visitType === "video" ? <Video className="size-3" aria-hidden /> : undefined}
                {VISIT_TYPE_LABELS[a.visitType]}
              </Badge>
              <Badge variant="outline" className="gap-1 text-xs tabular-nums">
                <Hash className="size-3" aria-hidden />
                {toFa(a.code)}
              </Badge>
            </div>
            {a.forFamilyMember && (
              <Badge variant="outline" className="gap-1 border-violet-500/30 bg-violet-500/10 text-xs text-violet-700 dark:text-violet-400">
                <UsersRound className="size-3" aria-hidden />
                برای {a.forFamilyMember.name} ({a.forFamilyMember.relation})
              </Badge>
            )}
            {a.reason && <p className="truncate text-xs text-muted-foreground">علت مراجعه: {a.reason}</p>}
          </div>
        </div>

        {/* fee */}
        <div className="shrink-0 lg:text-end">
          <p className="text-sm font-bold tabular-nums">{toman(a.fee)}</p>
          <p className="text-[11px] text-muted-foreground">{isPast ? faFromNow(a.date) : ""}</p>
        </div>

        {/* actions */}
        {!isPast ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2 lg:flex-col lg:items-stretch">
            {canCancel ? (
              <Button variant="outline" size="sm" className="gap-1.5 text-rose-600 hover:text-rose-700" onClick={() => setConfirmCancel(true)}>
                <CalendarX className="size-4" aria-hidden />
                لغو نوبت
              </Button>
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1.5 text-muted-foreground" disabled>
                    <CalendarX className="size-4" aria-hidden />
                    لغو نوبت
                  </Button>
                </TooltipTrigger>
                <TooltipContent>لغو نوبت تا ۱۲ ساعت قبل امکان‌پذیر است</TooltipContent>
              </Tooltip>
            )}
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setRescheduleOpen(true)}>
              <CalendarDays className="size-4" aria-hidden />
              تغییر زمان
            </Button>
          </div>
        ) : a.status === "completed" ? (
          reviewed || reviewedNow ? (
            <Button variant="outline" size="sm" className="gap-1.5 text-emerald-600 dark:text-emerald-400" disabled>
              <Check className="size-4" aria-hidden />
              ثبت‌شده ✓
            </Button>
          ) : (
            <Button size="sm" className="gap-1.5" onClick={() => setReviewOpen(true)}>
              <MessageSquarePlus className="size-4" aria-hidden />
              ثبت نظر
            </Button>
          )
        ) : null}

        {/* cancel confirm */}
        <AlertDialog open={confirmCancel} onOpenChange={setConfirmCancel}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>لغو نوبت؟</AlertDialogTitle>
              <AlertDialogDescription>
                نوبت {toFa(a.code)} با {doctor.name} برای {faDate(a.date)} ساعت {faTime(a.time)} لغو می‌شود
                {a.paymentStatus === "paid" && " و مبلغ پرداختی تا ۷۲ ساعت آینده بازگردانده می‌شود"}.
                این عمل قابل بازگشت نیست.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>انصراف</AlertDialogCancel>
              <AlertDialogAction className="bg-rose-600 hover:bg-rose-700" onClick={doCancel}>
                بله، لغو کن
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <RescheduleDialog
          open={rescheduleOpen}
          onOpenChange={setRescheduleOpen}
          appointment={a}
          doctor={doctor}
          onReschedule={doReschedule}
        />

        <ReviewDialog
          open={reviewOpen}
          onOpenChange={setReviewOpen}
          appointment={a}
          doctor={doctor}
          onSubmit={doReview}
        />
      </CardContent>
    </Card>
  );
}

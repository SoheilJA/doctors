"use client";

/**
 * RescheduleDialog — تغییر زمان نوبت: انتخاب تاریخ (تقویم جلالی) + ساعت آزاد.
 */

import { useMemo, useState } from "react";
import { CalendarClock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { faDate, faTime, addDaysISO, dateToISO, todayISO } from "@/lib/jalali";
import { generateSlotsForDate, isDoctorWorking } from "@/lib/schedule";
import { toFa } from "@/lib/fa";
import { JalaliDatePicker } from "@/components/shared/jalali-date-picker";
import { useAppStore } from "@/store/app-store";
import type { Appointment, Doctor } from "@/types";

interface RescheduleDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  appointment: Appointment;
  doctor: Doctor;
  onReschedule: (date: string, time: string) => void;
}

export function RescheduleDialog({ open, onOpenChange, appointment, doctor, onReschedule }: RescheduleDialogProps) {
  const today = todayISO();
  const appointments = useAppStore((s) => s.appointments);
  const [date, setDate] = useState<string | undefined>(undefined);
  const [time, setTime] = useState<string | null>(null);

  const slots = useMemo(() => {
    if (!date) return [];
    const category = appointment.visitType === "in-person" ? "in-person" : "online";
    const docAppointments = appointments.filter((a) => a.doctorId === doctor.id);
    return generateSlotsForDate(doctor, date, docAppointments).filter((s) => s.visitType === category);
  }, [date, doctor, appointment.visitType, appointments]);

  const submit = () => {
    if (!date) return toast.error("تاریخ جدید را انتخاب کنید");
    if (!time) return toast.error("ساعت نوبت را انتخاب کنید");
    if (date === appointment.date && time === appointment.time) {
      return toast.error("زمان انتخابی همان زمان فعلی نوبت است");
    }
    onReschedule(date, time);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarClock className="size-5 text-primary" aria-hidden />
            تغییر زمان نوبت {toFa(appointment.code)}
          </DialogTitle>
          <DialogDescription>
            زمان فعلی: {faDate(appointment.date)} — ساعت {faTime(appointment.time)}؛ زمان جدید را انتخاب کنید.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <JalaliDatePicker
            value={date}
            onChange={(iso) => {
              setDate(iso);
              setTime(null);
            }}
            disabled={(d) => {
              const iso = dateToISO(d);
              return iso < today || iso > addDaysISO(today, 45) || !isDoctorWorking(doctor, iso);
            }}
            placeholder="انتخاب روز جدید"
          />
          {date && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">ساعت‌های آزاد {faDate(date)}:</p>
              {slots.length ? (
                <div className="flex flex-wrap gap-2">
                  {slots.map((slot) => {
                    const full = slot.remaining <= 0;
                    return (
                      <button
                        key={slot.time}
                        type="button"
                        disabled={full}
                        onClick={() => setTime(slot.time)}
                        className={cn(
                          "rounded-xl border px-3.5 py-1.5 text-sm font-semibold tabular-nums transition-colors",
                          time === slot.time ? "border-primary bg-primary text-primary-foreground" : "hover:border-primary/50",
                          full && "cursor-not-allowed border-dashed text-muted-foreground/40"
                        )}
                      >
                        {faTime(slot.time)}
                        {full && <span className="ms-1 text-[10px]">تکمیل</span>}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="rounded-xl border border-dashed p-3 text-center text-xs text-muted-foreground">
                  نوبت آزادی برای این روز باقی نمانده است.
                </p>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            انصراف
          </Button>
          <Button onClick={submit}>تأیید تغییر زمان</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

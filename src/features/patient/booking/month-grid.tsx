"use client";

/**
 * Compact Jalali month grid (booking step 2): next 45 days only,
 * شنبه-first columns, free-slot dot badges, off-day & non-working states.
 */

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { toFa } from "@/lib/fa";
import {
  JALALI_WEEKDAYS_SHORT,
  addDaysISO,
  eachDayISO,
  endOfMonthISO,
  faMonthLabel,
  jalaliMonthKey,
  jalaliParts,
  startOfMonthISO,
  todayISO,
  weekdayIndex,
} from "@/lib/jalali";
import { findOffDay, generateSlotsForDate, isDoctorWorking } from "@/lib/schedule";
import type { Appointment, Doctor } from "@/types";
import type { VisitType } from "@/lib/constants";

interface MonthGridProps {
  doctor: Doctor;
  appointments: Appointment[];
  visitType: VisitType | null;
  selected: string | null;
  onSelect: (iso: string) => void;
}

export function BookingMonthGrid({ doctor, appointments, visitType, selected, onSelect }: MonthGridProps) {
  const today = todayISO();
  const endISO = addDaysISO(today, 45);
  const [offset, setOffset] = useState(0);

  /** month anchors overlapping [today, today+45] */
  const months = useMemo(() => {
    const list: string[] = [];
    let cursor = startOfMonthISO(today);
    while (cursor <= endISO) {
      list.push(cursor);
      cursor = startOfMonthISO(addDaysISO(cursor, 31));
    }
    return list;
  }, [today, endISO]);

  const viewIndex = Math.min(offset, months.length - 1);
  const anchor = months[viewIndex];

  const days = useMemo(() => {
    if (!anchor) return [];
    const monthStart = anchor;
    const monthEnd = endOfMonthISO(anchor);
    const slotCategory: "in-person" | "online" | null =
      visitType && visitType !== "in-person" ? "online" : visitType === "in-person" ? "in-person" : null;
    const docAppointments = appointments.filter((a) => a.doctorId === doctor.id);
    return eachDayISO(monthStart, monthEnd).map((iso) => {
      const inRange = iso >= today && iso <= endISO;
      const working = inRange && isDoctorWorking(doctor, iso);
      let free = 0;
      if (working) {
        free = generateSlotsForDate(doctor, iso, docAppointments).filter(
          (s) => (!slotCategory || s.visitType === slotCategory) && s.remaining > 0
        ).length;
      }
      const off = findOffDay(doctor, iso);
      return { iso, inRange, working, free, off };
    });
  }, [anchor, today, endISO, doctor, appointments, visitType]);

  if (!anchor) return null;

  const leading = weekdayIndex(anchor);

  return (
    <div className="rounded-2xl border p-3">
      {/* month header */}
      <div className="mb-2 flex items-center justify-between">
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          aria-label="ماه بعد"
          disabled={viewIndex >= months.length - 1}
          onClick={() => setOffset((o) => Math.min(o + 1, months.length - 1))}
        >
          <ChevronLeft className="size-4" aria-hidden />
        </Button>
        <p className="text-sm font-bold">{faMonthLabel(jalaliMonthKey(anchor))}</p>
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          aria-label="ماه قبل"
          disabled={viewIndex <= 0}
          onClick={() => setOffset((o) => Math.max(o - 1, 0))}
        >
          <ChevronRight className="size-4" aria-hidden />
        </Button>
      </div>

      {/* weekday header */}
      <div className="mb-1 grid grid-cols-7 gap-1 text-center">
        {JALALI_WEEKDAYS_SHORT.map((d) => (
          <span key={d} className="py-1 text-[11px] font-medium text-muted-foreground">
            {d}
          </span>
        ))}
      </div>

      {/* days */}
      <div className="grid grid-cols-7 gap-1" role="grid" aria-label="انتخاب روز">
        {Array.from({ length: leading }).map((_, i) => (
          <span key={`blank-${i}`} aria-hidden />
        ))}
        {days.map(({ iso, inRange, working, free, off }) => {
          const jd = jalaliParts(iso).jd;
          const isToday = iso === today;
          const isSelected = iso === selected;
          const disabled = !working;
          const dayBtn = (
            <button
              key={iso}
              type="button"
              role="gridcell"
              aria-selected={isSelected}
              aria-label={`روز ${toFa(jd)}`}
              disabled={disabled}
              onClick={() => onSelect(iso)}
              className={cn(
                "relative flex h-10 flex-col items-center justify-center rounded-xl text-sm transition-colors",
                !inRange && "text-muted-foreground/25",
                inRange && !disabled && "hover:bg-primary/10",
                disabled && inRange && "text-muted-foreground/45 line-through decoration-muted-foreground/40",
                isToday && !isSelected && "font-extrabold ring-1 ring-primary/50",
                isSelected && "bg-primary text-primary-foreground shadow-sm"
              )}
            >
              <span className="leading-none">{toFa(jd)}</span>
              {free > 0 && (
                <span
                  className={cn(
                    "mt-0.5 rounded-full px-1.5 text-[9px] font-bold leading-tight",
                    isSelected ? "bg-primary-foreground/20 text-primary-foreground" : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                  )}
                >
                  {toFa(free)}
                </span>
              )}
              {working && free === 0 && (
                <span className={cn("mt-0.5 text-[9px] leading-tight", isSelected ? "text-primary-foreground/80" : "text-muted-foreground/60")}>
                  تکمیل
                </span>
              )}
            </button>
          );
          return off && inRange && !isSelected ? (
            <Tooltip key={iso}>
              <TooltipTrigger asChild>{dayBtn}</TooltipTrigger>
              <TooltipContent>مرخصی: {off.reason}</TooltipContent>
            </Tooltip>
          ) : (
            dayBtn
          );
        })}
      </div>

      <p className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <span className="size-2 rounded-full bg-emerald-500/60" aria-hidden />
        عدد روی هر روز: تعداد نوبت آزاد
      </p>
    </div>
  );
}

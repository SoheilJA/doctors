"use client";

/**
 * /doctor/calendar — booking calendar with ماه / هفته / روز views,
 * status & type filters, off-day markers and a shared detail side sheet.
 */

import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  CalendarOff,
  ChevronLeft,
  ChevronRight,
  Clock,
  Plus,
  Sparkles,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { useDemoLoading } from "@/components/shared/hydration-gate";
import { useAppStore } from "@/store/app-store";
import {
  APPOINTMENT_STATUS_LABELS,
  VISIT_TYPE_LABELS,
  badgeStyleFor,
  type AppointmentStatus,
  type VisitType,
} from "@/lib/constants";
import {
  addDaysISO,
  addMonthsISO,
  eachDayISO,
  endOfWeekISO,
  faDate,
  faDateMedium,
  faDateShort,
  faMonthLabel,
  faTime,
  jalaliMonthKey,
  jalaliParts,
  startOfMonthISO,
  startOfWeekISO,
  subDaysISO,
  subMonthsISO,
  todayISO,
  weekdayIndex,
  JALALI_WEEKDAYS,
  JALALI_WEEKDAYS_SHORT,
} from "@/lib/jalali";
import { toFa } from "@/lib/fa";
import { findOffDay, generateSlotsForDate } from "@/lib/schedule";
import { cn } from "@/lib/utils";
import { appointmentPatientName, byTime, useDoctorPanel } from "@/features/doctor/shared";
import { AppointmentSheet } from "@/features/doctor/appointment-sheet";
import type { Appointment, Patient } from "@/types";

/* ------------------------- shared bits ------------------------- */

const BLOCK_STYLES: Record<AppointmentStatus, string> = {
  pending: "border-amber-500/50 bg-amber-500/15 text-amber-800 dark:text-amber-300",
  confirmed: "border-teal-500/50 bg-teal-500/15 text-teal-800 dark:text-teal-300",
  completed: "border-emerald-500/50 bg-emerald-500/15 text-emerald-800 dark:text-emerald-300",
  cancelled: "border-rose-500/50 bg-rose-500/15 text-rose-800 dark:text-rose-300",
  "no-show": "border-orange-500/50 bg-orange-500/15 text-orange-800 dark:text-orange-300",
};

const WEEK_HOURS = Array.from({ length: 16 }, (_, i) => i + 6); // 06:00 .. 22:00
const DAY_START_MIN = 6 * 60;
const DAY_TOTAL_MIN = 16 * 60;

type StatusFilter = "all" | AppointmentStatus;
type TypeFilter = "all" | VisitType;

function firstName(a: Appointment, patientNames: Map<string, string>): string {
  return (patientNames.get(a.id) ?? "بیمار").split(" ")[0];
}

/* ------------------------- legend ------------------------- */

function StatusLegend() {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground" aria-label="راهنمای رنگ وضعیت‌ها">
      {(Object.keys(APPOINTMENT_STATUS_LABELS) as AppointmentStatus[]).map((s) => (
        <span key={s} className="flex items-center gap-1.5">
          <span className={cn("size-2.5 rounded-full", badgeStyleFor(s).dot)} aria-hidden />
          {APPOINTMENT_STATUS_LABELS[s]}
        </span>
      ))}
      <span className="flex items-center gap-1.5">
        <span className="size-2.5 rounded-sm border border-dashed bg-muted" aria-hidden />
        تعطیل
      </span>
    </div>
  );
}

/* ------------------------- main content ------------------------- */

export function CalendarContent() {
  const loading = useDemoLoading();
  const { doctor, appointments } = useDoctorPanel();
  const allPatients = useAppStore((s) => s.patients);
  const patientNameByAppointment = useMemo(() => {
    const patientById = new Map<string, Patient>(allPatients.map((p) => [p.id, p]));
    const m = new Map<string, string>();
    for (const a of appointments) m.set(a.id, appointmentPatientName(a, patientById));
    return m;
  }, [appointments, allPatients]);

  const [view, setView] = useState<"month" | "week" | "day">("month");
  const [anchor, setAnchor] = useState<string>(todayISO());
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [sheetId, setSheetId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const filtered = useMemo(
    () =>
      appointments.filter(
        (a) =>
          (statusFilter === "all" || a.status === statusFilter) &&
          (typeFilter === "all" || a.visitType === typeFilter)
      ),
    [appointments, statusFilter, typeFilter]
  );

  const byDate = useMemo(() => {
    const m = new Map<string, Appointment[]>();
    for (const a of filtered) {
      const list = m.get(a.date) ?? [];
      list.push(a);
      m.set(a.date, list);
    }
    for (const list of m.values()) list.sort(byTime);
    return m;
  }, [filtered]);

  const openSheet = (id: string) => {
    setSheetId(id);
    setSheetOpen(true);
  };

  const goToday = () => setAnchor(todayISO());

  return (
    <div className="space-y-4">
      <PageHeader
        title="تقویم رزروها"
        description={`امروز ${faDate(todayISO())}`}
        loading={loading}
        actions={
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="size-8" aria-label={view === "month" ? "ماه قبل" : view === "week" ? "هفته قبل" : "روز قبل"} onClick={() => setAnchor(view === "month" ? subMonthsISO(anchor, 1) : view === "week" ? subDaysISO(anchor, 7) : subDaysISO(anchor, 1))}>
              <ChevronRight className="size-4" aria-hidden />
            </Button>
            <Button variant="outline" size="sm" className="h-8" onClick={goToday}>
              امروز
            </Button>
            <Button variant="outline" size="icon" className="size-8" aria-label={view === "month" ? "ماه بعد" : view === "week" ? "هفته بعد" : "روز بعد"} onClick={() => setAnchor(view === "month" ? addMonthsISO(anchor, 1) : view === "week" ? addDaysISO(anchor, 7) : addDaysISO(anchor, 1))}>
              <ChevronLeft className="size-4" aria-hidden />
            </Button>
          </div>
        }
      />

      {/* toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <Tabs value={view} onValueChange={(v) => setView(v as typeof view)}>
          <TabsList>
            <TabsTrigger value="month">ماه</TabsTrigger>
            <TabsTrigger value="week">هفته</TabsTrigger>
            <TabsTrigger value="day">روز</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
            <SelectTrigger className="h-8 w-40 text-xs" aria-label="فیلتر وضعیت">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">همه وضعیت‌ها</SelectItem>
              {(Object.keys(APPOINTMENT_STATUS_LABELS) as AppointmentStatus[]).map((s) => (
                <SelectItem key={s} value={s}>
                  {APPOINTMENT_STATUS_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as TypeFilter)}>
            <SelectTrigger className="h-8 w-36 text-xs" aria-label="فیلتر نوع ویزیت">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">همه انواع</SelectItem>
              {(Object.keys(VISIT_TYPE_LABELS) as VisitType[]).map((t) => (
                <SelectItem key={t} value={t}>
                  {VISIT_TYPE_LABELS[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <StatusLegend />
      </div>

      {view === "month" && <MonthView anchor={anchor} byDate={byDate} patientNames={patientNameByAppointment} doctor={doctor} onOpen={openSheet} onPickDay={(iso) => { setAnchor(iso); setView("day"); }} loading={loading} />}
      {view === "week" && <WeekView anchor={anchor} byDate={byDate} patientNames={patientNameByAppointment} doctor={doctor} onOpen={openSheet} loading={loading} />}
      {view === "day" && <DayView anchor={anchor} allFiltered={filtered} patientNames={patientNameByAppointment} doctor={doctor} onOpen={openSheet} loading={loading} />}

      <AppointmentSheet appointmentId={sheetId} open={sheetOpen} onOpenChange={setSheetOpen} />
    </div>
  );
}

/* ------------------------- month view ------------------------- */

function MonthView({
  anchor,
  byDate,
  patientNames,
  doctor,
  onOpen,
  onPickDay,
  loading,
}: {
  anchor: string;
  byDate: Map<string, Appointment[]>;
  patientNames: Map<string, string>;
  doctor: ReturnType<typeof useDoctorPanel>["doctor"];
  onOpen: (id: string) => void;
  onPickDay: (iso: string) => void;
  loading: boolean;
}) {
  const days = useMemo(() => {
    const gridStart = startOfWeekISO(startOfMonthISO(anchor));
    return eachDayISO(gridStart, addDaysISO(gridStart, 41));
  }, [anchor]);

  const monthKey = jalaliMonthKey(anchor);
  const today = todayISO();

  if (loading) {
    return <div className="h-[520px] animate-pulse rounded-xl border" />;
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{faMonthLabel(monthKey)}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-muted-foreground">
          {JALALI_WEEKDAYS_SHORT.map((w, i) => (
            <span key={i} className="py-1">{w}</span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {days.map((iso) => {
            const inMonth = jalaliMonthKey(iso) === monthKey;
            const isToday = iso === today;
            const dayList = byDate.get(iso) ?? [];
            const off = doctor ? findOffDay(doctor, iso) : undefined;
            const hasOverride = doctor?.overrides.some((o) => o.date === iso) ?? false;
            const shown = dayList.slice(0, 3);
            const rest = dayList.length - shown.length;
            return (
              <div
                key={iso}
                className={cn(
                  "min-h-24 rounded-lg border p-1 text-start md:min-h-28",
                  !inMonth && "bg-muted/30 text-muted-foreground/60",
                  inMonth && off && !hasOverride && "border-dashed bg-muted/60",
                  isToday && "ring-2 ring-primary ring-offset-1"
                )}
              >
                <button
                  type="button"
                  className="flex w-full items-center justify-between px-0.5 pt-0.5 text-start"
                  onClick={() => onPickDay(iso)}
                  aria-label={`نمایش روز ${faDateMedium(iso)}`}
                >
                  <span className={cn("text-xs font-bold tabular-nums", isToday && "text-primary")}>
                    {toFa(jalaliParts(iso).jd)}
                  </span>
                  <span className="flex items-center gap-1">
                    {hasOverride && (
                      <Sparkles className="size-3 text-violet-500" aria-label="ساعت ویژه" />
                    )}
                    {off && !hasOverride && (
                      <span className="rounded bg-muted px-1 text-[9px] font-medium text-muted-foreground">تعطیل</span>
                    )}
                  </span>
                </button>
                <div className="mt-0.5 space-y-0.5">
                  {shown.map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => onOpen(a.id)}
                      className="flex w-full items-center gap-1 rounded px-1 py-0.5 text-[10px] font-medium transition-colors hover:bg-accent"
                      aria-label={`نوبت ${patientNames.get(a.id)} ساعت ${faTime(a.time)}`}
                    >
                      <span className={cn("size-1.5 shrink-0 rounded-full", badgeStyleFor(a.status).dot)} aria-hidden />
                      <span className="truncate">
                        {faTime(a.time)} {firstName(a, patientNames)}
                      </span>
                    </button>
                  ))}
                  {rest > 0 && (
                    <button
                      type="button"
                      onClick={() => onPickDay(iso)}
                      className="w-full rounded px-1 text-[10px] font-medium text-primary hover:underline"
                    >
                      +{toFa(rest)} بیشتر
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

/* ------------------------- week view ------------------------- */

function WeekView({
  anchor,
  byDate,
  patientNames,
  doctor,
  onOpen,
  loading,
}: {
  anchor: string;
  byDate: Map<string, Appointment[]>;
  patientNames: Map<string, string>;
  doctor: ReturnType<typeof useDoctorPanel>["doctor"];
  onOpen: (id: string) => void;
  loading: boolean;
}) {
  const days = useMemo(() => eachDayISO(startOfWeekISO(anchor), endOfWeekISO(anchor)), [anchor]);

  if (loading) {
    return <div className="h-[600px] animate-pulse rounded-xl border" />;
  }

  return (
    <Card>
      <CardContent className="pt-4">
        <div className="overflow-x-auto">
          <div className="min-w-[760px]">
            <div className="grid grid-cols-[3.2rem_repeat(7,minmax(0,1fr))] gap-1 text-center">
              <span />
              {days.map((iso) => (
                <div key={iso} className="rounded-lg bg-muted/60 py-1 text-[11px] leading-tight">
                  <p className="font-semibold">{JALALI_WEEKDAYS[weekdayIndex(iso)]}</p>
                  <p className="text-muted-foreground">{faDateShort(iso)}</p>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-[3.2rem_repeat(7,minmax(0,1fr))] gap-1">
              {/* hour labels */}
              <div className="pt-1 text-end">
                {WEEK_HOURS.map((h) => (
                  <div key={h} className="h-14 -translate-y-2 text-[10px] tabular-nums text-muted-foreground">
                    {faTime(`${String(h).padStart(2, "0")}:00`)}
                  </div>
                ))}
              </div>
              {days.map((iso) => {
                const list = byDate.get(iso) ?? [];
                const off = doctor ? findOffDay(doctor, iso) : undefined;
                const hasOverride = doctor?.overrides.some((o) => o.date === iso) ?? false;
                return (
                  <div
                    key={iso}
                    className={cn(
                      "relative border-s border-e-slate-200/60 dark:border-e-slate-800",
                      off && !hasOverride && "bg-muted/40"
                    )}
                  >
                    {WEEK_HOURS.map((h) => (
                      <div key={h} className="h-14 border-b border-dashed" />
                    ))}
                    {off && !hasOverride && (
                      <span className="absolute inset-x-1 top-1 rounded bg-muted px-1 text-center text-[10px] text-muted-foreground">
                        تعطیل — {off.reason}
                      </span>
                    )}
                    {list.map((a) => {
                      const top = ((timeToMin(a.time) - DAY_START_MIN) / DAY_TOTAL_MIN) * 100;
                      const height = (Math.max(a.duration, 30) / DAY_TOTAL_MIN) * 100;
                      return (
                        <button
                          key={a.id}
                          type="button"
                          onClick={() => onOpen(a.id)}
                          className={cn(
                            "absolute inset-x-0.5 z-10 overflow-hidden rounded-md border p-1 text-start text-[10px] font-medium leading-tight transition-transform hover:scale-[1.02] hover:shadow-md",
                            BLOCK_STYLES[a.status]
                          )}
                          style={{ top: `${top}%`, height: `${height}%` }}
                          aria-label={`نوبت ${patientNames.get(a.id)} ساعت ${faTime(a.time)} — ${APPOINTMENT_STATUS_LABELS[a.status]}`}
                        >
                          <span className="block font-bold tabular-nums">{faTime(a.time)}</span>
                          <span className="block truncate">{firstName(a, patientNames)}</span>
                          <span className="block truncate text-[9px] opacity-80">{VISIT_TYPE_LABELS[a.visitType]}</span>
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        {WEEK_HOURS.length === 0 && null}
      </CardContent>
    </Card>
  );
}

function timeToMin(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + (m || 0);
}

/* ------------------------- day view ------------------------- */

function DayView({
  anchor,
  allFiltered,
  patientNames,
  doctor,
  onOpen,
  loading,
}: {
  anchor: string;
  allFiltered: Appointment[];
  patientNames: Map<string, string>;
  doctor: ReturnType<typeof useDoctorPanel>["doctor"];
  onOpen: (id: string) => void;
  loading: boolean;
}) {
  const allAppointments = useAppStore((s) => s.appointments);
  const setAppointmentStatus = useAppStore((s) => s.setAppointmentStatus);
  const { session } = useDoctorPanel();

  const dayList = useMemo(() => allFiltered.filter((a) => a.date === anchor).sort(byTime), [allFiltered, anchor]);

  const freeSlots = useMemo(() => {
    if (!doctor) return [];
    return generateSlotsForDate(doctor, anchor, allAppointments).filter((s) => s.remaining > 0);
  }, [doctor, anchor, allAppointments]);

  const off = doctor ? findOffDay(doctor, anchor) : undefined;

  const quick = (a: Appointment, status: "confirmed" | "completed") => {
    setAppointmentStatus(a.id, status, session?.name);
    toast.success(status === "confirmed" ? "نوبت تأیید شد" : "ویزیت انجام‌شده ثبت شد", { description: `نوبت ${toFa(a.code)}` });
  };

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">برنامه {faDate(anchor)}</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-16 animate-pulse rounded-xl bg-muted" />
              ))}
            </div>
          ) : dayList.length === 0 ? (
            <EmptyState
              icon={CalendarOff}
              title="نوبتی برای این روز ثبت نشده است"
              description={off ? `این روز تعطیل است — ${off.reason}` : "روز دیگری را انتخاب کنید."}
              className="py-10"
            />
          ) : (
            <ul className="space-y-2">
              {dayList.map((a) => (
                <li key={a.id}>
                  <button
                    type="button"
                    onClick={() => onOpen(a.id)}
                    className="flex w-full flex-wrap items-center gap-x-3 gap-y-1.5 rounded-xl border p-3 text-start transition-colors hover:border-primary/40"
                  >
                    <span className="min-w-14 rounded-lg bg-primary/10 px-2 py-1 text-center text-sm font-bold tabular-nums text-primary">
                      {faTime(a.time)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{patientNames.get(a.id)}</span>
                      <span className="block text-xs text-muted-foreground">
                        {VISIT_TYPE_LABELS[a.visitType]} • {toFa(a.code)} • {a.reason || "بدون دلیل ثبت‌شده"}
                      </span>
                    </span>
                    <StatusBadge status={a.status} label={APPOINTMENT_STATUS_LABELS[a.status]} />
                    {a.status === "pending" && (
                      <span
                        role="button"
                        tabIndex={0}
                        className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-2 py-1 text-xs font-medium text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-400"
                        onClick={(e) => {
                          e.stopPropagation();
                          quick(a, "confirmed");
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.stopPropagation();
                            quick(a, "confirmed");
                          }
                        }}
                      >
                        تأیید
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="size-4 text-primary" aria-hidden />
            نوبت‌های خالی این روز
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="h-40 animate-pulse rounded-xl bg-muted" />
          ) : off && doctor?.overrides.every((o) => o.date !== anchor) ? (
            <Alert>
              <CalendarOff className="size-4" aria-hidden />
              <AlertDescription>این روز تعطیل است — {off.reason}</AlertDescription>
            </Alert>
          ) : freeSlots.length === 0 ? (
            <EmptyState icon={Clock} title="نوبت خالی باقی نمانده است" description="برای تغییر ساعات کاری به «روزها و ساعات کاری» بروید." className="py-10" />
          ) : (
            <div className="flex max-h-96 flex-wrap gap-1.5 overflow-y-auto">
              {freeSlots.map((s) => (
                <span key={s.time} className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-2 py-1 text-xs font-medium tabular-nums text-emerald-700 dark:text-emerald-400">
                  <Plus className="size-3" aria-hidden />
                  {faTime(s.time)}
                  <span className="text-[10px] font-normal">خالی</span>
                </span>
              ))}
            </div>
          )}
          <p className="mt-3 text-[11px] text-muted-foreground">
            {off ? "" : `تعداد ظرفیت آزاد: ${toFa(freeSlots.reduce((s, x) => s + x.remaining, 0))} نفر`}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

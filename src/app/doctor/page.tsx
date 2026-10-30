"use client";

/**
 * /doctor — Doctor dashboard: KPIs, charts, today's program,
 * upcoming appointments and latest reviews (all seeded store data).
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";
import {
  CalendarCheck,
  CalendarDays,
  CalendarOff,
  CheckCircle2,
  ChevronLeft,
  ClipboardCheck,
  MessageSquareText,
  Star,
  Stethoscope,
  UserRound,
  UsersRound,
  Wallet,
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { ChartCard } from "@/components/shared/chart-card";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { RatingStars } from "@/components/shared/rating-stars";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { useDemoLoading } from "@/components/shared/hydration-gate";
import { useAppStore } from "@/store/app-store";
import {
  APPOINTMENT_STATUS_LABELS,
  VISIT_TYPE_LABELS,
  type VisitType,
} from "@/lib/constants";
import { faNum, toFa, toman, tomanCompact } from "@/lib/fa";
import {
  eachDayISO,
  endOfWeekISO,
  faDate,
  faDateShort,
  faFromNow,
  faMonthLabel,
  faTime,
  jalaliMonthKey,
  startOfWeekISO,
  subDaysISO,
  subMonthsISO,
  todayISO,
  weekdayIndex,
  JALALI_WEEKDAYS_SHORT,
} from "@/lib/jalali";
import {
  appointmentPatientName,
  byDateTimeAsc,
  byTime,
  netFee,
  useDoctorPanel,
  VISIT_TYPE_ICONS,
} from "@/features/doctor/shared";
import type { Appointment } from "@/types";

const HEAT_LADDER = [
  "bg-primary/8",
  "bg-primary/15",
  "bg-primary/25",
  "bg-primary/40",
  "bg-primary/55",
  "bg-primary/70",
  "bg-primary/90",
];

const HEAT_HOURS = Array.from({ length: 14 }, (_, i) => i + 8); // 8..21

export default function DoctorDashboardPage() {
  const loading = useDemoLoading();
  const router = useRouter();
  const { doctor, appointments, consultations, reviews, patientMap } = useDoctorPanel();
  const setAppointmentStatus = useAppStore((s) => s.setAppointmentStatus);
  const [cancelTarget, setCancelTarget] = useState<Appointment | null>(null);

  const today = todayISO();

  /* ------------------------------ stats ------------------------------ */

  const stats = useMemo(() => {
    const todays = appointments.filter((a) => a.date === today).sort(byTime);
    const weekStart = startOfWeekISO(today);
    const weekEnd = endOfWeekISO(today);
    const thisWeek = appointments.filter(
      (a) => a.date >= weekStart && a.date <= weekEnd && a.status !== "cancelled" && a.status !== "no-show"
    );
    const monthKey = jalaliMonthKey(today);
    const monthCompleted = appointments.filter(
      (a) => a.status === "completed" && a.paymentStatus === "paid" && jalaliMonthKey(a.date) === monthKey
    );
    const monthNet = monthCompleted.reduce((s, a) => s + netFee(a), 0);
    const waiting = consultations.filter((c) => c.status === "waiting");
    const overdue = waiting.filter((c) => new Date(c.deadlineISO).getTime() < Date.now());

    // patients whose first-ever visit with this doctor happened this month
    const firstVisit = new Map<string, string>();
    for (const a of [...appointments].sort(byDateTimeAsc)) {
      if (a.status === "cancelled") continue;
      if (!firstVisit.has(a.patientId)) firstVisit.set(a.patientId, a.date);
    }
    const newPatients = [...firstVisit.values()].filter((d) => jalaliMonthKey(d) === monthKey).length;

    return {
      todays,
      confirmedToday: todays.filter((a) => a.status === "confirmed").length,
      thisWeek: thisWeek.length,
      monthNet,
      monthVisitCount: monthCompleted.length,
      waiting: waiting.length,
      overdue: overdue.length,
      newPatients,
    };
  }, [appointments, consultations, today]);

  /* ------------------------------ charts ------------------------------ */

  const visits30 = useMemo(() => {
    const byDay = new Map<string, number>();
    for (const a of appointments) {
      if (a.status !== "completed") continue;
      byDay.set(a.date, (byDay.get(a.date) ?? 0) + 1);
    }
    return eachDayISO(subDaysISO(today, 29), today).map((d) => ({
      label: faDateShort(d),
      visits: byDay.get(d) ?? 0,
    }));
  }, [appointments, today]);

  const monthKeys = useMemo(
    () => [5, 4, 3, 2, 1, 0].map((i) => jalaliMonthKey(subMonthsISO(today, i))),
    [today]
  );

  const income6 = useMemo(
    () =>
      monthKeys.map((key) => {
        const rows = appointments.filter(
          (a) => a.status === "completed" && a.paymentStatus === "paid" && jalaliMonthKey(a.date) === key
        );
        return {
          label: faMonthLabel(key),
          net: rows.reduce((s, a) => s + netFee(a), 0),
          gross: rows.reduce((s, a) => s + a.fee, 0),
        };
      }),
    [appointments, monthKeys]
  );

  const visitTypeData = useMemo(() => {
    const keys: VisitType[] = ["in-person", "phone", "text", "video"];
    return keys
      .map((k) => ({
        key: k === "in-person" ? "inPerson" : k,
        label: VISIT_TYPE_LABELS[k],
        value: appointments.filter((a) => a.visitType === k && a.status !== "cancelled").length,
      }))
      .filter((d) => d.value > 0);
  }, [appointments]);

  const heat = useMemo(() => {
    const counts = new Map<string, number>();
    let max = 1;
    for (const a of appointments) {
      if (a.status === "cancelled" || a.status === "no-show") continue;
      const key = `${weekdayIndex(a.date)}|${Number(a.time.split(":")[0])}`;
      const v = (counts.get(key) ?? 0) + 1;
      counts.set(key, v);
      max = Math.max(max, v);
    }
    return { counts, max };
  }, [appointments]);

  const ratingTrend = useMemo(
    () =>
      monthKeys.map((key) => {
        const rows = reviews.filter((r) => jalaliMonthKey(r.createdAtISO) === key);
        return {
          label: faMonthLabel(key),
          avg: rows.length ? Math.round((rows.reduce((s, r) => s + r.rating, 0) / rows.length) * 10) / 10 : null,
        };
      }),
    [monthKeys, reviews]
  );

  /* --------------------------- lists --------------------------- */

  const upcoming = useMemo(
    () =>
      appointments
        .filter((a) => (a.status === "confirmed" || a.status === "pending") && a.date >= today)
        .sort(byDateTimeAsc)
        .slice(0, 5),
    [appointments, today]
  );

  const latestReviews = useMemo(
    () => [...reviews].sort((a, b) => b.createdAtISO.localeCompare(a.createdAtISO)).slice(0, 3),
    [reviews]
  );

  if (!doctor) {
    return <PageHeader title="داشبورد پزشک" description="در حال بارگذاری…" loading={loading} />;
  }

  const quickAction = (a: Appointment, status: "confirmed" | "completed") => {
    setAppointmentStatus(a.id, status, doctor.name);
    toast.success(status === "confirmed" ? "نوبت تأیید شد" : "ویزیت انجام‌شده ثبت شد", {
      description: `نوبت ${toFa(a.code)}`,
    });
  };

  const doCancel = () => {
    if (!cancelTarget) return;
    const wasPaid = cancelTarget.paymentStatus === "paid";
    setAppointmentStatus(cancelTarget.id, "cancelled", doctor.name);
    toast("نوبت لغو شد", { description: wasPaid ? "مبلغ پرداختی به بیمار بازگشت داده شد." : undefined });
    setCancelTarget(null);
  };

  const visitsConfig = { visits: { label: "ویزیت", color: "var(--chart-1)" } } as const;
  const incomeConfig = { net: { label: "درآمد خالص", color: "var(--chart-2)" } } as const;
  const donutConfig = {
    inPerson: { label: "حضوری", color: "var(--chart-1)" },
    phone: { label: "تلفنی", color: "var(--chart-2)" },
    text: { label: "متنی", color: "var(--chart-3)" },
    video: { label: "ویدیویی", color: "var(--chart-5)" },
  } as const;
  const ratingConfig = { avg: { label: "میانگین امتیاز", color: "var(--chart-4)" } } as const;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`سلام ${doctor.name} 👋`}
        description={`امروز ${faDate(today)} — ${toFa(stats.todays.length)} نوبت در برنامه دارید.`}
        loading={loading}
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href="/doctor/calendar">
              <CalendarDays className="size-4" aria-hidden />
              مشاهده تقویم
            </Link>
          </Button>
        }
      />

      {/* KPI cards */}
      <section className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6" aria-label="شاخص‌های کلیدی">
        <StatCard
          title="نوبت‌های امروز"
          value={faNum(stats.todays.length)}
          hint={`${toFa(stats.confirmedToday)} نوبت تأییدشده`}
          icon={CalendarCheck}
          tone="primary"
          loading={loading}
          onClick={() => router.push("/doctor/calendar")}
        />
        <StatCard
          title="ویزیت‌های این هفته"
          value={faNum(stats.thisWeek)}
          hint="شنبه تا جمعه جاری"
          icon={ClipboardCheck}
          tone="sky"
          loading={loading}
          onClick={() => router.push("/doctor/appointments")}
        />
        <StatCard
          title="درآمد ماه جاری"
          value={tomanCompact(stats.monthNet)}
          hint={`از ${toFa(stats.monthVisitCount)} ویزیت (پس از کسر کمیسیون)`}
          icon={Wallet}
          tone="emerald"
          loading={loading}
          onClick={() => router.push("/doctor/finance")}
        />
        <StatCard
          title="میانگین امتیاز"
          value={`${toFa(doctor.rating.toFixed(1))} از ۵`}
          hint={`بر اساس ${toFa(doctor.reviewCount)} نظر`}
          icon={Star}
          tone="amber"
          loading={loading}
          onClick={() => router.push("/doctor/reviews")}
        />
        <StatCard
          title="مشاوره‌های بی‌پاسخ"
          value={faNum(stats.waiting)}
          hint="در انتظار پاسخ شما"
          trend={stats.overdue > 0 ? { value: `${toFa(stats.overdue)} مورد مهلت گذشته`, positive: false } : undefined}
          icon={MessageSquareText}
          tone={stats.overdue > 0 ? "rose" : "violet"}
          loading={loading}
          onClick={() => router.push("/doctor/consultations")}
        />
        <StatCard
          title="بیماران جدید این ماه"
          value={faNum(stats.newPatients)}
          hint="اولین ویزیتشان با شما"
          icon={UsersRound}
          tone="violet"
          loading={loading}
          onClick={() => router.push("/doctor/patients")}
        />
      </section>

      {/* charts row 1 */}
      <section className="grid gap-4 lg:grid-cols-3" aria-label="نمودارها">
        <ChartCard
          title="ویزیت‌های ۳۰ روز گذشته"
          description="تعداد ویزیت‌های انجام‌شده در هر روز"
          config={visitsConfig}
          loading={loading}
          className="lg:col-span-2"
        >
          <AreaChart data={visits30} margin={{ top: 8, left: 0, right: 8 }}>
            <defs>
              <linearGradient id="visitsFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-visits)" stopOpacity={0.35} />
                <stop offset="95%" stopColor="var(--color-visits)" stopOpacity={0.03} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} interval={4} reversed />
            <YAxis tickLine={false} axisLine={false} width={28} allowDecimals={false} tickFormatter={(v) => faNum(Number(v))} />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  labelFormatter={(l) => String(l)}
                  formatter={(v) => [`${faNum(Number(v))} ویزیت`, "انجام‌شده"]}
                />
              }
            />
            <Area dataKey="visits" type="monotone" stroke="var(--color-visits)" strokeWidth={2.2} fill="url(#visitsFill)" />
          </AreaChart>
        </ChartCard>

        <ChartCard
          title="پرتقاضاترین ساعت‌ها"
          description="تعداد نوبت‌ها به تفکیک روز هفته و ساعت"
          config={{}}
          loading={loading}
          height="h-64"
        >
          <div className="flex h-full flex-col gap-1 overflow-x-auto" dir="rtl">
            <div className="grid grid-cols-8 gap-1 text-center text-[10px] font-medium text-muted-foreground">
              <span />
              {JALALI_WEEKDAYS_SHORT.map((w) => (
                <span key={w}>{w}</span>
              ))}
            </div>
            <div className="grid flex-1 grid-flow-row grid-cols-8 content-stretch gap-1">
              {HEAT_HOURS.map((h) => (
                <div key={h} className="col-span-8 grid grid-cols-8 items-stretch gap-1">
                  <span className="self-center text-[10px] tabular-nums text-muted-foreground">{faTime(`${String(h).padStart(2, "0")}:00`)}</span>
                  {[0, 1, 2, 3, 4, 5, 6].map((w) => {
                    const count = heat.counts.get(`${w}|${h}`) ?? 0;
                    const intensity = count === 0 ? 0 : Math.max(1, Math.ceil((count / heat.max) * HEAT_LADDER.length));
                    return (
                      <div
                        key={w}
                        title={`${JALALI_WEEKDAYS_SHORT[w]} ساعت ${faTime(`${String(h).padStart(2, "0")}:00`)} — ${toFa(count)} نوبت`}
                        className={`min-h-4 rounded-[4px] ${count === 0 ? "bg-muted" : HEAT_LADDER[intensity - 1]}`}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </ChartCard>
      </section>

      {/* charts row 2 */}
      <section className="grid gap-4 lg:grid-cols-3" aria-label="نمودار درآمد و نظرات">
        <ChartCard title="درآمد ۶ ماه اخیر" description="سهم خالص شما پس از کسر کمیسیون" config={incomeConfig} loading={loading}>
          <BarChart data={income6} margin={{ top: 8, left: 0, right: 8 }}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} reversed />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={52}
              tickFormatter={(v) => tomanCompact(Number(v)).replace(" تومان", "")}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  labelFormatter={(l) => String(l)}
                  formatter={(v, _n, item) => [
                    toman(Number(v)),
                    `ناخالص: ${toman(Number(item?.payload?.gross ?? 0))} • خالص`,
                  ]}
                />
              }
            />
            <Bar dataKey="net" fill="var(--color-net)" radius={6} />
          </BarChart>
        </ChartCard>

        <ChartCard
          title="نوع ویزیت‌ها"
          description="سهم هر نوع ویزیت از نوبت‌های ثبت‌شده"
          config={donutConfig}
          loading={loading}
          legend={
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 pt-1 text-xs text-muted-foreground">
              {visitTypeData.map((d) => (
                <span key={d.key} className="flex items-center gap-1.5">
                  <span
                    className="size-2 rounded-[2px]"
                    style={{ backgroundColor: `var(--color-${d.key})` }}
                    aria-hidden
                  />
                  {d.label} ({toFa(d.value)})
                </span>
              ))}
            </div>
          }
        >
          <PieChart>
            <ChartTooltip content={<ChartTooltipContent formatter={(v) => [`${faNum(Number(v))} نوبت`, "تعداد"]} />} />
            <Pie data={visitTypeData} dataKey="value" nameKey="key" innerRadius={52} outerRadius={82} paddingAngle={3} strokeWidth={0}>
              {visitTypeData.map((d) => (
                <Cell key={d.key} fill={`var(--color-${d.key})`} />
              ))}
            </Pie>
          </PieChart>
        </ChartCard>

        <ChartCard title="روند امتیاز" description="میانگین ماهانه امتیاز نظرات" config={ratingConfig} loading={loading}>
          <LineChart data={ratingTrend} margin={{ top: 8, left: 0, right: 8 }}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} reversed interval={1} />
            <YAxis domain={[0, 5]} tickLine={false} axisLine={false} width={24} tickFormatter={(v) => toFa(Number(v))} />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  labelFormatter={(l) => String(l)}
                  formatter={(v) => [`${toFa(Number(v).toFixed(1))} از ۵`, "میانگین امتیاز"]}
                />
              }
            />
            <Line dataKey="avg" type="monotone" stroke="var(--color-avg)" strokeWidth={2.4} dot={{ r: 3 }} connectNulls />
          </LineChart>
        </ChartCard>
      </section>

      {/* today program + upcoming */}
      <section className="grid gap-4 lg:grid-cols-3" aria-label="برنامه امروز و نوبت‌های پیش رو">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-start justify-between gap-2 pb-3">
            <div className="space-y-1">
              <CardTitle className="text-base">برنامه امروز</CardTitle>
              <CardDescription className="text-xs">{faDate(today)}</CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm" className="h-8 text-primary">
              <Link href="/doctor/calendar">
                تقویم کامل
                <ChevronLeft className="size-4" aria-hidden />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-16 animate-pulse rounded-xl bg-muted" />
                ))}
              </div>
            ) : stats.todays.length === 0 ? (
              <EmptyState
                icon={CalendarOff}
                title="امروز نوبتی ندارید"
                description="برای ثبت ساعات کاری به بخش «روزها و ساعات کاری» سر بزنید."
                className="py-10"
              />
            ) : (
              <ul className="space-y-2">
                {stats.todays.map((a) => {
                  const done = a.status === "completed";
                  const TypeIcon = VISIT_TYPE_ICONS[a.visitType];
                  return (
                    <motion.li
                      key={a.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: done ? 0.65 : 1, y: 0 }}
                      transition={{ duration: 0.25 }}
                      className={`flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border p-3 transition-colors ${
                        done ? "border-dashed bg-muted/30" : "hover:border-primary/40"
                      }`}
                    >
                      <span className="inline-flex min-w-14 flex-col items-center rounded-lg bg-primary/10 px-2 py-1 text-primary">
                        <span className="text-sm font-bold tabular-nums">{faTime(a.time)}</span>
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{appointmentPatientName(a, patientMap)}</p>
                        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <TypeIcon className="size-3.5" aria-hidden />
                          {VISIT_TYPE_LABELS[a.visitType]}
                          {a.reason && <span className="truncate">— {a.reason}</span>}
                        </p>
                      </div>
                      <StatusBadge status={a.status} label={APPOINTMENT_STATUS_LABELS[a.status]} />
                      <div className="flex flex-wrap items-center gap-1.5">
                        {a.status === "pending" && (
                          <Button size="sm" variant="outline" className="h-8 text-emerald-600" onClick={() => quickAction(a, "confirmed")}>
                            <CheckCircle2 className="size-3.5" aria-hidden />
                            تأیید
                          </Button>
                        )}
                        {(a.status === "pending" || a.status === "confirmed") && (
                          <>
                            <Button size="sm" variant="outline" className="h-8" onClick={() => quickAction(a, "completed")}>
                              <Stethoscope className="size-3.5" aria-hidden />
                              انجام‌شد
                            </Button>
                            <Button size="sm" variant="ghost" className="h-8 text-rose-600 hover:text-rose-700" onClick={() => setCancelTarget(a)}>
                              <XCircle className="size-3.5" aria-hidden />
                              لغو
                            </Button>
                          </>
                        )}
                        <Button asChild size="sm" variant="ghost" className="h-8 text-muted-foreground">
                          <Link href={`/doctor/patients/${a.patientId}`}>
                            <UserRound className="size-3.5" aria-hidden />
                            پرونده
                          </Link>
                        </Button>
                      </div>
                    </motion.li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-2 pb-3">
            <CardTitle className="text-base">نوبت‌های پیش رو</CardTitle>
            <Button asChild variant="ghost" size="sm" className="h-8 text-primary">
              <Link href="/doctor/appointments">
                همه نوبت‌ها
                <ChevronLeft className="size-4" aria-hidden />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {upcoming.length === 0 ? (
              <EmptyState icon={CalendarOff} title="نوبت پیش‌رویی وجود ندارد" className="py-10" />
            ) : (
              <ul className="space-y-2.5">
                {upcoming.map((a) => {
                  const TypeIcon = VISIT_TYPE_ICONS[a.visitType];
                  return (
                    <li key={a.id} className="flex items-center gap-3 rounded-xl border p-3 transition-colors hover:border-primary/40">
                      <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                        <TypeIcon className="size-5" aria-hidden />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{appointmentPatientName(a, patientMap)}</p>
                        <p className="text-xs text-muted-foreground">
                          {faFromNow(a.date)} • {faTime(a.time)} • {VISIT_TYPE_LABELS[a.visitType]}
                        </p>
                      </div>
                      <StatusBadge status={a.status} label={APPOINTMENT_STATUS_LABELS[a.status]} />
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>

      {/* latest reviews */}
      <section>
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-2 pb-3">
            <div className="space-y-1">
              <CardTitle className="text-base">آخرین نظرات</CardTitle>
              <CardDescription className="text-xs">جدیدترین بازخوردهای بیماران درباره شما</CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm" className="h-8 text-primary">
              <Link href="/doctor/reviews">
                مشاهده همه
                <ChevronLeft className="size-4" aria-hidden />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {latestReviews.length === 0 ? (
              <EmptyState icon={Star} title="هنوز نظری ثبت نشده است" className="py-10" />
            ) : (
              <div className="grid gap-3 md:grid-cols-3">
                {latestReviews.map((r) => {
                  const patient = patientMap.get(r.patientId);
                  return (
                    <motion.div
                      key={r.id}
                      whileHover={{ y: -3 }}
                      className="space-y-2 rounded-xl border p-4 transition-shadow hover:shadow-md"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-semibold">{patient?.name ?? "بیمار"}</p>
                        <span className="shrink-0 text-[11px] text-muted-foreground">{faFromNow(r.createdAtISO)}</span>
                      </div>
                      <RatingStars value={r.rating} />
                      <p className="line-clamp-3 text-sm leading-relaxed text-muted-foreground">{r.comment}</p>
                      {r.reply && <Badge variant="outline" className="text-[11px] text-muted-foreground">پاسخ داده‌اید</Badge>}
                    </motion.div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* cancel confirm dialog (shared for today list) */}
      <AlertDialog open={!!cancelTarget} onOpenChange={(o) => !o && setCancelTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>لغو این نوبت؟</AlertDialogTitle>
            <AlertDialogDescription>
              نوبت {toFa(cancelTarget?.code ?? "")} برای{" "}
              {cancelTarget ? appointmentPatientName(cancelTarget, patientMap) : ""} در ساعت{" "}
              {faTime(cancelTarget?.time ?? "")} لغو می‌شود
              {cancelTarget?.paymentStatus === "paid" && " و مبلغ پرداختی به بیمار بازگشت داده می‌شود"}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>انصراف</AlertDialogCancel>
            <AlertDialogAction className="bg-rose-600 text-white hover:bg-rose-700" onClick={doCancel}>
              بله، لغو کن
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

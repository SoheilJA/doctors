"use client";

/**
 * داشبورد بیمار — نوبت بعدی، اقدامات سریع، آمار، خلاصه سلامت و نمودار هزینه‌ها.
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Activity,
  CalendarCheck,
  ChevronLeft,
  Clock,
  FlaskConical,
  HeartPulse,
  MessagesSquare,
  Search,
  ShieldPlus,
  Stethoscope,
  Timer,
  Wallet,
} from "lucide-react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { ChartCard } from "@/components/shared/chart-card";
import { UserAvatar } from "@/components/shared/user-avatar";
import { useDemoLoading } from "@/components/shared/hydration-gate";
import { useAppStore } from "@/store/app-store";
import { toFa, toman, faNum } from "@/lib/fa";
import { faDate, faFromNow, faMonthLabel, faTime, jalaliMonthKey, subDaysISO, todayISO } from "@/lib/jalali";
import {
  APPOINTMENT_STATUS_LABELS,
  CONSULTATION_STATUS_LABELS,
  LAB_ORDER_STATUS_LABELS,
  SPECIALTY_LABELS,
} from "@/lib/constants";
import type { Appointment } from "@/types";
import { countdownText, useCurrentPatient } from "@/features/patient/helpers";

const chartConfig = { spend: { label: "هزینه", color: "var(--chart-1)" } } satisfies ChartConfig;

export default function PatientDashboardPage() {
  const loading = useDemoLoading();
  const router = useRouter();
  const patient = useCurrentPatient();
  const doctors = useAppStore((s) => s.doctors);
  const appointments = useAppStore((s) => s.appointments);
  const consultations = useAppStore((s) => s.consultations);
  const labOrders = useAppStore((s) => s.labOrders);
  const transactions = useAppStore((s) => s.transactions);
  const centers = useAppStore((s) => s.centers);
  const setAppointmentStatus = useAppStore((s) => s.setAppointmentStatus);
  const [confirmCancel, setConfirmCancel] = useState(false);

  const today = todayISO();

  const myAppointments = useMemo(
    () => appointments.filter((a) => a.patientId === patient?.id),
    [appointments, patient?.id]
  );
  const myConsultations = useMemo(
    () => consultations.filter((c) => c.patientId === patient?.id),
    [consultations, patient?.id]
  );
  const myLabOrders = useMemo(
    () => labOrders.filter((l) => l.patientId === patient?.id),
    [labOrders, patient?.id]
  );

  /** Next upcoming confirmed/pending appointment sorted by date+time. */
  const nextAppointment = useMemo(() => {
    const upcoming = myAppointments
      .filter((a) => (a.status === "confirmed" || a.status === "pending") && a.date >= today)
      .sort((a, b) => (a.date === b.date ? a.time.localeCompare(b.time) : a.date.localeCompare(b.date)));
    return upcoming.find((a) => a.status === "confirmed") ?? upcoming[0] ?? null;
  }, [myAppointments, today]);

  const nextDoctor = nextAppointment ? doctors.find((d) => d.id === nextAppointment.doctorId) : undefined;

  const upcomingCount = myAppointments.filter(
    (a) => (a.status === "confirmed" || a.status === "pending") && a.date >= today
  ).length;
  const activeConsultations = myConsultations.filter((c) => c.status !== "closed");
  const activeLabs = myLabOrders.filter((l) => l.status !== "received");
  const completedCount = myAppointments.filter((a) => a.status === "completed").length;

  const activeConsultList = useMemo(
    () =>
      [...activeConsultations]
        .sort((a, b) => b.createdAtISO.localeCompare(a.createdAtISO))
        .slice(0, 4),
    [activeConsultations]
  );
  const recentLabs = useMemo(
    () =>
      [...myLabOrders]
        .sort((a, b) => b.createdAtISO.localeCompare(a.createdAtISO))
        .slice(0, 4),
    [myLabOrders]
  );

  /** last 6 jalali months spend (direction 'in') */
  const spendData = useMemo(() => {
    if (!patient) return [];
    const rows: { key: string; label: string; spend: number }[] = [];
    for (let back = 5; back >= 0; back--) {
      const anchor = subDaysISO(today, back * 30 + 15);
      const key = jalaliMonthKey(anchor);
      const spend = transactions
        .filter((t) => t.patientId === patient.id && t.direction === "in" && jalaliMonthKey(t.createdAtISO) === key)
        .reduce((s, t) => s + t.amount, 0);
      rows.push({ key, label: faMonthLabel(key), spend });
    }
    return rows;
  }, [transactions, patient, today]);

  const cancelNext = () => {
    if (!nextAppointment) return;
    setAppointmentStatus(nextAppointment.id, "cancelled", patient?.name);
    setConfirmCancel(false);
    toast.success("نوبت لغو شد", {
      description:
        nextAppointment.paymentStatus === "paid"
          ? "مبلغ تا ۷۲ ساعت آینده به حساب شما بازگردانده می‌شود."
          : "در صورت پرداخت، مبلغ بازگردانده می‌شود.",
    });
  };

  if (!patient) {
    return (
      <div className="space-y-4">
        <PageHeader title="داشبورد بیمار" loading />
        <Skeleton className="h-44 rounded-2xl" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  const quickActions = [
    { title: "رزرو نوبت جدید", href: "/patient/find-doctor", icon: Search, desc: "جستجوی پزشک بر اساس تخصص" },
    { title: "مشاوره آنلاین", href: "/patient/consultations", icon: MessagesSquare, desc: "پرسش از پزشک بدون مراجعه" },
    { title: "سفارش آزمایش", href: "/patient/labs", icon: FlaskConical, desc: "سفارش و پیگیری آزمایش" },
    { title: "شارژ کیف پول", href: "/patient/wallet", icon: Wallet, desc: "افزودن موجودی کیف پول" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={`سلام ${patient.name.split(" ")[0]} عزیز 👋`}
        description="به پنل بیمار «دکترها» خوش آمدید؛ وضعیت سلامت و نوبت‌های خود را اینجا مدیریت کنید."
        loading={loading}
      />

      {/* hero: next appointment */}
      {loading ? (
        <Skeleton className="h-48 rounded-2xl" />
      ) : nextAppointment && nextDoctor ? (
        <Card className="overflow-hidden border-primary/25 bg-gradient-to-l from-primary/10 via-primary/5 to-transparent">
          <CardContent className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between md:p-6">
            <div className="flex min-w-0 items-start gap-4">
              <UserAvatar name={nextDoctor.name} hue={nextDoctor.avatarHue} size="xl" />
              <div className="min-w-0 space-y-1.5">
                <p className="text-xs font-medium text-primary">نوبت بعدی شما</p>
                <p className="truncate text-lg font-bold">{nextDoctor.name}</p>
                <p className="text-sm text-muted-foreground">
                  {SPECIALTY_LABELS[nextDoctor.specialtyId]} • {nextDoctor.city}
                </p>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <Badge className="gap-1.5 bg-primary/15 text-primary hover:bg-primary/15">
                    <Clock className="size-3.5" aria-hidden />
                    {faDate(nextAppointment.date)} — ساعت {faTime(nextAppointment.time)}
                  </Badge>
                  <StatusBadge status={nextAppointment.status} label={APPOINTMENT_STATUS_LABELS[nextAppointment.status]} />
                  <Badge variant="outline" className="gap-1.5 border-amber-500/40 text-amber-700 dark:text-amber-400">
                    <Timer className="size-3.5" aria-hidden />
                    {countdownText(`${nextAppointment.date}T${nextAppointment.time}:00`)}
                  </Badge>
                </div>
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2 md:flex-col md:items-stretch">
              <Button variant="outline" size="sm" asChild>
                <Link href="/patient/appointments">
                  مشاهده نوبت‌ها
                  <ChevronLeft className="size-4" aria-hidden />
                </Link>
              </Button>
              <Button
                variant="destructive"
                size="sm"
                className="bg-rose-600/90 hover:bg-rose-600"
                onClick={() => setConfirmCancel(true)}
              >
                لغو نوبت
              </Button>
              <Button size="sm" variant="ghost" asChild>
                <Link href="/patient/find-doctor">
                  <Search className="size-4" aria-hidden />
                  یافتن پزشک جدید
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-dashed">
          <CardContent className="p-5">
            <EmptyState
              icon={CalendarCheck}
              title="نوبت فعالی ندارید"
              description="همین حالا یک پزشک مناسب پیدا کنید و نوبت خود را رزرو کنید."
              action={
                <Button asChild size="sm">
                  <Link href="/patient/find-doctor">
                    <Search className="size-4" aria-hidden />
                    پیدا کردن پزشک
                  </Link>
                </Button>
              }
            />
          </CardContent>
        </Card>
      )}

      {/* quick actions */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)
          : quickActions.map(({ title, href, icon: Icon, desc }) => (
              <Link
                key={href}
                href={href}
                className="group flex items-center gap-3 rounded-2xl border bg-card p-4 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
              >
                <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <Icon className="size-5" aria-hidden />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-bold">{title}</span>
                  <span className="block truncate text-[11px] text-muted-foreground">{desc}</span>
                </span>
              </Link>
            ))}
      </div>

      {/* stat cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <StatCard
          title="نوبت‌های پیش رو"
          value={faNum(upcomingCount)}
          icon={CalendarCheck}
          tone="primary"
          hint="تأییدشده و در انتظار"
          loading={loading}
          onClick={() => router.push("/patient/appointments")}
        />
        <StatCard
          title="مشاوره‌های فعال"
          value={faNum(activeConsultations.length)}
          icon={MessagesSquare}
          tone="sky"
          hint="در انتظار پاسخ و پاسخ‌داده"
          loading={loading}
          onClick={() => router.push("/patient/consultations")}
        />
        <StatCard
          title="آزمایش‌های در جریان"
          value={faNum(activeLabs.length)}
          icon={FlaskConical}
          tone="violet"
          hint="از ثبت تا جواب"
          loading={loading}
          onClick={() => router.push("/patient/labs")}
        />
        <StatCard
          title="موجودی کیف پول"
          value={toman(patient.walletBalance)}
          icon={Wallet}
          tone="emerald"
          hint="شارژ با یک کلیک"
          loading={loading}
          onClick={() => router.push("/patient/wallet")}
        />
        <StatCard
          title="ویزیت‌های انجام‌شده"
          value={faNum(completedCount)}
          icon={Stethoscope}
          tone="amber"
          hint="در کل سابقه شما"
          loading={loading}
          onClick={() => router.push("/patient/records")}
        />
      </div>

      {/* two-column zone */}
      <div className="grid gap-4 xl:grid-cols-3">
        {/* chart */}
        <ChartCard
          title="هزینه‌های ۶ ماه اخیر"
          description="مجموع پرداخت‌های شما به پلتفرم در هر ماه"
          config={chartConfig}
          loading={loading}
          className="xl:col-span-2"
        >
          <BarChart data={spendData} margin={{ top: 8, left: 0, right: 0 }}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} reversed />
            <YAxis tickLine={false} axisLine={false} tickFormatter={(v) => `${faNum(Math.round(Number(v) / 1000))} هزار`} width={52} />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  labelFormatter={(l) => String(l)}
                  formatter={(v) => [toman(Number(v)), "هزینه"]}
                />
              }
            />
            <Bar dataKey="spend" fill="var(--color-spend)" radius={6} />
          </BarChart>
        </ChartCard>

        {/* health summary */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <HeartPulse className="size-4.5 text-rose-500" aria-hidden />
              خلاصه سلامت
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <>
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-9 w-full" />
                <Skeleton className="h-9 w-full" />
              </>
            ) : (
              <>
                <div className="flex items-center justify-between rounded-xl border px-3 py-2">
                  <span className="text-xs text-muted-foreground">گروه خونی</span>
                  <Badge variant="secondary" className="font-bold tabular-nums">
                    {toFa(patient.bloodType)}
                  </Badge>
                </div>
                <div className="rounded-xl border px-3 py-2">
                  <p className="mb-1.5 text-xs text-muted-foreground">حساسیت‌های دارویی</p>
                  <div className="flex flex-wrap gap-1.5">
                    {patient.allergies.length ? (
                      patient.allergies.map((a) => (
                        <Badge key={a} variant="outline" className="border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-400">
                          {a}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-xs text-muted-foreground">موردی ثبت نشده است</span>
                    )}
                  </div>
                </div>
                <div className="rounded-xl border px-3 py-2">
                  <p className="mb-1.5 text-xs text-muted-foreground">بیماری‌های زمینه‌ای</p>
                  <div className="flex flex-wrap gap-1.5">
                    {patient.chronicConditions.length ? (
                      patient.chronicConditions.map((c) => (
                        <Badge key={c} variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400">
                          {c}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-xs text-muted-foreground">موردی ثبت نشده است</span>
                    )}
                  </div>
                </div>
                <Button variant="outline" size="sm" className="w-full" asChild>
                  <Link href="/patient/profile">
                    <ShieldPlus className="size-4" aria-hidden />
                    ویرایش اطلاعات سلامت
                  </Link>
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* mini lists */}
      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <MessagesSquare className="size-4.5 text-sky-500" aria-hidden />
              مشاوره‌های فعال
            </CardTitle>
            <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs" asChild>
              <Link href="/patient/consultations">
                همه
                <ChevronLeft className="size-3.5" aria-hidden />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)
            ) : activeConsultList.length ? (
              activeConsultList.map((c) => {
                const doc = doctors.find((d) => d.id === c.doctorId);
                return (
                  <Link
                    key={c.id}
                    href="/patient/consultations"
                    className="flex items-center gap-3 rounded-xl border p-2.5 transition-colors hover:bg-muted/50"
                  >
                    <UserAvatar name={doc?.name ?? "?"} hue={doc?.avatarHue ?? 200} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{c.subject}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {doc?.name} • {faFromNow(c.createdAtISO)}
                      </p>
                    </div>
                    <StatusBadge status={c.status} label={CONSULTATION_STATUS_LABELS[c.status]} />
                  </Link>
                );
              })
            ) : (
              <p className="py-6 text-center text-sm text-muted-foreground">
                مشاوره فعالی ندارید؛ از بخش «مشاوره‌های من» سؤال خود را بپرسید.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <FlaskConical className="size-4.5 text-violet-500" aria-hidden />
              آخرین سفارش‌های آزمایش
            </CardTitle>
            <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs" asChild>
              <Link href="/patient/labs">
                همه
                <ChevronLeft className="size-3.5" aria-hidden />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)
            ) : recentLabs.length ? (
              recentLabs.map((l) => {
                const lab = centers.find((c) => c.id === l.labId);
                return (
                  <Link
                    key={l.id}
                    href="/patient/labs"
                    className="flex items-center gap-3 rounded-xl border p-2.5 transition-colors hover:bg-muted/50"
                  >
                    <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400">
                      <Activity className="size-4.5" aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{lab?.name ?? "آزمایشگاه"}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {toFa(l.tests.length)} آزمایش • {toFa(l.code)}
                      </p>
                    </div>
                    <StatusBadge status={l.status} label={LAB_ORDER_STATUS_LABELS[l.status]} />
                  </Link>
                );
              })
            ) : (
              <p className="py-6 text-center text-sm text-muted-foreground">
                سفارش آزمایشی ثبت نکرده‌اید؛ از بخش «آزمایش‌ها» سفارش جدید ثبت کنید.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* cancel confirm */}
      <AlertDialog open={confirmCancel} onOpenChange={setConfirmCancel}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>لغو نوبت؟</AlertDialogTitle>
            <AlertDialogDescription>
              نوبت شما با {nextDoctor?.name ?? "پزشک"} برای {nextAppointment ? faDate(nextAppointment.date) : ""} ساعت{" "}
              {nextAppointment ? faTime(nextAppointment.time) : ""} لغو خواهد شد. این عمل قابل بازگشت نیست.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>انصراف</AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-600 hover:bg-rose-700"
              onClick={cancelNext}
            >
              بله، لغو کن
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

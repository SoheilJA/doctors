"use client";

/**
 * /admin — داشبورد مدیریت: KPI ها، نمودارهای درآمد/نوبت‌ها/رشد کاربران،
 * پزشکان برتر، قیف تبدیل و اقدامات لازم.
 */

import { useMemo } from "react";
import Link from "next/link";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";
import type { ChartConfig } from "@/components/ui/chart";
import { ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import {
  Banknote,
  CalendarDays,
  ChevronLeft,
  Landmark,
  LifeBuoy,
  Percent,
  Stethoscope,
  UserCheck,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ChartCard } from "@/components/shared/chart-card";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { UserAvatar } from "@/components/shared/user-avatar";
import { useDemoLoading } from "@/components/shared/hydration-gate";
import { APPOINTMENT_STATUS_LABELS, type AppointmentStatus } from "@/lib/constants";
import { faMonthLabel, jalaliMonthKey } from "@/lib/jalali";
import { faNum, faPercent, toFa, toman, tomanCompact } from "@/lib/fa";
import {
  computeCommission,
  computeGmv,
  faRating,
  specialtyTitle,
  useAdminPanel,
  useMonthlyFinance,
  moneyTick,
} from "@/features/admin/shared";

const STATUS_CHART_COLORS: Record<AppointmentStatus, string> = {
  pending: "var(--chart-1)",
  confirmed: "var(--chart-2)",
  completed: "var(--chart-3)",
  cancelled: "var(--chart-4)",
  "no-show": "var(--chart-5)",
};

export function AdminDashboard() {
  const loading = useDemoLoading();
  const panel = useAdminPanel();
  const monthly = useMonthlyFinance(panel);

  /* ------------------------------- KPIs ------------------------------- */

  const verifiedActiveDoctors = useMemo(
    () => panel.doctors.filter((d) => d.verification === "verified" && d.accountStatus === "active").length,
    [panel.doctors]
  );
  const gmv = useMemo(() => computeGmv(panel.transactions), [panel.transactions]);
  const commission = useMemo(
    () => computeCommission(panel.appointments, panel.consultations, panel.doctorMap),
    [panel.appointments, panel.consultations, panel.doctorMap]
  );
  const pendingSettlements = useMemo(() => panel.settlements.filter((s) => s.status === "pending"), [panel.settlements]);
  const openTickets = useMemo(
    () => panel.tickets.filter((t) => t.status === "open" || t.status === "in-progress"),
    [panel.tickets]
  );
  const pendingDoctors = useMemo(
    () => panel.doctors.filter((d) => d.verification === "pending"),
    [panel.doctors]
  );
  const paidAppointments = useMemo(
    () => panel.appointments.filter((a) => a.paymentStatus === "paid").length,
    [panel.appointments]
  );

  /* ------------------------------ datasets ------------------------------ */

  const bySpecialty = useMemo(() => {
    const counts = new Map<string, number>();
    for (const a of panel.appointments) {
      const sp = panel.doctorMap.get(a.doctorId)?.specialtyId;
      if (!sp) continue;
      counts.set(sp, (counts.get(sp) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([id, count]) => ({ id, label: specialtyTitle(id, panel.specialties), count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [panel.appointments, panel.doctorMap, panel.specialties]);

  const byStatus = useMemo(() => {
    const order: AppointmentStatus[] = ["pending", "confirmed", "completed", "cancelled", "no-show"];
    return order.map((status) => ({
      key: status,
      label: APPOINTMENT_STATUS_LABELS[status],
      value: panel.appointments.filter((a) => a.status === status).length,
    }));
  }, [panel.appointments]);

  const byCity = useMemo(() => {
    const counts = new Map<string, number>();
    for (const a of panel.appointments) {
      const city = panel.doctorMap.get(a.doctorId)?.city;
      if (!city) continue;
      counts.set(city, (counts.get(city) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([city, count]) => ({ city, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [panel.appointments, panel.doctorMap]);

  /** Cumulative registered patients per month (real) + demo-static doctors ramp. */
  const growth = useMemo(() => {
    return monthly.map((m, i) => ({
      label: m.label,
      users:
        panel.patients.filter((p) => jalaliMonthKey(p.createdAtISO) <= m.key).length +
        Math.round((panel.doctors.length * (i + 1)) / monthly.length),
    }));
  }, [monthly, panel.patients, panel.doctors.length]);

  const topDoctors = useMemo(() => {
    return panel.doctors
      .map((d) => {
        const mine = panel.appointments.filter((a) => a.doctorId === d.id);
        const completed = mine.filter((a) => a.status === "completed");
        const revenue = mine.filter((a) => a.paymentStatus === "paid").reduce((s, a) => s + a.fee, 0);
        return { doctor: d, visits: completed.length, revenue };
      })
      .filter((row) => row.visits > 0)
      .sort((a, b) => b.visits - a.visits || b.revenue - a.revenue)
      .slice(0, 8);
  }, [panel.doctors, panel.appointments]);

  /** قیف تبدیل — اعداد جستجو/بازدید نمایشی‌اند و از تعداد نوبت‌ها مشتق می‌شوند. */
  const funnel = useMemo(() => {
    const bookings = panel.appointments.length;
    const steps = [
      { key: "search", label: "جستجوی پزشک", value: bookings * 8 },
      { key: "view", label: "بازدید پروفایل", value: bookings * 3 },
      { key: "book", label: "رزرو نوبت", value: bookings },
      { key: "pay", label: "پرداخت", value: paidAppointments },
    ];
    const top = steps[0].value || 1;
    return steps.map((s) => ({ ...s, pct: Math.min(100, Math.round((s.value / top) * 100)) }));
  }, [panel.appointments.length, paidAppointments]);

  /* ------------------------------- charts ------------------------------- */

  const financeConfig = {
    gmv: { label: "درآمد", color: "var(--chart-1)" },
    commission: { label: "کمیسیون", color: "var(--chart-2)" },
  } satisfies ChartConfig;

  const specialtyConfig = { count: { label: "نوبت", color: "var(--chart-1)" } } satisfies ChartConfig;
  const growthConfig = { users: { label: "کاربران", color: "var(--chart-4)" } } satisfies ChartConfig;
  const cityConfig = { count: { label: "نوبت", color: "var(--chart-3)" } } satisfies ChartConfig;
  const statusConfig = Object.fromEntries(
    byStatus.map((s) => [s.key, { label: s.label, color: STATUS_CHART_COLORS[s.key] }])
  ) satisfies ChartConfig;

  return (
    <div className="space-y-6">
      <PageHeader
        title="داشبورد مدیریت"
        description="نمای کلی پلتفرم دکترها — کاربران، پزشکان، نوبت‌ها و امور مالی"
        loading={loading}
      />

      {/* KPI cards */}
      <section className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4" aria-label="شاخص‌های کلیدی">
        <StatCard
          title="کاربران"
          value={faNum(panel.patients.length)}
          hint={`${faNum(panel.patients.filter((p) => !p.blocked).length)} فعال — ${faNum(panel.patients.filter((p) => p.blocked).length)} مسدود`}
          icon={Users}
          tone="sky"
          loading={loading}
        />
        <StatCard
          title="پزشکان"
          value={faNum(verifiedActiveDoctors)}
          hint={`از ${faNum(panel.doctors.length)} پزشک ثبت‌شده`}
          icon={Stethoscope}
          tone="primary"
          loading={loading}
        />
        <StatCard
          title="نوبت‌ها"
          value={faNum(panel.appointments.length)}
          hint={`${faNum(panel.consultations.length)} مشاوره آنلاین`}
          icon={CalendarDays}
          tone="violet"
          loading={loading}
        />
        <StatCard
          title="گردش مالی"
          value={tomanCompact(gmv)}
          hint="مجموع تراکنش‌های موفق خدمات"
          icon={Banknote}
          tone="emerald"
          loading={loading}
        />
        <StatCard
          title="کمیسیون پلتفرم"
          value={tomanCompact(commission)}
          hint="از نوبت‌ها و مشاوره‌های پرداخت‌شده"
          icon={Percent}
          tone="amber"
          loading={loading}
        />
        <StatCard
          title="تسویه‌های در انتظار"
          value={faNum(pendingSettlements.length)}
          hint={pendingSettlements.length ? tomanCompact(pendingSettlements.reduce((s, x) => s + x.amount, 0)) : "درخواستی در انتظار نیست"}
          icon={Landmark}
          tone="rose"
          loading={loading}
        />
        <StatCard
          title="تیکت‌های باز"
          value={faNum(openTickets.length)}
          hint="باز و در حال بررسی"
          icon={LifeBuoy}
          tone="sky"
          loading={loading}
        />
      </section>

      {/* charts row 1 */}
      <section className="grid gap-4 lg:grid-cols-3" aria-label="نمودار درآمد و وضعیت نوبت‌ها">
        <ChartCard
          title="درآمد و کمیسیون ۶ ماه اخیر"
          description="بر اساس تراکنش‌های موفق (تومان)"
          config={financeConfig}
          loading={loading}
          className="lg:col-span-2"
        >
          <ComposedChart data={monthly} margin={{ top: 8, left: 0, right: 8 }}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} reversed />
            <YAxis tickLine={false} axisLine={false} width={52} tickFormatter={(v) => moneyTick(Number(v))} />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  labelFormatter={(l) => String(l)}
                  formatter={(v, name) => [toman(Number(v)), name === "gmv" ? "درآمد" : "کمیسیون"]}
                />
              }
            />
            <Bar dataKey="gmv" fill="var(--color-gmv)" radius={6} maxBarSize={38} />
            <Line dataKey="commission" type="monotone" stroke="var(--color-commission)" strokeWidth={2.4} dot={{ r: 3 }} />
          </ComposedChart>
        </ChartCard>

        <ChartCard
          title="وضعیت نوبت‌ها"
          description="سهم هر وضعیت از کل نوبت‌ها"
          config={statusConfig}
          loading={loading}
          legend={
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 pt-1 text-xs text-muted-foreground">
              {byStatus.map((d) => (
                <span key={d.key} className="flex items-center gap-1.5">
                  <span className="size-2 rounded-[2px]" style={{ backgroundColor: STATUS_CHART_COLORS[d.key] }} aria-hidden />
                  {d.label} ({toFa(d.value)})
                </span>
              ))}
            </div>
          }
        >
          <PieChart>
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(v, _n, item) => [`${faNum(Number(v))} نوبت`, String(item?.payload?.label ?? "")]}
                />
              }
            />
            <Pie data={byStatus} dataKey="value" nameKey="key" innerRadius={50} outerRadius={80} paddingAngle={3} strokeWidth={0}>
              {byStatus.map((d) => (
                <Cell key={d.key} fill={STATUS_CHART_COLORS[d.key]} />
              ))}
            </Pie>
          </PieChart>
        </ChartCard>
      </section>

      {/* charts row 2 */}
      <section className="grid gap-4 lg:grid-cols-3" aria-label="تفکیک نوبت‌ها و رشد کاربران">
        <ChartCard title="نوبت‌ها به تفکیک تخصص" description="۸ تخصص پرمخاطب" config={specialtyConfig} loading={loading}>
          <BarChart data={bySpecialty} margin={{ top: 8, left: 0, right: 8 }}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={10} reversed interval={0} tick={{ fontSize: 10 }} />
            <YAxis tickLine={false} axisLine={false} width={28} allowDecimals={false} tickFormatter={(v) => faNum(Number(v))} />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  labelFormatter={(l) => String(l)}
                  formatter={(v) => [`${faNum(Number(v))} نوبت`, "تعداد"]}
                />
              }
            />
            <Bar dataKey="count" fill="var(--color-count)" radius={6} />
          </BarChart>
        </ChartCard>

        <ChartCard
          title="رشد کاربران"
          description="کاربران ثبت‌نام‌شده تا پایان هر ماه — داده نمایشی"
          config={growthConfig}
          loading={loading}
        >
          <AreaChart data={growth} margin={{ top: 8, left: 0, right: 8 }}>
            <defs>
              <linearGradient id="usersFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-users)" stopOpacity={0.35} />
                <stop offset="95%" stopColor="var(--color-users)" stopOpacity={0.03} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} reversed tick={{ fontSize: 10 }} />
            <YAxis tickLine={false} axisLine={false} width={36} allowDecimals={false} tickFormatter={(v) => faNum(Number(v))} />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  labelFormatter={(l) => String(l)}
                  formatter={(v) => [`${faNum(Number(v))} کاربر`, "کاربران"]}
                />
              }
            />
            <Area dataKey="users" type="monotone" stroke="var(--color-users)" strokeWidth={2.2} fill="url(#usersFill)" />
          </AreaChart>
        </ChartCard>

        <ChartCard title="شهرهای برتر" description="۶ شهر با بیشترین نوبت‌ها" config={cityConfig} loading={loading}>
          <BarChart data={byCity} layout="vertical" margin={{ top: 8, left: 0, right: 16 }}>
            <CartesianGrid horizontal={false} strokeDasharray="3 3" />
            <XAxis type="number" hide />
            <YAxis dataKey="city" type="category" tickLine={false} axisLine={false} width={56} tick={{ fontSize: 11 }} />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  labelFormatter={(l) => String(l)}
                  formatter={(v) => [`${faNum(Number(v))} نوبت`, "تعداد"]}
                />
              }
            />
            <Bar dataKey="count" fill="var(--color-count)" radius={6} maxBarSize={18} />
          </BarChart>
        </ChartCard>
      </section>

      {/* top doctors + funnel + actions */}
      <section className="grid gap-4 lg:grid-cols-3" aria-label="پزشکان برتر، قیف تبدیل و اقدامات">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Stethoscope className="size-4 text-primary" aria-hidden />
              پزشکان برتر
            </CardTitle>
            <CardDescription className="text-xs">بر اساس تعداد ویزیت‌های انجام‌شده</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-11 w-full" />
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-start">پزشک</TableHead>
                      <TableHead className="text-start">تخصص</TableHead>
                      <TableHead className="text-start">ویزیت انجام‌شده</TableHead>
                      <TableHead className="text-start">درآمد</TableHead>
                      <TableHead className="text-start">امتیاز</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topDoctors.map(({ doctor, visits, revenue }) => (
                      <TableRow key={doctor.id}>
                        <TableCell>
                          <Link
                            href={`/admin/doctors/${doctor.id}`}
                            className="flex items-center gap-2 hover:text-primary"
                          >
                            <UserAvatar name={doctor.name} hue={doctor.avatarHue} size="sm" />
                            <span className="text-sm font-medium">{doctor.name}</span>
                          </Link>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {specialtyTitle(doctor.specialtyId, panel.specialties)}
                        </TableCell>
                        <TableCell className="text-sm tabular-nums">{faNum(visits)}</TableCell>
                        <TableCell className="text-sm tabular-nums">{tomanCompact(revenue)}</TableCell>
                        <TableCell>
                          <span className="flex items-center gap-1 text-sm tabular-nums">
                            {faRating(doctor.rating)}
                            <span className="text-amber-500" aria-hidden>
                              ★
                            </span>
                            <span className="text-xs text-muted-foreground">({toFa(doctor.reviewCount)})</span>
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">قیف تبدیل</CardTitle>
              <CardDescription className="text-xs">از جستجو تا پرداخت — داده نمایشی</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {funnel.map((step) => (
                <div key={step.key} className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span className="font-medium">{step.label}</span>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      {faNum(step.value)} ({faPercent(step.pct)})
                    </span>
                  </div>
                  <Progress value={step.pct} aria-label={`نرخ ${step.label}: ${faPercent(step.pct)}`} />
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <UserCheck className="size-4 text-amber-500" aria-hidden />
                اقدامات لازم
              </CardTitle>
              <CardDescription className="text-xs">موارد نیازمند بررسی مدیر</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {loading ? (
                <>
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </>
              ) : (
                <>
                  <ActionRow
                    href="/admin/doctors?status=pending"
                    label="درخواست‌های احراز هویت پزشکان"
                    count={pendingDoctors.length}
                  />
                  <ActionRow
                    href="/admin/finance"
                    label="درخواست‌های تسویه در انتظار"
                    count={pendingSettlements.length}
                  />
                  <ActionRow href="/admin/support" label="تیکت‌های باز پشتیبانی" count={openTickets.length} />
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}

function ActionRow({ href, label, count }: { href: string; label: string; count: number }) {
  const tone = count > 0 ? "default" : "outline";
  return (
    <Button asChild variant="ghost" className="h-auto w-full justify-between gap-2 rounded-xl px-3 py-2.5 text-start">
      <Link href={href} className="flex w-full items-center justify-between gap-2">
        <span className="text-sm">{label}</span>
        <span className="flex items-center gap-1">
          <Badge variant={tone} className={count > 0 ? "tabular-nums" : "text-muted-foreground"}>
            {faNum(count)}
          </Badge>
          <ChevronLeft className="size-4 text-muted-foreground" aria-hidden />
        </span>
      </Link>
    </Button>
  );
}

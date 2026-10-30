"use client";

/**
 * /doctor/visits — completed visits overview: stats, visits-over-time chart
 * with period tabs (هفته/ماه/سال), table of completed appointments and a
 * full-detail drawer per visit.
 */

import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ClipboardCheck, Receipt, Timer, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { ChartCard } from "@/components/shared/chart-card";
import { DataTable } from "@/components/shared/data-table";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { useDemoLoading } from "@/components/shared/hydration-gate";
import { PAYMENT_STATUS_LABELS, VISIT_TYPE_LABELS } from "@/lib/constants";
import { faDate, faDateShort, faDateTimeShort, faDuration, faTime, jalaliMonthKey, subDaysISO, subMonthsISO, todayISO, eachDayISO, faMonthLabel } from "@/lib/jalali";
import { faNum, toFa, toman } from "@/lib/fa";
import { appointmentPatientName, netFee, useDoctorPanel, VISIT_TYPE_ICONS } from "@/features/doctor/shared";
import type { Appointment } from "@/types";

type Period = "week" | "month" | "year";

export function VisitsContent() {
  const loading = useDemoLoading();
  const { appointments, patientMap } = useDoctorPanel();
  const [period, setPeriod] = useState<Period>("month");
  const [selected, setSelected] = useState<Appointment | null>(null);

  const completed = useMemo(
    () => appointments.filter((a) => a.status === "completed").sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time)),
    [appointments]
  );

  const stats = useMemo(() => {
    const total = completed.length;
    const revenue = completed.reduce((s, a) => s + a.fee, 0);
    const avgDuration = total ? completed.reduce((s, a) => s + a.duration, 0) / total : 0;
    return { total, revenue, avgDuration };
  }, [completed]);

  const chartData = useMemo(() => {
    const today = todayISO();
    if (period === "week") {
      const days = eachDayISO(subDaysISO(today, 6), today);
      return days.map((d) => ({ label: faDateShort(d), count: completed.filter((a) => a.date === d).length }));
    }
    if (period === "month") {
      const days = eachDayISO(subDaysISO(today, 29), today);
      return days.map((d) => ({ label: faDateShort(d), count: completed.filter((a) => a.date === d).length }));
    }
    const keys = [11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0].map((i) => jalaliMonthKey(subMonthsISO(today, i)));
    return keys.map((k) => ({ label: faMonthLabel(k), count: completed.filter((a) => jalaliMonthKey(a.date) === k).length }));
  }, [period, completed]);

  const chartConfig = { count: { label: "ویزیت", color: "var(--chart-1)" } } as const;

  const columns: ColumnDef<Appointment>[] = [
    {
      id: "patient",
      accessorFn: (a) => appointmentPatientName(a, patientMap),
      header: "بیمار",
      cell: ({ row }) => <span className="font-medium">{appointmentPatientName(row.original, patientMap)}</span>,
    },
    {
      accessorKey: "date",
      header: "تاریخ",
      cell: ({ row }) => <span className="text-xs text-muted-foreground">{faDateShort(row.original.date)}</span>,
    },
    {
      accessorKey: "visitType",
      header: "نوع",
      cell: ({ row }) => {
        const Icon = VISIT_TYPE_ICONS[row.original.visitType];
        return (
          <span className="flex items-center gap-1.5 text-xs">
            <Icon className="size-3.5 text-primary" aria-hidden />
            {VISIT_TYPE_LABELS[row.original.visitType]}
          </span>
        );
      },
    },
    {
      accessorKey: "duration",
      header: "مدت",
      cell: ({ row }) => <span className="text-xs">{faDuration(row.original.duration)}</span>,
    },
    {
      accessorKey: "fee",
      header: "هزینه",
      cell: ({ row }) => <span className="tabular-nums text-xs">{toman(row.original.fee)}</span>,
    },
    {
      id: "prescription",
      accessorFn: (a) => a.prescription ?? "",
      header: "نسخه",
      cell: ({ row }) => (
        <span className="block max-w-48 truncate text-xs text-muted-foreground">
          {row.original.prescription ? row.original.prescription.split("\n")[0] : "—"}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="ویزیت‌های انجام‌شده" description="سابقه کامل ویزیت‌های شما و اطلاعات مالی هر ویزیت." loading={loading} />

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3" aria-label="آمار ویزیت‌ها">
        <StatCard title="کل ویزیت‌ها" value={faNum(stats.total)} hint="ویزیت‌های انجام‌شده" icon={ClipboardCheck} loading={loading} />
        <StatCard title="درآمد کل" value={toman(stats.revenue)} hint="مجموع نرخ ویزیت‌ها" icon={Receipt} tone="emerald" loading={loading} />
        <StatCard title="میانگین مدت ویزیت" value={faDuration(Math.round(stats.avgDuration))} hint="بر اساس داده‌های ثبت‌شده" icon={Timer} tone="sky" loading={loading} />
      </section>

      <ChartCard
        title="روند ویزیت‌ها"
        description={period === "week" ? "۷ روز گذشته" : period === "month" ? "۳۰ روز گذشته" : "۱۲ ماه گذشته"}
        config={chartConfig}
        loading={loading}
        action={
          <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)}>
            <TabsList className="h-8">
              <TabsTrigger value="week" className="text-xs">هفته</TabsTrigger>
              <TabsTrigger value="month" className="text-xs">ماه</TabsTrigger>
              <TabsTrigger value="year" className="text-xs">سال</TabsTrigger>
            </TabsList>
          </Tabs>
        }
      >
        <BarChart data={chartData} margin={{ top: 8, left: 0, right: 8 }}>
          <CartesianGrid vertical={false} strokeDasharray="3 3" />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            reversed
            interval={period === "month" ? 4 : period === "year" ? 1 : 0}
            tick={{ fontSize: 10 }}
          />
          <YAxis tickLine={false} axisLine={false} width={28} allowDecimals={false} tickFormatter={(v) => faNum(Number(v))} />
          <ChartTooltip content={<ChartTooltipContent labelFormatter={(l) => String(l)} formatter={(v) => [`${faNum(Number(v))} ویزیت`, "انجام‌شده"]} />} />
          <Bar dataKey="count" fill="var(--color-count)" radius={6} />
        </BarChart>
      </ChartCard>

      <DataTable
        columns={columns}
        data={completed}
        loading={loading}
        searchPlaceholder="جستجو در بیمار، نسخه…"
        emptyTitle="ویزیت انجام‌شده‌ای یافت نشد"
        onRowClick={(a) => setSelected(a)}
        exportCsvName="ویزیت-ها"
        csvRows={(a) => ({
          "بیمار": appointmentPatientName(a, patientMap),
          "تاریخ": a.date,
          "ساعت": faTime(a.time),
          "نوع": VISIT_TYPE_LABELS[a.visitType],
          "مدت (دقیقه)": a.duration,
          "هزینه (تومان)": a.fee,
          "دلیل": a.reason,
          "نسخه": a.prescription ?? "",
        })}
        mobileCard={(a) => (
          <div className="space-y-1.5 rounded-xl border p-3 transition-colors hover:border-primary/40">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold">{appointmentPatientName(a, patientMap)}</p>
              <Badge variant="outline" className="text-[10px]">{VISIT_TYPE_LABELS[a.visitType]}</Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              {faDateShort(a.date)} • {faTime(a.time)} • {faDuration(a.duration)}
            </p>
            <p className="text-xs tabular-nums">{toman(a.fee)}</p>
          </div>
        )}
      />

      {/* visit detail drawer */}
      <Drawer open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DrawerContent className="mx-auto max-h-[85vh] max-w-2xl overflow-y-auto">
          {selected && (
            <>
              <DrawerHeader className="border-b bg-muted/40 text-start">
                <DrawerTitle className="flex flex-wrap items-center gap-2 text-base">
                  ویزیت {appointmentPatientName(selected, patientMap)}
                  <Badge variant="outline" className="font-mono text-xs">{toFa(selected.code)}</Badge>
                </DrawerTitle>
                <DrawerDescription className="text-xs">
                  {faDate(selected.date)} — ساعت {faTime(selected.time)} • {VISIT_TYPE_LABELS[selected.visitType]}
                </DrawerDescription>
                <DrawerClose asChild>
                  <Button variant="ghost" size="icon" className="absolute end-4 top-4 size-8" aria-label="بستن">
                    <X className="size-4" aria-hidden />
                  </Button>
                </DrawerClose>
              </DrawerHeader>
              <CardContent className="space-y-4 p-4 text-start">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl bg-muted/50 p-3 text-sm">
                    <p className="mb-1 text-xs text-muted-foreground">دلیل مراجعه</p>
                    <p className="leading-relaxed">{selected.reason || "—"}</p>
                  </div>
                  <div className="rounded-xl bg-muted/50 p-3 text-sm">
                    <p className="mb-1 text-xs text-muted-foreground">یادداشت پزشک</p>
                    <p className="whitespace-pre-wrap leading-relaxed">{selected.notes || "یادداشتی ثبت نشده است."}</p>
                  </div>
                </div>
                <div className="rounded-xl border p-3">
                  <p className="mb-1.5 text-xs font-medium text-muted-foreground">نسخه و توصیه‌ها</p>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed">
                    {selected.prescription || "برای این ویزیت نسخه‌ای ثبت نشده است."}
                  </p>
                </div>
                <div className="grid gap-3 rounded-xl bg-muted/50 p-3 text-sm sm:grid-cols-3">
                  <div>
                    <p className="text-xs text-muted-foreground">نرخ ویزیت</p>
                    <p className="mt-0.5 font-semibold tabular-nums">{toman(selected.fee)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">کمیسیون پلتفرم</p>
                    <p className="mt-0.5 font-semibold tabular-nums">{toman(selected.commission)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">سهم خالص شما</p>
                    <p className="mt-0.5 font-semibold tabular-nums text-emerald-600">{toman(netFee(selected))}</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <StatusBadge status={selected.paymentStatus} label={PAYMENT_STATUS_LABELS[selected.paymentStatus]} />
                  <span>ثبت‌شده در {faDateTimeShort(selected.createdAtISO)}</span>
                </div>
              </CardContent>
            </>
          )}
        </DrawerContent>
      </Drawer>
    </div>
  );
}

"use client";

/**
 * /doctor/finance — doctor's money view: available balance, pending
 * settlements, monthly gross/net income chart, commission breakdown,
 * transactions table (CSV export) and a settlement request form (zod).
 */

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { z } from "zod";
import type { ColumnDef } from "@tanstack/react-table";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { Banknote, Landmark, PiggyBank, TrendingUp, Wallet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { ChartCard } from "@/components/shared/chart-card";
import { DataTable } from "@/components/shared/data-table";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { useDemoLoading } from "@/components/shared/hydration-gate";
import { useAppStore } from "@/store/app-store";
import {
  SETTLEMENT_STATUS_LABELS,
  TRANSACTION_KIND_LABELS,
} from "@/lib/constants";
import { faDateTime, faMonthLabel, faFromNow, jalaliMonthKey, subMonthsISO, todayISO } from "@/lib/jalali";
import { faPercent, faNum, parseFaNumber, toEnDigits, toFa, toman, tomanCompact } from "@/lib/fa";
import { netFee, useDoctorPanel } from "@/features/doctor/shared";
import type { Transaction } from "@/types";

const BANK_OPTIONS = ["بانک ملت", "بانک سامان", "بانک پارسیان", "بانک صادرات", "بانک ملی"] as const;

export function FinanceContent() {
  const loading = useDemoLoading();
  const { doctor, appointments, consultations, transactions, settlements } = useDoctorPanel();
  const requestSettlement = useAppStore((s) => s.requestSettlement);
  const [submittedCode, setSubmittedCode] = useState<string | null>(null);

  /* ----------------------------- computations ----------------------------- */

  const finance = useMemo(() => {
    const completedPaid = appointments.filter((a) => a.status === "completed" && a.paymentStatus === "paid");
    const apptGross = completedPaid.reduce((s, a) => s + a.fee, 0);
    const apptNet = completedPaid.reduce((s, a) => s + netFee(a), 0);
    const rate = doctor?.commissionRate ?? 0;
    const paidConsults = consultations.filter((c) => c.paymentStatus === "paid");
    const consultNet = paidConsults.reduce((s, c) => s + Math.round(c.fee * (1 - rate / 100)), 0);
    const totalNet = apptNet + consultNet;
    const totalGross = apptGross + paidConsults.reduce((s, c) => s + c.fee, 0);
    const reserved = settlements.filter((s) => s.status !== "rejected").reduce((s, x) => s + x.amount, 0);
    const available = Math.max(0, totalNet - reserved);
    const pending = settlements.filter((s) => s.status === "pending" || s.status === "approved").reduce((s, x) => s + x.amount, 0);
    const commissionPaid = completedPaid.reduce((s, a) => s + a.commission, 0);
    return { available, pending, totalNet, totalGross, commissionPaid, completedPaid, rate };
  }, [appointments, consultations, settlements, doctor]);

  const monthKeys = useMemo(() => [5, 4, 3, 2, 1, 0].map((i) => jalaliMonthKey(subMonthsISO(todayISO(), i))), []);

  const incomeData = useMemo(
    () =>
      monthKeys.map((key) => {
        const rows = finance.completedPaid.filter((a) => jalaliMonthKey(a.date) === key);
        return {
          label: faMonthLabel(key),
          net: rows.reduce((s, a) => s + netFee(a), 0),
          gross: rows.reduce((s, a) => s + a.fee, 0),
        };
      }),
    [monthKeys, finance.completedPaid]
  );

  const last6Net = useMemo(() => incomeData.reduce((s, m) => s + m.net, 0), [incomeData]);

  /* ----------------------------- settlement form ----------------------------- */

  const settlementSchema = useMemo(
    () =>
      z
        .object({
          amount: z
            .number({ message: "مبلغ را به تومان وارد کنید" })
            .min(500_000, "حداقل مبلغ تسویه ۵۰۰٬۰۰۰ تومان است")
            .max(finance.available, "مبلغ بیش از موجودی شماست"),
          bankName: z.string().min(1, "بانک موردنظر را انتخاب کنید"),
          iban: z
            .string()
            .regex(/^IR\d{24}$/, "شماره شبا معتبر نیست (مثال: IR به‌همراه ۲۴ رقم)"),
        }),
    [finance.available]
  );

  type SettlementForm = z.infer<typeof settlementSchema>;

  const form = useForm<SettlementForm>({
    resolver: zodResolver(settlementSchema),
    defaultValues: { amount: 500_000, bankName: "", iban: "" },
  });

  const submitSettlement = (values: SettlementForm) => {
    if (!doctor) return;
    const s = requestSettlement({ doctorId: doctor.id, amount: values.amount, bankName: values.bankName, iban: values.iban });
    setSubmittedCode(s.code);
    form.reset({ amount: 500_000, bankName: "", iban: "" });
    toast.success("درخواست تسویه ثبت شد و در پنل مدیریت بررسی می‌شود", {
      description: `کد پیگیری: ${toFa(s.code)} — مبلغ ${toman(values.amount)}`,
    });
  };

  /* ----------------------------- transactions table ----------------------------- */

  const columns: ColumnDef<Transaction>[] = [
    {
      accessorKey: "code",
      header: "کد",
      cell: ({ row }) => <span className="font-mono text-xs tabular-nums">{toFa(row.original.code)}</span>,
    },
    {
      accessorKey: "kind",
      header: "نوع",
      cell: ({ row }) => (
        <span className="flex items-center gap-1.5 text-xs">
          {row.original.direction === "in" ? (
            <Banknote className="size-3.5 text-emerald-500" aria-hidden />
          ) : (
            <Wallet className="size-3.5 text-rose-500" aria-hidden />
          )}
          {TRANSACTION_KIND_LABELS[row.original.kind]}
        </span>
      ),
    },
    {
      accessorKey: "amount",
      header: "مبلغ",
      cell: ({ row }) => (
        <span className={`text-xs font-semibold tabular-nums ${row.original.direction === "in" ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
          {row.original.direction === "in" ? "+" : "−"} {toman(row.original.amount)}
        </span>
      ),
    },
    {
      accessorKey: "description",
      header: "شرح",
      cell: ({ row }) => <span className="block max-w-56 truncate text-xs text-muted-foreground">{toFa(row.original.description)}</span>,
    },
    {
      accessorKey: "createdAtISO",
      header: "تاریخ",
      cell: ({ row }) => <span className="text-xs text-muted-foreground">{faDateTime(row.original.createdAtISO)}</span>,
    },
  ];

  if (!doctor) {
    return <PageHeader title="امور مالی" description="در حال بارگذاری…" loading={loading} />;
  }

  const incomeConfig = {
    net: { label: "خالص (پس از کمیسیون)", color: "var(--chart-2)" },
    gross: { label: "ناخالص", color: "var(--chart-1)" },
  } as const;

  return (
    <div className="space-y-6">
      <PageHeader title="امور مالی" description="درآمد، کمیسیون، تراکنش‌ها و تسویه حساب شما" loading={loading} />

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3" aria-label="خلاصه مالی">
        <StatCard
          title="موجودی قابل تسویه"
          value={toman(finance.available)}
          hint={`پس از کسر ${toFa(settlements.filter((s) => s.status !== "rejected").length)} درخواست تسویه`}
          icon={PiggyBank}
          tone="emerald"
          loading={loading}
        />
        <StatCard
          title="در انتظار تسویه"
          value={toman(finance.pending)}
          hint={`${toFa(settlements.filter((s) => s.status === "pending" || s.status === "approved").length)} درخواست در جریان`}
          icon={Landmark}
          tone="amber"
          loading={loading}
        />
        <StatCard
          title="مجموع درآمد ۶ ماه اخیر"
          value={tomanCompact(last6Net)}
          hint={`ناخالص: ${tomanCompact(incomeData.reduce((s, m) => s + m.gross, 0))}`}
          icon={TrendingUp}
          tone="sky"
          loading={loading}
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-3" aria-label="نمودار درآمد و کمیسیون">
        <ChartCard
          title="درآمد ماهانه ۶ ماه اخیر"
          description="مقایسه مبلغ ناخالص و سهم خالص شما"
          config={incomeConfig}
          loading={loading}
          className="lg:col-span-2"
          legend={
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 pt-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5"><span className="size-2 rounded-[2px] bg-[var(--chart-1)]" aria-hidden />ناخالص</span>
              <span className="flex items-center gap-1.5"><span className="size-2 rounded-[2px] bg-[var(--chart-2)]" aria-hidden />خالص پس از کمیسیون</span>
            </div>
          }
        >
          <BarChart data={incomeData} margin={{ top: 8, left: 0, right: 8 }}>
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
                  formatter={(v, name) => [toman(Number(v)), name === "net" ? "خالص" : "ناخالص"]}
                />
              }
            />
            <Bar dataKey="gross" fill="var(--color-gross)" radius={5} />
            <Bar dataKey="net" fill="var(--color-net)" radius={5} />
          </BarChart>
        </ChartCard>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">کمیسیون پلتفرم</CardTitle>
            <CardDescription className="text-xs">بر اساس قرارداد شما با «دکترها»</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl bg-primary/10 p-4 text-center">
              <p className="text-xs text-muted-foreground">نرخ کمیسیون شما</p>
              <p className="mt-1 text-3xl font-extrabold text-primary">{faPercent(finance.rate)}</p>
            </div>
            <div className="rounded-xl border p-3">
              <p className="text-xs text-muted-foreground">مجموع کمیسیون پرداختی (نوبت‌های انجام‌شده)</p>
              <p className="mt-1 text-lg font-bold tabular-nums">{toman(finance.commissionPaid)}</p>
            </div>
            <p className="text-[11px] leading-relaxed text-muted-foreground">
              کمیسیون هنگام تسویه از موجودی شما کسر می‌شود؛ مبالغ نمایش‌داده‌شده در این صفحه از پیش خالص‌سازی شده‌اند.
            </p>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 lg:grid-cols-3" aria-label="تراکنش‌ها و درخواست تسویه">
        <div className="lg:col-span-2">
          <DataTable
            columns={columns}
            data={transactions}
            loading={loading}
            searchPlaceholder="جستجو در کد یا شرح…"
            emptyTitle="تراکنشی ثبت نشده است"
            exportCsvName="تراکنش-ها"
            csvRows={(t) => ({
              "کد": toFa(t.code),
              "نوع": TRANSACTION_KIND_LABELS[t.kind],
              "جهت": t.direction === "in" ? "واریز" : "برداشت",
              "مبلغ (تومان)": t.amount,
              "شرح": toFa(t.description),
              "تاریخ": faDateTime(t.createdAtISO),
            })}
            mobileCard={(t) => (
              <div className="space-y-1.5 rounded-xl border p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-[11px] tabular-nums text-muted-foreground">{toFa(t.code)}</span>
                  <Badge variant="outline" className="text-[10px]">{TRANSACTION_KIND_LABELS[t.kind]}</Badge>
                </div>
                <p className={`text-sm font-semibold tabular-nums ${t.direction === "in" ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                  {t.direction === "in" ? "+" : "−"} {toman(t.amount)}
                </p>
                <p className="truncate text-xs text-muted-foreground">{toFa(t.description)}</p>
                <p className="text-[11px] text-muted-foreground">{faDateTime(t.createdAtISO)}</p>
              </div>
            )}
          />
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">درخواست تسویه حساب</CardTitle>
              <CardDescription className="text-xs">
                موجودی قابل تسویه شما: {toman(finance.available)}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(submitSettlement)} className="space-y-3">
                  <FormField
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                      <FormItem className="space-y-1.5">
                        <FormLabel className="text-sm">مبلغ (تومان)</FormLabel>
                        <FormControl>
                          <Input
                            inputMode="numeric"
                            value={field.value ? faNum(field.value) : ""}
                            onChange={(e) => {
                              const n = parseFaNumber(e.target.value);
                              field.onChange(Number.isFinite(n) ? n : Number.NaN);
                            }}
                            placeholder="حداقل ۵۰۰٬۰۰۰"
                            className="h-9 tabular-nums"
                            aria-label="مبلغ تسویه به تومان"
                          />
                        </FormControl>
                        <FormDescription className="text-[11px]">حداقل ۵۰۰٬۰۰۰ تومان — بیش از موجودی قابل تسویه نیست.</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="bankName"
                    render={({ field }) => (
                      <FormItem className="space-y-1.5">
                        <FormLabel className="text-sm">بانک</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger className="h-9 w-full" aria-label="انتخاب بانک">
                              <SelectValue placeholder="انتخاب بانک" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {BANK_OPTIONS.map((b) => (
                              <SelectItem key={b} value={b}>
                                {b}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="iban"
                    render={({ field }) => (
                      <FormItem className="space-y-1.5">
                        <FormLabel className="text-sm">شماره شبا</FormLabel>
                        <FormControl>
                          <Input
                            dir="ltr"
                            inputMode="numeric"
                            value={field.value}
                            onChange={(e) => field.onChange(toEnDigits(e.target.value).toUpperCase().replace(/\s|-/g, ""))}
                            placeholder="IR012345678901234567890123"
                            className="h-9 text-start"
                            aria-label="شماره شبا"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" className="w-full" disabled={loading}>
                    ثبت درخواست تسویه
                  </Button>
                </form>
              </Form>
              {submittedCode && (
                <p className="mt-3 rounded-lg bg-emerald-500/10 p-2 text-center text-xs text-emerald-700 dark:text-emerald-400">
                  آخرین درخواست ثبت‌شده: {toFa(submittedCode)} — در انتظار بررسی مدیر
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">تسویه‌های قبلی</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {settlements.length === 0 ? (
                <p className="text-xs text-muted-foreground">تسویه‌ای ثبت نشده است.</p>
              ) : (
                <ul className="max-h-56 space-y-1.5 overflow-y-auto">
                  {settlements.map((s) => (
                    <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border p-2.5 text-xs">
                      <span className="min-w-0">
                        <span className="block font-semibold tabular-nums">{toman(s.amount)}</span>
                        <span className="block text-[11px] text-muted-foreground">
                          {toFa(s.code)} • {faFromNow(s.requestedAtISO.split("T")[0])}
                        </span>
                      </span>
                      <StatusBadge status={s.status} label={SETTLEMENT_STATUS_LABELS[s.status]} />
                    </li>
                  ))}
                </ul>
              )}
              <Separator className="my-1" />
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                درخواست‌های تسویه در پنل مدیریت بررسی و پس از تأیید، مبلغ به شماره شبای شما واریز می‌شود.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}

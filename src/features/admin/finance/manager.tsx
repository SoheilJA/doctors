"use client";

/**
 * /admin/finance — امور مالی: کارت‌های آماری، تب تراکنش‌ها (فیلتر نوع/تاریخ + خروجی CSV)،
 * تب تسویه‌ها (تأیید/رد/پرداخت) و تب قوانین کمیسیون (فقط‌خواندنی).
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import {
  ArrowLeft,
  Banknote,
  CheckCircle2,
  Landmark,
  PercentCircle,
  Search,
  Settings2,
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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { JalaliDatePicker } from "@/components/shared/jalali-date-picker";
import { DataTable } from "@/components/shared/data-table";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { useDemoLoading } from "@/components/shared/hydration-gate";
import { useAppStore } from "@/store/app-store";
import {
  COMMISSION_RANGE,
  DEFAULT_COMMISSION_RATE,
  SETTLEMENT_STATUS_LABELS,
  SPECIALTY_FEE_RANGE,
  SPECIALTY_LABELS,
  TRANSACTION_KIND_LABELS,
  type SettlementStatus,
  type TransactionKind,
} from "@/lib/constants";
import { faDateShort, faDateTime } from "@/lib/jalali";
import { faNum, faPercent, toFa, toman, tomanCompact } from "@/lib/fa";
import {
  computeCommission,
  computeGmv,
  isGmvTransaction,
  transactionCommission,
  useAdminPanel,
  useMonthlyFinance,
} from "@/features/admin/shared";
import type { Settlement, Transaction } from "@/types";

const ALL = "all";
type KindFilter = TransactionKind | typeof ALL;
type SettlementFilter = SettlementStatus | typeof ALL;

export function AdminFinanceManager() {
  const loading = useDemoLoading();
  const panel = useAdminPanel();
  const updateSettlement = useAppStore((s) => s.updateSettlement);
  const monthly = useMonthlyFinance(panel);

  /* --------------------------------- KPIs --------------------------------- */

  const gmv = useMemo(() => computeGmv(panel.transactions), [panel.transactions]);
  const commission = useMemo(
    () => computeCommission(panel.appointments, panel.consultations, panel.doctorMap),
    [panel.appointments, panel.consultations, panel.doctorMap]
  );
  const pendingSettlements = useMemo(
    () => panel.settlements.filter((s) => s.status === "pending"),
    [panel.settlements]
  );
  const paidToDoctors = useMemo(
    () => panel.settlements.filter((s) => s.status === "paid").reduce((sum, s) => sum + s.amount, 0),
    [panel.settlements]
  );

  /* ------------------------------ transactions ------------------------------ */

  const [kind, setKind] = useState<KindFilter>(ALL);
  const [fromISO, setFromISO] = useState<string | undefined>();
  const [toISO, setToISO] = useState<string | undefined>();
  const [trxSearch, setTrxSearch] = useState("");

  const filteredTransactions = useMemo(() => {
    const q = trxSearch.trim().toLowerCase();
    return panel.transactions
      .filter((t) => {
        if (kind !== ALL && t.kind !== kind) return false;
        const day = t.createdAtISO.split("T")[0];
        if (fromISO && day < fromISO) return false;
        if (toISO && day > toISO) return false;
        if (q) {
          const patient = t.patientId ? panel.patientMap.get(t.patientId)?.name ?? "" : "";
          const doctor = t.doctorId ? panel.doctorMap.get(t.doctorId)?.name ?? "" : "";
          const haystack = `${t.code} ${t.description} ${patient} ${doctor}`.toLowerCase();
          if (!haystack.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => b.createdAtISO.localeCompare(a.createdAtISO));
  }, [panel.transactions, kind, fromISO, toISO, trxSearch, panel.patientMap, panel.doctorMap]);

  const summary = useMemo(() => {
    let total = 0;
    let commissionSum = 0;
    for (const t of filteredTransactions) {
      total += t.amount;
      const c = transactionCommission(t, panel.appointmentMap, panel.consultationMap, panel.doctorMap);
      if (c !== null) commissionSum += c;
    }
    return { count: filteredTransactions.length, total, commissionSum };
  }, [filteredTransactions, panel.appointmentMap, panel.consultationMap, panel.doctorMap]);

  const relatedNames = (t: Transaction) => {
    const parts: string[] = [];
    if (t.patientId) parts.push(panel.patientMap.get(t.patientId)?.name ?? "کاربر");
    if (t.doctorId) parts.push(panel.doctorMap.get(t.doctorId)?.name ?? "پزشک");
    return parts.join(" ← ") || "—";
  };

  const trxColumns: ColumnDef<Transaction>[] = [
    {
      accessorKey: "code",
      header: "کد",
      cell: ({ row }) => <span className="font-mono text-xs tabular-nums">{toFa(row.original.code)}</span>,
    },
    {
      accessorKey: "kind",
      header: "نوع",
      cell: ({ row }) => <Badge variant="outline">{TRANSACTION_KIND_LABELS[row.original.kind]}</Badge>,
    },
    {
      accessorKey: "amount",
      header: "مبلغ",
      cell: ({ row }) => (
        <span
          className={`whitespace-nowrap text-sm font-semibold tabular-nums ${
            row.original.direction === "in" ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
          }`}
        >
          {row.original.direction === "in" ? "+" : "−"} {toman(row.original.amount)}
        </span>
      ),
    },
    {
      id: "commission",
      header: "کمیسیون",
      cell: ({ row }) => {
        const c = transactionCommission(row.original, panel.appointmentMap, panel.consultationMap, panel.doctorMap);
        return <span className="whitespace-nowrap text-sm tabular-nums text-muted-foreground">{c !== null ? toman(c) : "—"}</span>;
      },
    },
    {
      id: "related",
      header: "طرف تراکنش",
      cell: ({ row }) => (
        <span className="block max-w-44 truncate text-sm text-muted-foreground">{relatedNames(row.original)}</span>
      ),
    },
    {
      accessorKey: "createdAtISO",
      header: "تاریخ",
      cell: ({ row }) => (
        <span className="whitespace-nowrap text-xs text-muted-foreground">{faDateTime(row.original.createdAtISO)}</span>
      ),
    },
    {
      accessorKey: "status",
      header: "وضعیت",
      cell: ({ row }) => <TransactionStatusBadge status={row.original.status} />,
    },
  ];

  /* ------------------------------- settlements ------------------------------- */

  const [settlementFilter, setSettlementFilter] = useState<SettlementFilter>(ALL);
  const [rejectTarget, setRejectTarget] = useState<Settlement | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const filteredSettlements = useMemo(
    () =>
      panel.settlements
        .filter((s) => settlementFilter === ALL || s.status === settlementFilter)
        .sort((a, b) => b.requestedAtISO.localeCompare(a.requestedAtISO)),
    [panel.settlements, settlementFilter]
  );

  const approveSettlement = (s: Settlement) => {
    updateSettlement(s.id, { status: "approved" }, panel.actorName);
    toast.success(`درخواست تسویه ${toFa(s.code)} تأیید شد`, { description: `${toman(s.amount)} — ${s.bankName}` });
  };

  const confirmRejectSettlement = () => {
    if (!rejectTarget) return;
    updateSettlement(
      rejectTarget.id,
      { status: "rejected", ...(rejectReason.trim() ? { note: rejectReason.trim() } : {}) },
      panel.actorName
    );
    toast.error(`درخواست تسویه ${toFa(rejectTarget.code)} رد شد`);
    setRejectTarget(null);
    setRejectReason("");
  };

  const paySettlement = (s: Settlement) => {
    updateSettlement(s.id, { status: "paid" }, panel.actorName);
    toast.success(`تسویه ${toFa(s.code)} پرداخت شد`, {
      description: `مبلغ ${toman(s.amount)} به پزشک واریز و تراکنش خروجی ثبت شد.`,
    });
  };

  const settlementColumns: ColumnDef<Settlement>[] = [
    {
      accessorKey: "code",
      header: "کد",
      cell: ({ row }) => <span className="font-mono text-xs tabular-nums">{toFa(row.original.code)}</span>,
    },
    {
      id: "doctor",
      header: "پزشک",
      cell: ({ row }) => (
        <span className="max-w-40 truncate text-sm font-medium">
          {panel.doctorMap.get(row.original.doctorId)?.name ?? "—"}
        </span>
      ),
    },
    {
      accessorKey: "amount",
      header: "مبلغ",
      cell: ({ row }) => <span className="whitespace-nowrap text-sm font-semibold tabular-nums">{toman(row.original.amount)}</span>,
    },
    {
      accessorKey: "bankName",
      header: "بانک",
      cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.bankName}</span>,
    },
    {
      accessorKey: "iban",
      header: "شبا",
      cell: ({ row }) => (
        <span dir="ltr" className="font-mono text-[11px] tabular-nums text-muted-foreground">
          {row.original.iban}
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: "وضعیت",
      cell: ({ row }) => <StatusBadge status={row.original.status} label={SETTLEMENT_STATUS_LABELS[row.original.status]} />,
    },
    {
      accessorKey: "requestedAtISO",
      header: "تاریخ درخواست",
      cell: ({ row }) => (
        <span className="whitespace-nowrap text-xs text-muted-foreground">{faDateShort(row.original.requestedAtISO.split("T")[0])}</span>
      ),
    },
    {
      accessorKey: "paidAtISO",
      header: "تاریخ پرداخت",
      cell: ({ row }) =>
        row.original.paidAtISO ? (
          <span className="whitespace-nowrap text-xs text-muted-foreground">{faDateShort(row.original.paidAtISO.split("T")[0])}</span>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        ),
    },
    {
      id: "actions",
      header: "عملیات",
      cell: ({ row }) => {
        const s = row.original;
        return (
          <div className="flex items-center justify-end gap-1.5">
            {s.status === "pending" && (
              <>
                <Button variant="outline" size="sm" className="h-7 gap-1 border-emerald-500/40 text-xs text-emerald-700 dark:text-emerald-400" onClick={() => approveSettlement(s)}>
                  <CheckCircle2 className="size-3.5" aria-hidden />
                  تأیید
                </Button>
                <Button variant="outline" size="sm" className="h-7 gap-1 border-rose-500/40 text-xs text-rose-600" onClick={() => setRejectTarget(s)}>
                  <XCircle className="size-3.5" aria-hidden />
                  رد
                </Button>
              </>
            )}
            {s.status === "approved" && (
              <Button size="sm" className="h-7 gap-1 bg-emerald-600 text-xs text-white hover:bg-emerald-700" onClick={() => paySettlement(s)}>
                <Banknote className="size-3.5" aria-hidden />
                پرداخت شد
              </Button>
            )}
            {(s.status === "paid" || s.status === "rejected") && (
              <span className="text-xs text-muted-foreground">—</span>
            )}
          </div>
        );
      },
    },
  ];

  /* --------------------------------- render --------------------------------- */

  return (
    <div className="space-y-6">
      <PageHeader
        title="امور مالی"
        description="گردش مالی، کمیسیون پلتفرم، تراکنش‌ها و تسویه حساب پزشکان"
        loading={loading}
      />

      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4" aria-label="خلاصه مالی">
        <StatCard
          title="گردش مالی کل"
          value={tomanCompact(gmv)}
          hint={`${faNum(panel.transactions.filter(isGmvTransaction).length)} تراکنش موفق خدمات`}
          icon={Banknote}
          tone="emerald"
          loading={loading}
        />
        <StatCard
          title="کمیسیون پلتفرم"
          value={tomanCompact(commission)}
          hint={`میانگین ${faNum(Math.round((commission / (gmv || 1)) * 100))}٪ از گردش`}
          icon={PercentCircle}
          tone="amber"
          loading={loading}
        />
        <StatCard
          title="تسویه‌های در انتظار"
          value={faNum(pendingSettlements.length)}
          hint={tomanCompact(pendingSettlements.reduce((s, x) => s + x.amount, 0))}
          icon={Landmark}
          tone="rose"
          loading={loading}
        />
        <StatCard
          title="پرداختی به پزشکان"
          value={tomanCompact(paidToDoctors)}
          hint={`${faNum(panel.settlements.filter((s) => s.status === "paid").length)} تسویه پرداخت‌شده`}
          icon={Wallet}
          tone="primary"
          loading={loading}
        />
      </section>

      <Tabs defaultValue="transactions">
        <TabsList>
          <TabsTrigger value="transactions">تراکنش‌ها</TabsTrigger>
          <TabsTrigger value="settlements">درخواست‌های تسویه</TabsTrigger>
          <TabsTrigger value="rules">قوانین کمیسیون</TabsTrigger>
        </TabsList>

        {/* transactions tab */}
        <TabsContent value="transactions" className="mt-4 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-44 flex-1 sm:max-w-60">
              <Search className="absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
              <Input
                value={trxSearch}
                onChange={(e) => setTrxSearch(e.target.value)}
                placeholder="جستجوی کد، شرح یا افراد…"
                className="h-9 ps-8 text-sm"
                aria-label="جستجوی تراکنش"
              />
            </div>
            <Select value={kind} onValueChange={(v) => setKind(v as KindFilter)}>
              <SelectTrigger className="h-9 w-40" aria-label="فیلتر نوع تراکنش">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>همه انواع</SelectItem>
                {Object.entries(TRANSACTION_KIND_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-1.5">
              <JalaliDatePicker value={fromISO} onChange={setFromISO} placeholder="از تاریخ" className="h-9 w-36 text-xs" aria-label="فیلتر از تاریخ" />
              <JalaliDatePicker value={toISO} onChange={setToISO} placeholder="تا تاریخ" className="h-9 w-36 text-xs" aria-label="فیلتر تا تاریخ" />
            </div>
            {(kind !== ALL || fromISO || toISO || trxSearch) && (
              <Button
                variant="ghost"
                size="sm"
                className="h-9"
                onClick={() => {
                  setKind(ALL);
                  setFromISO(undefined);
                  setToISO(undefined);
                  setTrxSearch("");
                }}
              >
                پاک‌کردن فیلترها
              </Button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-1 rounded-xl border bg-muted/40 px-4 py-2.5 text-xs">
            <span className="text-muted-foreground">
              نتایج فیلترشده: <span className="font-semibold text-foreground tabular-nums">{faNum(summary.count)}</span> تراکنش
            </span>
            <span className="text-muted-foreground">
              مجموع مبالغ: <span className="font-semibold text-foreground tabular-nums">{toman(summary.total)}</span>
            </span>
            <span className="text-muted-foreground">
              کمیسیون خدمات: <span className="font-semibold text-foreground tabular-nums">{toman(summary.commissionSum)}</span>
            </span>
          </div>

          <DataTable
            columns={trxColumns}
            data={filteredTransactions}
            loading={loading}
            searchable={false}
            emptyTitle="تراکنشی یافت نشد"
            emptyDescription="بازه یا فیلترها را تغییر دهید."
            emptyIcon={Banknote}
            exportCsvName="تراکنش-ها"
            csvRows={(t) => ({
              "کد": toFa(t.code),
              "نوع": TRANSACTION_KIND_LABELS[t.kind],
              "جهت": t.direction === "in" ? "واریز" : "برداشت",
              "مبلغ (تومان)": t.amount,
              "کمیسیون (تومان)": transactionCommission(t, panel.appointmentMap, panel.consultationMap, panel.doctorMap) ?? "",
              "طرف تراکنش": relatedNames(t),
              "تاریخ": faDateTime(t.createdAtISO),
              "وضعیت": t.status === "success" ? "موفق" : t.status === "failed" ? "ناموفق" : "در انتظار",
            })}
            mobileCard={(t) => (
              <div className="space-y-2 rounded-xl border p-3">
                <div className="flex items-start justify-between gap-2">
                  <Badge variant="outline">{TRANSACTION_KIND_LABELS[t.kind]}</Badge>
                  <span className="font-mono text-[11px] tabular-nums text-muted-foreground">{toFa(t.code)}</span>
                </div>
                <p
                  className={`text-sm font-semibold tabular-nums ${
                    t.direction === "in" ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                  }`}
                >
                  {t.direction === "in" ? "+" : "−"} {toman(t.amount)}
                </p>
                <p className="truncate text-xs text-muted-foreground">{toFa(t.description)}</p>
                <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                  <span>{relatedNames(t)}</span>
                  <span>{faDateTime(t.createdAtISO)}</span>
                </div>
              </div>
            )}
          />
        </TabsContent>

        {/* settlements tab */}
        <TabsContent value="settlements" className="mt-4 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Select value={settlementFilter} onValueChange={(v) => setSettlementFilter(v as SettlementFilter)}>
              <SelectTrigger className="h-9 w-44" aria-label="فیلتر وضعیت تسویه">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>همه وضعیت‌ها</SelectItem>
                {Object.entries(SETTLEMENT_STATUS_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>
                    {v}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {settlementFilter !== ALL && (
              <Button variant="ghost" size="sm" className="h-9" onClick={() => setSettlementFilter(ALL)}>
                پاک‌کردن فیلتر
              </Button>
            )}
          </div>

          <DataTable
            columns={settlementColumns}
            data={filteredSettlements}
            loading={loading}
            searchable
            searchPlaceholder="جستجوی کد یا نام پزشک…"
            emptyTitle="درخواست تسویه‌ای یافت نشد"
            emptyDescription="وضعیت فیلتر را تغییر دهید."
            emptyIcon={Landmark}
            exportCsvName="تسویه-ها"
            csvRows={(s) => ({
              "کد": toFa(s.code),
              "پزشک": panel.doctorMap.get(s.doctorId)?.name ?? "",
              "مبلغ (تومان)": s.amount,
              "بانک": s.bankName,
              "شبا": s.iban,
              "وضعیت": SETTLEMENT_STATUS_LABELS[s.status],
              "تاریخ درخواست": faDateShort(s.requestedAtISO.split("T")[0]),
              "تاریخ پرداخت": s.paidAtISO ? faDateShort(s.paidAtISO.split("T")[0]) : "",
            })}
            mobileCard={(s) => (
              <div className="space-y-2 rounded-xl border p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{panel.doctorMap.get(s.doctorId)?.name ?? "—"}</p>
                    <p className="font-mono text-[11px] tabular-nums text-muted-foreground">{toFa(s.code)}</p>
                  </div>
                  <StatusBadge status={s.status} label={SETTLEMENT_STATUS_LABELS[s.status]} />
                </div>
                <p className="text-sm font-semibold tabular-nums">{toman(s.amount)}</p>
                <p className="text-xs text-muted-foreground">
                  {s.bankName} — درخواست: {faDateShort(s.requestedAtISO.split("T")[0])}
                </p>
                {s.status === "pending" && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 flex-1 border-emerald-500/40 text-xs text-emerald-700 dark:text-emerald-400"
                      onClick={() => approveSettlement(s)}
                    >
                      <CheckCircle2 className="size-3.5" aria-hidden />
                      تأیید
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 flex-1 border-rose-500/40 text-xs text-rose-600"
                      onClick={() => setRejectTarget(s)}
                    >
                      <XCircle className="size-3.5" aria-hidden />
                      رد
                    </Button>
                  </div>
                )}
                {s.status === "approved" && (
                  <Button size="sm" className="h-7 w-full gap-1 bg-emerald-600 text-xs text-white hover:bg-emerald-700" onClick={() => paySettlement(s)}>
                    <Banknote className="size-3.5" aria-hidden />
                    پرداخت شد
                  </Button>
                )}
              </div>
            )}
          />
        </TabsContent>

        {/* commission rules tab */}
        <TabsContent value="rules" className="mt-4">
          <div className="grid gap-4 lg:grid-cols-3">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Settings2 className="size-4 text-primary" aria-hidden />
                  قوانین پیش‌فرض
                </CardTitle>
                <CardDescription className="text-xs">قوانین کمیسیون پلتفرم — نسخه نمایشی</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between rounded-xl border p-3">
                  <span className="text-sm text-muted-foreground">نرخ کمیسیون پیش‌فرض</span>
                  <span className="text-sm font-bold tabular-nums">{faPercent(DEFAULT_COMMISSION_RATE)}</span>
                </div>
                <div className="flex items-center justify-between rounded-xl border p-3">
                  <span className="text-sm text-muted-foreground">بازه مجاز تغییر نرخ</span>
                  <span className="text-sm font-bold tabular-nums">
                    {faNum(COMMISSION_RANGE[0])} تا {faNum(COMMISSION_RANGE[1])} درصد
                  </span>
                </div>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex cursor-not-allowed items-center justify-between rounded-xl border border-dashed p-3 opacity-70">
                      <span className="text-sm">قانون سفارشی</span>
                      <Switch disabled checked={false} aria-label="قانون سفارشی (غیرفعال در نسخه نمایشی)" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>در نسخه نمایشی فعال نیست</TooltipContent>
                </Tooltip>
                <Button asChild variant="outline" className="w-full">
                  <Link href="/admin/doctors">
                    ویرایش نرخ کمیسیون پزشکان
                    <ArrowLeft className="size-4" aria-hidden />
                  </Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">بازه تعرفه ویزیت بر اساس تخصص</CardTitle>
                <CardDescription className="text-xs">
                  بازه پیشنهادی تعرفه ویزیت حضوری (تومان) — مبنای اعتبارسنجی تعرفه پزشکان جدید
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto rounded-xl border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-start">تخصص</TableHead>
                        <TableHead className="text-start">حداقل تعرفه</TableHead>
                        <TableHead className="text-start">حداکثر تعرفه</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Object.entries(SPECIALTY_FEE_RANGE).map(([id, [min, max]]) => (
                        <TableRow key={id}>
                          <TableCell className="text-sm">{SPECIALTY_LABELS[id] ?? id}</TableCell>
                          <TableCell className="text-sm tabular-nums">{toman(min)}</TableCell>
                          <TableCell className="text-sm tabular-nums">{toman(max)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <p className="mt-3 text-xs text-muted-foreground">
                  نرخ نهایی هر پزشک در صفحه مدیریت پزشکان قابل ویرایش است و در محاسبه کمیسیون همان پزشک اعمال می‌شود.
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* reject settlement dialog */}
      <AlertDialog open={rejectTarget !== null} onOpenChange={(v) => !v && setRejectTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>رد درخواست تسویه</AlertDialogTitle>
            <AlertDialogDescription>
              درخواست {rejectTarget ? toFa(rejectTarget.code) : ""} از{" "}
              {rejectTarget ? panel.doctorMap.get(rejectTarget.doctorId)?.name ?? "" : ""} به مبلغ{" "}
              {rejectTarget ? toman(rejectTarget.amount) : ""} رد شود؟ دلیل (اختیاری) برای پزشک ثبت می‌شود.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            rows={2}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            placeholder="مثلاً: مغایرت در اطلاعات حساب بانکی"
            className="resize-none"
            aria-label="دلیل رد درخواست تسویه (اختیاری)"
          />
          <AlertDialogFooter>
            <AlertDialogCancel>انصراف</AlertDialogCancel>
            <AlertDialogAction className="bg-rose-600 text-white hover:bg-rose-700" onClick={confirmRejectSettlement}>
              بله، رد شود
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function TransactionStatusBadge({ status }: { status: Transaction["status"] }) {
  if (status === "success") {
    return (
      <Badge className="border-emerald-500/25 bg-emerald-500/12 text-emerald-700 dark:text-emerald-400">موفق</Badge>
    );
  }
  if (status === "failed") {
    return <Badge className="border-rose-500/25 bg-rose-500/12 text-rose-700 dark:text-rose-400">ناموفق</Badge>;
  }
  return (
    <Badge className="border-amber-500/25 bg-amber-500/12 text-amber-700 dark:text-amber-400">در انتظار</Badge>
  );
}

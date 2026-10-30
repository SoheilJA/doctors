"use client";

/**
 * کیف پول — موجودی، شارژ، تراکنش‌ها (DataTable) و آمار.
 */

import { useMemo } from "react";
import { ArrowDownLeft, ArrowUpRight, Banknote, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { toFa, toman } from "@/lib/fa";
import { faDateTime } from "@/lib/jalali";
import { TRANSACTION_KIND_LABELS } from "@/lib/constants";
import type { Transaction } from "@/types";
import { DataTable } from "@/components/shared/data-table";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { useDemoLoading } from "@/components/shared/hydration-gate";
import { useAppStore } from "@/store/app-store";
import { TopupCard } from "@/features/patient/wallet/topup-card";
import { useCurrentPatient } from "@/features/patient/helpers";

export default function WalletPage() {
  const loading = useDemoLoading();
  const patient = useCurrentPatient();
  const transactions = useAppStore((s) => s.transactions);

  const mine = useMemo(
    () =>
      transactions
        .filter((t) => t.patientId === patient?.id)
        .sort((a, b) => b.createdAtISO.localeCompare(a.createdAtISO)),
    [transactions, patient?.id]
  );

  const topupTotal = mine.filter((t) => t.kind === "topup" && t.direction === "in").reduce((s, t) => s + t.amount, 0);
  const spendTotal = mine.filter((t) => t.direction === "in" && t.kind !== "topup").reduce((s, t) => s + t.amount, 0);
  const refundTotal = mine.filter((t) => t.kind === "refund").reduce((s, t) => s + t.amount, 0);

  /** + برای ورود وجه به کیف پول (شارژ/بازگشت) و − برای هزینه‌ها */
  const isCredit = (t: Transaction) => t.kind === "topup" || t.kind === "refund";

  const columns = useMemo<ColumnDef<Transaction, string>[]>(
    () => [
      {
        header: "کد",
        accessorKey: "code",
        cell: ({ row }) => <span className="font-semibold tabular-nums">{toFa(row.original.code)}</span>,
      },
      {
        header: "نوع",
        accessorKey: "kind",
        cell: ({ row }) => (
          <Badge variant="outline" className="text-xs">
            {TRANSACTION_KIND_LABELS[row.original.kind]}
          </Badge>
        ),
      },
      {
        header: "مبلغ",
        accessorKey: "amount",
        cell: ({ row }) => {
          const credit = isCredit(row.original);
          return (
            <span
              className={cn(
                "flex items-center gap-1 font-bold tabular-nums",
                credit ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
              )}
            >
              {credit ? <ArrowDownLeft className="size-3.5" aria-hidden /> : <ArrowUpRight className="size-3.5" aria-hidden />}
              {credit ? "+" : "−"} {toman(row.original.amount)}
            </span>
          );
        },
      },
      {
        header: "شرح",
        accessorKey: "description",
        cell: ({ row }) => (
          <span className="text-muted-foreground" title={row.original.description}>
            {toFa(row.original.description)}
          </span>
        ),
      },
      {
        header: "تاریخ",
        accessorKey: "createdAtISO",
        cell: ({ row }) => <span className="text-xs tabular-nums">{faDateTime(row.original.createdAtISO)}</span>,
      },
    ],
    []
  );

  return (
    <div className="space-y-5">
      <PageHeader title="کیف پول" description="مدیریت موجودی، شارژ و سوابق تراکنش‌ها." loading={loading} />

      {/* balance + topup */}
      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="overflow-hidden border-primary/25 bg-gradient-to-bl from-primary/12 via-primary/5 to-transparent">
          <CardContent className="flex h-full flex-col justify-between gap-4 p-6">
            <div className="flex items-center gap-2 text-sm font-medium text-primary">
              <Wallet className="size-4.5" aria-hidden />
              موجودی کیف پول
            </div>
            <div>
              <p className="text-4xl font-extrabold tracking-tight tabular-nums">
                {loading ? "…" : toman(patient?.walletBalance ?? 0)}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                با موجودی کیف پول می‌توانید نوبت، مشاوره و آزمایش را سریع‌تر پرداخت کنید.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 tabular-nums">
                مجموع شارژ: {toman(topupTotal)}
              </Badge>
              <Badge variant="outline" className="border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-400 tabular-nums">
                مجموع هزینه‌ها: {toman(spendTotal)}
              </Badge>
              {refundTotal > 0 && (
                <Badge variant="outline" className="border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-400 tabular-nums">
                  بازگشت وجه: {toman(refundTotal)}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        <TopupCard balance={patient?.walletBalance ?? 0} />
      </div>

      {/* stats row */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          title="مجموع شارژ"
          value={toman(topupTotal)}
          icon={TrendingUp}
          tone="emerald"
          hint="مجموع شارژ‌های کیف پول"
          loading={loading}
        />
        <StatCard
          title="مجموع هزینه‌ها"
          value={toman(spendTotal)}
          icon={TrendingDown}
          tone="rose"
          hint="پرداخت‌های نوبت، مشاوره و آزمایش"
          loading={loading}
        />
      </div>

      {/* transactions */}
      <div>
        <h2 className="mb-3 flex items-center gap-2 text-base font-bold">
          <Banknote className="size-4.5 text-primary" aria-hidden />
          تراکنش‌های من
        </h2>
        {loading || !patient ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={mine}
            loading={loading}
            searchPlaceholder="جستجو در تراکنش‌ها…"
            emptyTitle="تراکنشی ثبت نشده است"
            emptyDescription="با شارژ کیف پول یا رزرو نوبت، تراکنش‌های شما اینجا نمایش داده می‌شوند."
            exportCsvName="wallet-transactions"
            csvRows={(t) => ({
              کد: t.code,
              نوع: TRANSACTION_KIND_LABELS[t.kind],
              مبلغ_تومان: t.amount,
              جهت: isCredit(t) ? "واریز" : "برداشت",
              شرح: t.description,
              تاریخ: t.createdAtISO,
            })}
            mobileCard={(t) => (
              <div className="space-y-1.5 rounded-xl border p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold tabular-nums">{toFa(t.code)}</span>
                  <span
                    className={cn(
                      "text-sm font-bold tabular-nums",
                      isCredit(t) ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                    )}
                  >
                    {isCredit(t) ? "+" : "−"} {toman(t.amount)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">{toFa(t.description)}</p>
                <p className="text-[11px] text-muted-foreground tabular-nums">
                  {TRANSACTION_KIND_LABELS[t.kind]} • {faDateTime(t.createdAtISO)}
                </p>
              </div>
            )}
          />
        )}
      </div>
    </div>
  );
}

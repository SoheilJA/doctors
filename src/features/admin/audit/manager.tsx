"use client";

/**
 * /admin/audit — گزارش حسابرسی: شاخص‌های کلی، فهرست رویدادها (جدیدترین اول) با
 * جستجو، فیلتر نقش بازیگر و بازه تاریخ (تقویم جلالی) و خروجی CSV.
 */

import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { CalendarRange, ScrollText, UserRoundCog, UsersRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DataTable } from "@/components/shared/data-table";
import { JalaliDatePicker } from "@/components/shared/jalali-date-picker";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { useDemoLoading } from "@/components/shared/hydration-gate";
import { useAppStore } from "@/store/app-store";
import { ROLE_LABELS, type Role } from "@/lib/constants";
import { faNum } from "@/lib/fa";
import { faDateTime, todayISO } from "@/lib/jalali";
import type { AuditLogEntry } from "@/types";

const ALL = "all";

/** نقش‌های قابل فیلتر در گزارش حسابرسی */
const AUDIT_ROLES: { key: "admin" | "support"; label: string }[] = [
  { key: "admin", label: ROLE_LABELS.admin },
  { key: "support", label: ROLE_LABELS.support },
];

export function AdminAuditManager() {
  const loading = useDemoLoading();
  const auditLog = useAppStore((s) => s.auditLog);

  const [roleFilter, setRoleFilter] = useState<string>(ALL);
  const [fromISO, setFromISO] = useState<string | undefined>(undefined);
  const [toISO, setToISO] = useState<string | undefined>(undefined);

  /** جدیدترین رویداد اول */
  const sorted = useMemo(
    () =>
      [...auditLog].sort(
        (a, b) => new Date(b.atISO).getTime() - new Date(a.atISO).getTime()
      ),
    [auditLog]
  );

  const filtered = useMemo(() => {
    const start = fromISO && toISO && fromISO > toISO ? toISO : fromISO;
    const end = fromISO && toISO && fromISO > toISO ? fromISO : toISO;
    return sorted.filter((e) => {
      if (roleFilter !== ALL && e.actorRole !== roleFilter) return false;
      const day = e.atISO.slice(0, 10);
      if (start && day < start) return false;
      if (end && day > end) return false;
      return true;
    });
  }, [sorted, roleFilter, fromISO, toISO]);

  const stats = useMemo(() => {
    const today = todayISO();
    return {
      total: auditLog.length,
      today: auditLog.filter((e) => e.atISO.slice(0, 10) === today).length,
      actors: new Set(auditLog.map((e) => e.actorName)).size,
    };
  }, [auditLog]);

  const hasFilters = roleFilter !== ALL || fromISO !== undefined || toISO !== undefined;

  const columns: ColumnDef<AuditLogEntry>[] = [
    {
      accessorKey: "atISO",
      header: "زمان",
      cell: ({ row }) => (
        <span className="whitespace-nowrap text-sm tabular-nums text-muted-foreground">
          {faDateTime(row.original.atISO)}
        </span>
      ),
    },
    {
      accessorKey: "actorName",
      header: "بازیگر",
      cell: ({ row }) => (
        <div className="flex items-center gap-1.5">
          <span className="whitespace-nowrap text-sm font-medium">{row.original.actorName}</span>
          <Badge
            variant="outline"
            className={
              row.original.actorRole === "admin"
                ? "border-emerald-500/25 bg-emerald-500/12 text-[10px] text-emerald-700 dark:text-emerald-400"
                : "border-sky-500/25 bg-sky-500/12 text-[10px] text-sky-700 dark:text-sky-400"
            }
          >
            {ROLE_LABELS[row.original.actorRole as Role] ?? row.original.actorRole}
          </Badge>
        </div>
      ),
    },
    {
      accessorKey: "action",
      header: "عمل",
      cell: ({ row }) => <span className="text-sm">{row.original.action}</span>,
    },
    {
      accessorKey: "target",
      header: "هدف",
      cell: ({ row }) => (
        <p className="max-w-72 truncate text-sm text-muted-foreground" title={row.original.target}>
          {row.original.target}
        </p>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="گزارش حسابرسی"
        description={`سوابق ${faNum(stats.total)} رویداد مدیریتی — جدیدترین اول`}
        loading={loading}
      />

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3" aria-label="آمار حسابرسی">
        <StatCard title="کل رویدادها" value={faNum(stats.total)} icon={ScrollText} tone="primary" loading={loading} />
        <StatCard title="رویدادهای امروز" value={faNum(stats.today)} icon={CalendarRange} tone="amber" loading={loading} />
        <StatCard title="بازیگران یکتا" value={faNum(stats.actors)} icon={UsersRound} tone="violet" loading={loading} />
      </section>

      <DataTable
        columns={columns}
        data={filtered}
        loading={loading}
        searchPlaceholder="جستجوی عمل، هدف یا بازیگر…"
        emptyTitle="رویدادی با این فیلترها یافت نشد"
        emptyDescription="فیلترها را تغییر دهید یا بازه تاریخ را پاک کنید."
        emptyIcon={ScrollText}
        pageSize={15}
        exportCsvName="حسابرسی"
        csvRows={(e) => ({
          "زمان": faDateTime(e.atISO),
          "بازیگر": e.actorName,
          "نقش": ROLE_LABELS[e.actorRole as Role] ?? e.actorRole,
          "عمل": e.action,
          "هدف": e.target,
        })}
        toolbar={
          <div className="flex w-full flex-wrap items-center gap-2">
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="h-9 w-36" aria-label="فیلتر نقش بازیگر">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>همه نقش‌ها</SelectItem>
                {AUDIT_ROLES.map((r) => (
                  <SelectItem key={r.key} value={r.key}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-1.5">
              <JalaliDatePicker
                value={fromISO}
                onChange={setFromISO}
                placeholder="از تاریخ"
                className="h-9 w-40 text-xs"
                aria-label="از تاریخ"
              />
              <span className="text-xs text-muted-foreground">تا</span>
              <JalaliDatePicker
                value={toISO}
                onChange={setToISO}
                placeholder="تا تاریخ"
                className="h-9 w-40 text-xs"
                aria-label="تا تاریخ"
              />
            </div>
            {hasFilters && (
              <button
                type="button"
                className="text-xs text-muted-foreground hover:text-foreground hover:underline"
                onClick={() => {
                  setRoleFilter(ALL);
                  setFromISO(undefined);
                  setToISO(undefined);
                }}
              >
                پاک‌کردن فیلترها
              </button>
            )}
          </div>
        }
        mobileCard={(e) => (
          <div className="space-y-2 rounded-xl border p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{e.action}</p>
                <p className="truncate text-[11px] text-muted-foreground" title={e.target}>
                  {e.target}
                </p>
              </div>
              <Badge
                variant="outline"
                className={
                  e.actorRole === "admin"
                    ? "border-emerald-500/25 bg-emerald-500/12 text-[10px] text-emerald-700 dark:text-emerald-400"
                    : "border-sky-500/25 bg-sky-500/12 text-[10px] text-sky-700 dark:text-sky-400"
                }
              >
                {ROLE_LABELS[e.actorRole as Role] ?? e.actorRole}
              </Badge>
            </div>
            <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <UserRoundCog className="size-3.5" aria-hidden />
                {e.actorName}
              </span>
              <span className="tabular-nums">{faDateTime(e.atISO)}</span>
            </div>
          </div>
        )}
      />
    </div>
  );
}

"use client";

/**
 * /support/performance — personal stats of the logged-in support agent:
 * replies, within-SLA resolution rate, first-response time, satisfaction,
 * category mix, 30-day activity and a table of handled tickets.
 */

import { useMemo } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { CheckCircle2, Gauge, Send, Star, Timer } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import type { ChartConfig } from "@/components/ui/chart";
import { ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/shared/data-table";
import { ChartCard } from "@/components/shared/chart-card";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { RatingStars } from "@/components/shared/rating-stars";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { useDemoLoading } from "@/components/shared/hydration-gate";
import {
  TICKET_CATEGORY_LABELS,
  TICKET_PRIORITY_LABELS,
  TICKET_STATUS_LABELS,
  type TicketCategory,
} from "@/lib/constants";
import { faNum, faPercent, toFa } from "@/lib/fa";
import { eachDayISO, faDateShort, faDuration, subDaysISO, todayISO } from "@/lib/jalali";
import { computeAgentStats, faRating, useSupportPanel } from "@/features/support/shared";
import { SlaBadge } from "@/features/support/sla-badge";
import type { Ticket } from "@/types";

const categoryConfig = { count: { label: "تیکت", color: "var(--chart-2)" } } satisfies ChartConfig;
const activityConfig = { count: { label: "فعالیت", color: "var(--chart-1)" } } satisfies ChartConfig;

export function SupportPerformance() {
  const loading = useDemoLoading();
  const { tickets, agentId, agentName, agentMap } = useSupportPanel();

  const stats = useMemo(() => computeAgentStats(tickets, agentId), [tickets, agentId]);

  const byCategory = useMemo(() => {
    const keys = Object.keys(TICKET_CATEGORY_LABELS) as TicketCategory[];
    return keys.map((key) => ({
      key,
      label: TICKET_CATEGORY_LABELS[key],
      count: stats.handled.filter((t) => t.category === key).length,
    }));
  }, [stats.handled]);

  const activity = useMemo(() => {
    const today = todayISO();
    const days = eachDayISO(subDaysISO(today, 29), today);
    const counts = new Map<string, number>(days.map((d) => [d, 0]));
    for (const t of stats.handled) {
      const touched = new Set<string>();
      for (const m of t.messages) {
        if (m.senderId === agentId) touched.add(m.sentAtISO.split("T")[0]);
      }
      if (t.assignedAgentId === agentId) touched.add(t.updatedAtISO.split("T")[0]);
      for (const day of touched) {
        if (counts.has(day)) counts.set(day, (counts.get(day) ?? 0) + 1);
      }
    }
    return days.map((d) => ({ label: faDateShort(d), count: counts.get(d) ?? 0 }));
  }, [stats.handled, agentId]);

  const sortedHandled = useMemo(
    () => [...stats.handled].sort((a, b) => b.updatedAtISO.localeCompare(a.updatedAtISO)),
    [stats.handled]
  );

  const columns: ColumnDef<Ticket>[] = [
    {
      accessorKey: "code",
      header: "کد",
      cell: ({ row }) => <span className="font-mono text-xs tabular-nums">{toFa(row.original.code)}</span>,
    },
    {
      accessorKey: "subject",
      header: "موضوع",
      cell: ({ row }) => (
        <span className="line-clamp-1 block max-w-56 text-sm font-medium" title={row.original.subject}>
          {row.original.subject}
        </span>
      ),
    },
    {
      accessorKey: "category",
      header: "دسته",
      cell: ({ row }) => (
        <Badge variant="outline" className="text-[11px]">
          {TICKET_CATEGORY_LABELS[row.original.category]}
        </Badge>
      ),
    },
    {
      accessorKey: "priority",
      header: "اولویت",
      cell: ({ row }) => (
        <StatusBadge status={row.original.priority} label={TICKET_PRIORITY_LABELS[row.original.priority]} withDot={false} />
      ),
    },
    {
      accessorKey: "status",
      header: "وضعیت",
      cell: ({ row }) => <StatusBadge status={row.original.status} label={TICKET_STATUS_LABELS[row.original.status]} />,
    },
    {
      id: "sla",
      header: "SLA",
      enableSorting: false,
      cell: ({ row }) => <SlaBadge ticket={row.original} />,
    },
    {
      accessorKey: "rating",
      header: "امتیاز کاربر",
      cell: ({ row }) =>
        typeof row.original.rating === "number" ? (
          <RatingStars value={row.original.rating} size={14} />
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        ),
    },
  ];

  if (!loading && stats.handled.length === 0) {
    return (
      <div className="space-y-4">
        <PageHeader title="عملکرد من" description={`آمار عملکرد ${agentName}`} loading={loading} />
        <EmptyState
          icon={Gauge}
          title="هنوز تیکتی پاسخ نداده‌اید"
          description="پس از پاسخ‌گویی یا اختصاص تیکت‌ها، آمار عملکرد شما در این صفحه نمایش داده می‌شود."
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader title="عملکرد من" description={`آمار عملکرد ${agentName} در پشتیبانی`} loading={loading} />

      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4" aria-label="شاخص‌های عملکرد">
        <StatCard
          title="پاسخ‌های من"
          value={faNum(stats.replied.length)}
          hint={`در ${faNum(stats.handled.length)} تیکت حضور دارید`}
          icon={Send}
          tone="primary"
          loading={loading}
        />
        <StatCard
          title="نرخ حل در SLA"
          value={stats.slaRatePercent !== null ? faPercent(Math.round(stats.slaRatePercent)) : "—"}
          hint={`${faNum(stats.withinSlaCount)} از ${faNum(stats.closedMine.length)} تیکت بسته‌شده`}
          icon={CheckCircle2}
          tone="emerald"
          loading={loading}
        />
        <StatCard
          title="میانگین اولین پاسخ من"
          value={stats.avgFirstResponseMin !== null ? faDuration(Math.round(stats.avgFirstResponseMin)) : "—"}
          hint="از ثبت تیکت تا اولین پاسخ شما"
          icon={Timer}
          tone="sky"
          loading={loading}
        />
        <StatCard
          title="رضایت کاربران من"
          value={stats.satisfaction !== null ? `${faRating(stats.satisfaction)} از ۵` : "—"}
          hint={`${faNum(stats.ratedTickets.length)} تیکت امتیازدار`}
          icon={Star}
          tone="amber"
          loading={loading}
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-2" aria-label="نمودارهای عملکرد">
        <ChartCard title="تیکت‌های من به تفکیک دسته" description="تیکت‌های پاسخ‌داده یا اختصاص‌یافته" config={categoryConfig} loading={loading}>
          <BarChart data={byCategory} margin={{ top: 8, left: 0, right: 8 }}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} reversed />
            <YAxis tickLine={false} axisLine={false} width={28} allowDecimals={false} tickFormatter={(v) => faNum(Number(v))} />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  labelFormatter={(l) => String(l)}
                  formatter={(v) => [`${faNum(Number(v))} تیکت`, "تعداد"]}
                />
              }
            />
            <Bar dataKey="count" fill="var(--color-count)" radius={6} />
          </BarChart>
        </ChartCard>

        <ChartCard title="فعالیت ۳۰ روز گذشته" description="تیکت‌هایی که در آن‌ها پاسخ داده‌اید یا به شما اختصاص دارند" config={activityConfig} loading={loading}>
          <AreaChart data={activity} margin={{ top: 8, left: 0, right: 8 }}>
            <defs>
              <linearGradient id="activityFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-count)" stopOpacity={0.35} />
                <stop offset="95%" stopColor="var(--color-count)" stopOpacity={0.03} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} interval={4} reversed />
            <YAxis tickLine={false} axisLine={false} width={28} allowDecimals={false} tickFormatter={(v) => faNum(Number(v))} />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  labelFormatter={(l) => String(l)}
                  formatter={(v) => [`${faNum(Number(v))} تیکت`, "فعالیت"]}
                />
              }
            />
            <Area dataKey="count" type="monotone" stroke="var(--color-count)" strokeWidth={2.2} fill="url(#activityFill)" />
          </AreaChart>
        </ChartCard>
      </section>

      <DataTable
        columns={columns}
        data={sortedHandled}
        searchable
        searchPlaceholder="جستجوی موضوع یا کد…"
        loading={loading}
        emptyTitle="تیکتی برای شما ثبت نشده است"
        emptyDescription="تیکت‌هایی که به شما اختصاص می‌گیرید یا در آن‌ها پاسخ می‌دهید اینجا نمایش داده می‌شوند."
        emptyIcon={Gauge}
        exportCsvName="تیکت‌های من"
        csvRows={(t) => ({
          کد: t.code,
          موضوع: t.subject,
          دسته: TICKET_CATEGORY_LABELS[t.category],
          اولویت: TICKET_PRIORITY_LABELS[t.priority],
          وضعیت: TICKET_STATUS_LABELS[t.status],
          "عامل مسئول": t.assignedAgentId ? agentMap.get(t.assignedAgentId)?.name ?? "—" : "اختصاص‌نیافته",
          امتیاز: typeof t.rating === "number" ? toFa(t.rating.toFixed(1)) : "—",
        })}
        mobileCard={(t) => (
          <div className="space-y-2 rounded-xl border p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-[11px] tabular-nums text-muted-foreground">{toFa(t.code)}</span>
              <StatusBadge status={t.status} label={TICKET_STATUS_LABELS[t.status]} />
            </div>
            <p className="text-sm font-medium">{t.subject}</p>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <StatusBadge status={t.priority} label={TICKET_PRIORITY_LABELS[t.priority]} withDot={false} />
                <Badge variant="outline" className="text-[10px]">
                  {TICKET_CATEGORY_LABELS[t.category]}
                </Badge>
              </div>
              {typeof t.rating === "number" ? <RatingStars value={t.rating} size={13} /> : <span className="text-xs text-muted-foreground">—</span>}
            </div>
          </div>
        )}
      />
    </div>
  );
}

"use client";

/**
 * /support — Support dashboard: KPIs, ticket charts, SLA-overdue watchlist
 * and the latest tickets (all from the seeded Zustand store).
 */

import { useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlarmClock,
  CheckCheck,
  CheckCircle2,
  ChevronLeft,
  Inbox,
  Star,
  Timer,
  TimerOff,
} from "lucide-react";
import type { ChartConfig } from "@/components/ui/chart";
import { ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ChartCard } from "@/components/shared/chart-card";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { useDemoLoading } from "@/components/shared/hydration-gate";
import {
  TICKET_CATEGORY_LABELS,
  TICKET_PRIORITY_LABELS,
  TICKET_STATUS_LABELS,
  TICKET_STATUS_ORDER,
  type TicketCategory,
  type TicketPriority,
  type TicketStatus,
} from "@/lib/constants";
import { faNum, toFa } from "@/lib/fa";
import { eachDayISO, faDateShort, faDuration, faFromNow, subDaysISO, todayISO } from "@/lib/jalali";
import { computeSla, slaOverdueLabel } from "@/features/support/sla";
import { SlaBadge } from "@/features/support/sla-badge";
import { faRating, useSupportPanel } from "@/features/support/shared";

/* status/priority chart colors aligned with the badge palette */
const STATUS_CHART_COLORS: Record<TicketStatus, string> = {
  open: "oklch(0.685 0.169 237.323)",
  "in-progress": "oklch(0.769 0.188 70.08)",
  "awaiting-user": "oklch(0.606 0.25 292.717)",
  answered: "oklch(0.696 0.17 162.48)",
  closed: "oklch(0.554 0.046 257.417)",
};

const PRIORITY_CHART_COLORS: Record<TicketPriority, string> = {
  urgent: "oklch(0.645 0.246 16.439)",
  high: "oklch(0.769 0.188 70.08)",
  medium: "oklch(0.685 0.169 237.323)",
  low: "oklch(0.554 0.046 257.417)",
};

const dailyConfig = { count: { label: "تیکت", color: "var(--chart-1)" } } satisfies ChartConfig;
const categoryConfig = { count: { label: "تیکت", color: "var(--chart-2)" } } satisfies ChartConfig;
const statusConfig = {
  open: { label: TICKET_STATUS_LABELS.open, color: STATUS_CHART_COLORS.open },
  "in-progress": { label: TICKET_STATUS_LABELS["in-progress"], color: STATUS_CHART_COLORS["in-progress"] },
  "awaiting-user": { label: TICKET_STATUS_LABELS["awaiting-user"], color: STATUS_CHART_COLORS["awaiting-user"] },
  answered: { label: TICKET_STATUS_LABELS.answered, color: STATUS_CHART_COLORS.answered },
  closed: { label: TICKET_STATUS_LABELS.closed, color: STATUS_CHART_COLORS.closed },
} satisfies ChartConfig;
const priorityConfig = {
  urgent: { label: TICKET_PRIORITY_LABELS.urgent, color: PRIORITY_CHART_COLORS.urgent },
  high: { label: TICKET_PRIORITY_LABELS.high, color: PRIORITY_CHART_COLORS.high },
  medium: { label: TICKET_PRIORITY_LABELS.medium, color: PRIORITY_CHART_COLORS.medium },
  low: { label: TICKET_PRIORITY_LABELS.low, color: PRIORITY_CHART_COLORS.low },
} satisfies ChartConfig;

export function SupportDashboard() {
  const loading = useDemoLoading();
  const router = useRouter();
  const { tickets } = useSupportPanel();

  /* ------------------------------- stats ------------------------------- */

  const stats = useMemo(() => {
    const today = todayISO();
    const open = tickets.filter((t) => t.status === "open" || t.status === "in-progress" || t.status === "awaiting-user");
    const answered = tickets.filter((t) => t.status === "answered");
    const solvedToday = tickets.filter((t) => t.status === "closed" && t.resolvedAtISO?.split("T")[0] === today);

    const firstResponseMinutes = tickets
      .filter((t) => t.firstResponseAtISO)
      .map((t) => (new Date(t.firstResponseAtISO as string).getTime() - new Date(t.createdAtISO).getTime()) / 60_000)
      .filter((m) => m >= 0);
    const avgFirstResponseMin =
      firstResponseMinutes.length > 0
        ? firstResponseMinutes.reduce((a, b) => a + b, 0) / firstResponseMinutes.length
        : null;

    const resolutionMinutes = tickets
      .filter((t) => t.status === "closed" && t.resolvedAtISO)
      .map((t) => (new Date(t.resolvedAtISO as string).getTime() - new Date(t.createdAtISO).getTime()) / 60_000)
      .filter((m) => m >= 0);
    const avgResolutionMin =
      resolutionMinutes.length > 0 ? resolutionMinutes.reduce((a, b) => a + b, 0) / resolutionMinutes.length : null;

    const rated = tickets.filter((t) => typeof t.rating === "number");
    const satisfaction =
      rated.length > 0 ? rated.reduce((sum, t) => sum + (t.rating as number), 0) / rated.length : null;

    return {
      openCount: open.length,
      answeredCount: answered.length,
      solvedTodayCount: solvedToday.length,
      avgFirstResponseMin,
      avgResolutionMin,
      satisfaction,
    };
  }, [tickets]);

  /* ------------------------------- charts ------------------------------- */

  const daily = useMemo(() => {
    const today = todayISO();
    const days = eachDayISO(subDaysISO(today, 29), today);
    const counts = new Map<string, number>(days.map((d) => [d, 0]));
    for (const t of tickets) {
      const day = t.createdAtISO.split("T")[0];
      if (counts.has(day)) counts.set(day, (counts.get(day) ?? 0) + 1);
    }
    return days.map((d) => ({ label: faDateShort(d), count: counts.get(d) ?? 0 }));
  }, [tickets]);

  const byCategory = useMemo(() => {
    const keys = Object.keys(TICKET_CATEGORY_LABELS) as TicketCategory[];
    return keys.map((key) => ({
      key,
      label: TICKET_CATEGORY_LABELS[key],
      count: tickets.filter((t) => t.category === key).length,
    }));
  }, [tickets]);

  const byStatus = useMemo(
    () =>
      TICKET_STATUS_ORDER.map((key) => ({
        key,
        label: TICKET_STATUS_LABELS[key],
        value: tickets.filter((t) => t.status === key).length,
      })),
    [tickets]
  );

  const byPriority = useMemo(() => {
    const keys = Object.keys(TICKET_PRIORITY_LABELS) as TicketPriority[];
    return keys.map((key) => ({
      key,
      label: TICKET_PRIORITY_LABELS[key],
      count: tickets.filter((t) => t.priority === key).length,
    }));
  }, [tickets]);

  /* ---------------------------- SLA + latest ---------------------------- */

  const overdue = useMemo(
    () =>
      tickets
        .map((t) => ({ ticket: t, sla: computeSla(t) }))
        .filter((x) => x.sla.overdue)
        .sort((a, b) => a.sla.remainingMs - b.sla.remainingMs),
    [tickets]
  );

  const latest = useMemo(
    () => [...tickets].sort((a, b) => b.updatedAtISO.localeCompare(a.updatedAtISO)).slice(0, 5),
    [tickets]
  );

  return (
    <div className="space-y-4">
      <PageHeader
        title="داشبورد پشتیبانی"
        description="نگاه کلی به تیکت‌ها، وضعیت SLA و رضایت کاربران"
        loading={loading}
        actions={
          <Button size="sm" variant="outline" onClick={() => router.push("/support/tickets")}>
            <Inbox className="size-4" aria-hidden />
            صندوق تیکت‌ها
          </Button>
        }
      />

      {/* KPI row */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6" aria-label="شاخص‌های پشتیبانی">
        <StatCard
          title="تیکت‌های باز"
          value={faNum(stats.openCount)}
          hint="باز، در حال بررسی و در انتظار کاربر"
          icon={Inbox}
          tone="primary"
          loading={loading}
          onClick={() => router.push("/support/tickets")}
        />
        <StatCard
          title="پاسخ داده‌شده"
          value={faNum(stats.answeredCount)}
          hint="در انتظار تأیید کاربر"
          icon={CheckCircle2}
          tone="emerald"
          loading={loading}
          onClick={() => router.push("/support/tickets")}
        />
        <StatCard
          title="حل‌شده امروز"
          value={faNum(stats.solvedTodayCount)}
          hint="تیکت‌های بسته‌شده در امروز"
          icon={CheckCheck}
          tone="sky"
          loading={loading}
        />
        <StatCard
          title="میانگین اولین پاسخ"
          value={stats.avgFirstResponseMin !== null ? faDuration(Math.round(stats.avgFirstResponseMin)) : "—"}
          hint="از ثبت تیکت تا اولین پاسخ"
          icon={Timer}
          tone="violet"
          loading={loading}
        />
        <StatCard
          title="میانگین زمان حل"
          value={stats.avgResolutionMin !== null ? faDuration(Math.round(stats.avgResolutionMin)) : "—"}
          hint="از ثبت تا بستن تیکت"
          icon={TimerOff}
          tone="amber"
          loading={loading}
        />
        <StatCard
          title="رضایت کاربران"
          value={stats.satisfaction !== null ? `${faRating(stats.satisfaction)} از ۵` : "—"}
          hint="میانگین امتیاز تیکت‌های بسته‌شده"
          icon={Star}
          tone="rose"
          loading={loading}
        />
      </section>

      {/* charts row 1 */}
      <section className="grid gap-4 lg:grid-cols-3" aria-label="نمودار تیکت‌ها">
        <ChartCard
          title="تیکت‌های روزانه"
          description="تعداد تیکت ثبت‌شده در ۳۰ روز گذشته"
          config={dailyConfig}
          loading={loading}
          className="lg:col-span-2"
        >
          <AreaChart data={daily} margin={{ top: 8, left: 0, right: 8 }}>
            <defs>
              <linearGradient id="ticketsFill" x1="0" y1="0" x2="0" y2="1">
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
                  formatter={(v) => [`${faNum(Number(v))} تیکت`, "ثبت‌شده"]}
                />
              }
            />
            <Area dataKey="count" type="monotone" stroke="var(--color-count)" strokeWidth={2.2} fill="url(#ticketsFill)" />
          </AreaChart>
        </ChartCard>

        <ChartCard
          title="تیکت‌ها بر اساس وضعیت"
          description="سهم هر وضعیت از کل تیکت‌ها"
          config={statusConfig}
          loading={loading}
          legend={
            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 pt-1 text-xs text-muted-foreground">
              {byStatus.map((d) => (
                <span key={d.key} className="flex items-center gap-1.5">
                  <span
                    className="size-2 rounded-[2px]"
                    style={{ backgroundColor: STATUS_CHART_COLORS[d.key] }}
                    aria-hidden
                  />
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
                  formatter={(v, _n, item) => [`${faNum(Number(v))} تیکت`, String(item?.payload?.label ?? "")]}
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

      {/* charts row 2 + SLA watchlist */}
      <section className="grid gap-4 lg:grid-cols-3" aria-label="تفکیک تیکت‌ها و SLA">
        <ChartCard title="بر اساس دسته‌بندی" description="تعداد تیکت هر دسته" config={categoryConfig} loading={loading}>
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

        <ChartCard title="بر اساس اولویت" description="تعداد تیکت هر اولویت" config={priorityConfig} loading={loading}>
          <BarChart data={byPriority} margin={{ top: 8, left: 0, right: 8 }}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} reversed />
            <YAxis tickLine={false} axisLine={false} width={28} allowDecimals={false} tickFormatter={(v) => faNum(Number(v))} />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  labelFormatter={(l) => String(l)}
                  formatter={(v, _n, item) => [`${faNum(Number(v))} تیکت`, "تعداد"]}
                />
              }
            />
            <Bar dataKey="count" radius={6}>
              {byPriority.map((d) => (
                <Cell key={d.key} fill={PRIORITY_CHART_COLORS[d.key]} />
              ))}
            </Bar>
          </BarChart>
        </ChartCard>

        {/* SLA overdue watchlist */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <AlarmClock className="size-4 text-rose-500" aria-hidden />
                تیکت‌های SLA ردشده
              </CardTitle>
              {overdue.length > 0 && (
                <Badge variant="destructive" className="text-xs tabular-nums">
                  {faNum(overdue.length)} مورد
                </Badge>
              )}
            </div>
            <CardDescription className="text-xs">
              مهلت اولین پاسخ بر اساس اولویت گذشته است
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : overdue.length === 0 ? (
              <EmptyState
                icon={CheckCircle2}
                title="همه تیکت‌ها در مهلت SLA هستند"
                description="تیکتی از موعد اولین پاسخ عقب نمانده است."
                className="py-8"
              />
            ) : (
              <ul className="max-h-80 space-y-2 overflow-y-auto pe-1" aria-label="تیکت‌های خارج از مهلت SLA">
                {overdue.map(({ ticket, sla }) => (
                  <li key={ticket.id}>
                    <button
                      type="button"
                      onClick={() => router.push(`/support/tickets?focus=${ticket.id}`)}
                      className="w-full rounded-xl border border-rose-500/20 bg-rose-500/5 p-3 text-start transition-colors hover:bg-rose-500/10 focus-visible:ring-2 focus-visible:ring-ring"
                      aria-label={`تیکت ${ticket.subject} — ${slaOverdueLabel(sla.remainingMs)}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-[11px] text-muted-foreground">{toFa(ticket.code)}</span>
                        <span className="text-xs font-semibold text-rose-600 dark:text-rose-400">
                          {slaOverdueLabel(sla.remainingMs)}
                        </span>
                      </div>
                      <p className="mt-1 line-clamp-1 text-sm font-medium">{ticket.subject}</p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        <StatusBadge status={ticket.priority} label={TICKET_PRIORITY_LABELS[ticket.priority]} withDot={false} />
                        <span className="text-xs text-muted-foreground">{ticket.creatorName}</span>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>

      {/* latest tickets */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
          <div className="space-y-1">
            <CardTitle className="text-base">آخرین تیکت‌ها</CardTitle>
            <CardDescription className="text-xs">۵ تیکت با جدیدترین فعالیت</CardDescription>
          </div>
          <Button asChild size="sm" variant="ghost">
            <Link href="/support/tickets">
              مشاهده همه
              <ChevronLeft className="size-4" aria-hidden />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : latest.length === 0 ? (
            <EmptyState icon={Inbox} title="تیکتی ثبت نشده است" className="py-8" />
          ) : (
            <ul className="divide-y">
              {latest.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => router.push(`/support/tickets?focus=${t.id}`)}
                    className="flex w-full flex-wrap items-center justify-between gap-2 p-3 text-start transition-colors hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label={`تیکت ${t.subject}`}
                  >
                    <div className="min-w-0 space-y-1">
                      <p className="truncate text-sm font-medium">{t.subject}</p>
                      <p className="text-xs text-muted-foreground">
                        <span className="font-mono tabular-nums">{toFa(t.code)}</span>
                        {" • "}
                        {t.creatorName}
                        {" • "}
                        {faFromNow(t.updatedAtISO)}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <SlaBadge ticket={t} />
                      <StatusBadge status={t.status} label={TICKET_STATUS_LABELS[t.status]} />
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

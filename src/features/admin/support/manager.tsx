"use client";

/**
 * /admin/support — نمای کلی پشتیبانی برای مدیر کل: شاخص‌ها (باز/در انتظار کاربر/
 * پاسخ‌داده/بسته، میانگین اولین پاسخ، رضایت)، نمودار دسته‌ها و عملکرد عوامل،
 * فهرست همه تیکت‌ها با SLA بازمحاسبه‌شده و شیت مدیریت تیکت (واگذاری، تغییر وضعیت،
 * بستن با تأیید و پاسخ به‌عنوان کارشناس).
 */

import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  CheckCircle2,
  Clock3,
  Hourglass,
  LifeBuoy,
  Lock,
  MessageSquare,
  Send,
  Star,
  Timer,
  UserRoundCheck,
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
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ChartConfig, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { DataTable } from "@/components/shared/data-table";
import { ChartCard } from "@/components/shared/chart-card";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { TicketThread } from "@/components/shared/ticket-thread";
import { UserAvatar } from "@/components/shared/user-avatar";
import { useDemoLoading } from "@/components/shared/hydration-gate";
import { faRating, useAdminPanel } from "@/features/admin/shared";
import { useAuthStore } from "@/store/auth-store";
import { useAppStore } from "@/store/app-store";
import {
  TICKET_CATEGORY_LABELS,
  TICKET_PRIORITY_LABELS,
  TICKET_SLA_HOURS,
  TICKET_STATUS_LABELS,
  TICKET_STATUS_ORDER,
  type TicketCategory,
  type TicketPriority,
  type TicketStatus,
} from "@/lib/constants";
import { faNum, toFa } from "@/lib/fa";
import { faDateTime, faDuration, faFromNow } from "@/lib/jalali";
import type { StaffUser, Ticket } from "@/types";

const ALL = "all";

/* --------------------------- SLA محلی (بازمحاسبه) --------------------------- */

type SlaState = "ok" | "overdue" | "paused" | "done";

/** dueAt = createdAt + SLA(priority)؛ گذشته = now > dueAt و وضعیت در باز/در حال بررسی. */
function ticketSlaState(ticket: Ticket): SlaState {
  if (ticket.status === "closed" || ticket.status === "answered") return "done";
  if (ticket.status === "awaiting-user") return "paused";
  const dueAt = new Date(ticket.createdAtISO).getTime() + TICKET_SLA_HOURS[ticket.priority] * 3_600_000;
  return Date.now() > dueAt ? "overdue" : "ok";
}

function SlaPill({ ticket }: { ticket: Ticket }) {
  const state = ticketSlaState(ticket);
  if (state === "done") return <span className="text-xs text-muted-foreground">—</span>;
  if (state === "paused") {
    return (
      <Badge variant="outline" className="gap-1 border-slate-500/25 bg-slate-500/12 text-[10px] text-slate-600 dark:text-slate-400">
        <Hourglass className="size-3" aria-hidden />
        متوقف
      </Badge>
    );
  }
  if (state === "overdue") {
    return (
      <Badge variant="outline" className="gap-1 border-rose-500/25 bg-rose-500/12 text-[10px] text-rose-700 dark:text-rose-400">
        <Clock3 className="size-3" aria-hidden />
        SLA گذشته
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="gap-1 border-emerald-500/25 bg-emerald-500/12 text-[10px] text-emerald-700 dark:text-emerald-400">
      <Timer className="size-3" aria-hidden />
      در مهلت
    </Badge>
  );
}

/* ------------------------------ شیت مدیریت تیکت ------------------------------ */

interface AdminTicketSheetProps {
  ticket: Ticket | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  staff: StaffUser[];
  actorName: string;
  actorId: string;
}

function AdminTicketSheet({ ticket, open, onOpenChange, staff, actorName, actorId }: AdminTicketSheetProps) {
  const updateTicket = useAppStore((s) => s.updateTicket);
  const closeTicket = useAppStore((s) => s.closeTicket);
  const addAuditLog = useAppStore((s) => s.addAuditLog);
  const [closeConfirmOpen, setCloseConfirmOpen] = useState(false);

  if (!ticket) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full gap-0 overflow-y-auto p-0 sm:max-w-xl lg:max-w-2xl">
          <SheetHeader className="border-b bg-muted/40 px-4 py-3">
            <SheetTitle className="text-sm">تیکت یافت نشد</SheetTitle>
            <SheetDescription className="sr-only">جزئیات تیکت</SheetDescription>
          </SheetHeader>
        </SheetContent>
      </Sheet>
    );
  }

  /** عوامل فعال پشتیبانی + عامل فعلی تیکت (حتی اگر غیرفعال شده باشد) */
  const assigneeOptions: StaffUser[] = staff.filter((s) => (s.role === "support" && s.active) || s.id === ticket.assignedAgentId);
  const assignedName = ticket.assignedAgentId ? staff.find((s) => s.id === ticket.assignedAgentId)?.name : undefined;

  const changeAssignee = (value: string) => {
    if (value === "unassigned") {
      updateTicket(ticket.id, { assignedAgentId: undefined });
      addAuditLog({ actorName, actorRole: "admin", action: "برداشتن واگذاری تیکت", target: `تیکت ${ticket.code}` });
      toast.success(`اختصاص تیکت ${toFa(ticket.code)} برداشته شد`);
      return;
    }
    const agent = staff.find((s) => s.id === value);
    updateTicket(ticket.id, { assignedAgentId: value });
    addAuditLog({
      actorName,
      actorRole: "admin",
      action: "واگذاری تیکت به عامل",
      target: `تیکت ${ticket.code} — ${agent?.name ?? value}`,
    });
    toast.success(`تیکت ${toFa(ticket.code)} به ${agent?.name ?? "عامل"} واگذار شد`);
  };

  const changeStatus = (status: TicketStatus) => {
    updateTicket(ticket.id, { status });
    addAuditLog({
      actorName,
      actorRole: "admin",
      action: "تغییر وضعیت تیکت",
      target: `تیکت ${ticket.code} — ${TICKET_STATUS_LABELS[status]}`,
    });
    toast.success(`وضعیت تیکت ${toFa(ticket.code)} تغییر کرد`, {
      description: `وضعیت جدید: ${TICKET_STATUS_LABELS[status]}`,
    });
  };

  const confirmClose = () => {
    closeTicket(ticket.id, actorName);
    addAuditLog({ actorName, actorRole: "admin", action: "بستن تیکت", target: `تیکت ${ticket.code}` });
    setCloseConfirmOpen(false);
    toast.success(`تیکت ${toFa(ticket.code)} بسته شد`, { description: "کاربر دیگر نمی‌تواند در این تیکت پاسخ دهد." });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full gap-0 overflow-y-auto p-0 sm:max-w-xl lg:max-w-2xl">
        <SheetHeader className="space-y-2.5 border-b bg-muted/40 px-4 py-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0 space-y-1">
              <SheetTitle className="text-base leading-snug">{ticket.subject}</SheetTitle>
              <p className="text-xs text-muted-foreground">
                <span className="font-mono tabular-nums">{toFa(ticket.code)}</span>
                {" • "}
                ایجاد: {faDateTime(ticket.createdAtISO)}
              </p>
            </div>
            <SlaPill ticket={ticket} />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <UserAvatar name={ticket.creatorName} hue={ticket.creatorRole === "patient" ? 210 : 150} size="sm" />
            <div className="leading-tight">
              <p className="text-sm font-medium">{ticket.creatorName}</p>
              <p className="text-xs text-muted-foreground">{ticket.creatorRole === "patient" ? "بیمار" : "پزشک"}</p>
            </div>
            <Badge variant="outline" className="text-xs">{TICKET_CATEGORY_LABELS[ticket.category]}</Badge>
            <StatusBadge status={ticket.priority} label={TICKET_PRIORITY_LABELS[ticket.priority]} withDot={false} />
            <StatusBadge status={ticket.status} label={TICKET_STATUS_LABELS[ticket.status]} />
          </div>
        </SheetHeader>

        <div className="space-y-4 p-4">
          {/* کنترل‌های مدیریتی */}
          <Card>
            <CardContent className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">واگذاری به عامل</Label>
                <Select value={ticket.assignedAgentId ?? "unassigned"} onValueChange={changeAssignee}>
                  <SelectTrigger size="sm" className="w-full" aria-label="واگذاری تیکت به عامل">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">اختصاص‌نیافته</SelectItem>
                    {assigneeOptions.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">تغییر وضعیت</Label>
                <Select value={ticket.status} onValueChange={(v) => changeStatus(v as TicketStatus)}>
                  <SelectTrigger size="sm" className="w-full" aria-label="تغییر وضعیت تیکت">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TICKET_STATUS_ORDER.map((s) => (
                      <SelectItem key={s} value={s}>
                        {TICKET_STATUS_LABELS[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {ticket.status !== "closed" ? (
                <Button variant="destructive" size="sm" className="w-full sm:w-auto" onClick={() => setCloseConfirmOpen(true)}>
                  <Lock className="size-4" aria-hidden />
                  بستن تیکت
                </Button>
              ) : (
                <p className="self-center text-xs text-muted-foreground">
                  عامل: {assignedName ?? "اختصاص‌نیافته"} — این تیکت بسته شده است.
                </p>
              )}
            </CardContent>
          </Card>

          {/* گفتگو + پاسخ به‌عنوان کارشناس (stf-0001) */}
          <TicketThread
            ticket={ticket}
            perspective="agent"
            senderId={actorId}
            senderRole="admin"
            senderName={actorName}
          />
        </div>

        <AlertDialog open={closeConfirmOpen} onOpenChange={setCloseConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>تیکت بسته شود؟</AlertDialogTitle>
              <AlertDialogDescription>
                تیکت {toFa(ticket.code)} بسته می‌شود و کاربر دیگر نمی‌تواند پاسخ دهد. در صورت نیاز، بازگشایی ممکن
                است.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>انصراف</AlertDialogCancel>
              <AlertDialogAction onClick={confirmClose}>بستن تیکت</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </SheetContent>
    </Sheet>
  );
}

/* -------------------------------- صفحه اصلی -------------------------------- */

export function AdminSupportManager() {
  const loading = useDemoLoading();
  const panel = useAdminPanel();
  const staff = useAppStore((s) => s.staff);
  const session = useAuthStore((s) => s.session);
  const actorId = session?.userId ?? "stf-0001";

  const [statusFilter, setStatusFilter] = useState<string>(ALL);
  const [priorityFilter, setPriorityFilter] = useState<string>(ALL);
  const [agentFilter, setAgentFilter] = useState<string>(ALL);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const staffMap = useMemo(() => new Map(staff.map((s) => [s.id, s])), [staff]);

  const filtered = useMemo(
    () =>
      panel.tickets.filter((t) => {
        if (statusFilter !== ALL && t.status !== statusFilter) return false;
        if (priorityFilter !== ALL && t.priority !== priorityFilter) return false;
        if (agentFilter !== ALL) {
          if (agentFilter === "unassigned" && t.assignedAgentId) return false;
          if (agentFilter !== "unassigned" && t.assignedAgentId !== agentFilter) return false;
        }
        return true;
      }),
    [panel.tickets, statusFilter, priorityFilter, agentFilter]
  );

  const stats = useMemo(() => {
    const open = panel.tickets.filter((t) => t.status === "open").length;
    const awaiting = panel.tickets.filter((t) => t.status === "awaiting-user").length;
    const answered = panel.tickets.filter((t) => t.status === "answered").length;
    const closed = panel.tickets.filter((t) => t.status === "closed").length;
    const responded = panel.tickets.filter((t) => t.firstResponseAtISO);
    const avgFirstResponseMin = responded.length
      ? responded.reduce(
          (sum, t) =>
            sum + (new Date(t.firstResponseAtISO as string).getTime() - new Date(t.createdAtISO).getTime()) / 60_000,
          0
        ) / responded.length
      : null;
    const rated = panel.tickets.filter((t) => typeof t.rating === "number");
    const csat = rated.length ? rated.reduce((sum, t) => sum + (t.rating as number), 0) / rated.length : null;
    return { open, awaiting, answered, closed, avgFirstResponseMin, csat, ratedCount: rated.length };
  }, [panel.tickets]);

  /** تیکت‌ها به تفکیک دسته */
  const byCategory = useMemo(
    () =>
      (Object.keys(TICKET_CATEGORY_LABELS) as TicketCategory[]).map((c) => ({
        key: c,
        label: TICKET_CATEGORY_LABELS[c],
        count: panel.tickets.filter((t) => t.category === c).length,
      })),
    [panel.tickets]
  );

  /** عملکرد عوامل پشتیبانی: تیکت‌های واگذارشده یا پاسخ‌داده‌شده توسط هر عامل */
  const agentPerformance = useMemo(
    () =>
      staff
        .filter((s) => s.role === "support")
        .map((s) => ({
          name: s.name,
          handled: panel.tickets.filter(
            (t) => t.assignedAgentId === s.id || t.messages.some((m) => m.senderId === s.id)
          ).length,
        }))
        .sort((a, b) => b.handled - a.handled),
    [staff, panel.tickets]
  );

  const selectedTicket = useMemo(
    () => panel.tickets.find((t) => t.id === selectedId) ?? null,
    [panel.tickets, selectedId]
  );

  const columns: ColumnDef<Ticket>[] = [
    {
      accessorKey: "code",
      header: "کد",
      cell: ({ row }) => (
        <span dir="ltr" className="font-mono text-sm font-semibold tabular-nums">
          {toFa(row.original.code)}
        </span>
      ),
    },
    {
      accessorKey: "subject",
      header: "موضوع",
      cell: ({ row }) => (
        <div className="min-w-0">
          <p className="max-w-56 truncate text-sm font-medium">{row.original.subject}</p>
          <p className="text-[11px] text-muted-foreground">{TICKET_CATEGORY_LABELS[row.original.category]}</p>
        </div>
      ),
    },
    {
      id: "creator",
      header: "درخواست‌کننده",
      cell: ({ row }) => (
        <div className="flex items-center gap-1.5">
          <span className="text-sm">{row.original.creatorName}</span>
          <Badge variant="secondary" className="text-[10px]">
            {row.original.creatorRole === "patient" ? "بیمار" : "پزشک"}
          </Badge>
        </div>
      ),
    },
    {
      accessorKey: "status",
      header: "وضعیت",
      cell: ({ row }) => <StatusBadge status={row.original.status} label={TICKET_STATUS_LABELS[row.original.status]} />,
    },
    {
      accessorKey: "priority",
      header: "اولویت",
      cell: ({ row }) => (
        <StatusBadge status={row.original.priority} label={TICKET_PRIORITY_LABELS[row.original.priority]} withDot={false} />
      ),
    },
    {
      id: "agent",
      header: "عامل",
      cell: ({ row }) =>
        row.original.assignedAgentId ? (
          <span className="text-sm text-muted-foreground">
            {staffMap.get(row.original.assignedAgentId)?.name ?? "—"}
          </span>
        ) : (
          <Badge variant="outline" className="text-[10px] text-muted-foreground">اختصاص‌نیافته</Badge>
        ),
    },
    {
      id: "sla",
      header: "SLA",
      cell: ({ row }) => <SlaPill ticket={row.original} />,
    },
    {
      accessorKey: "createdAtISO",
      header: "تاریخ",
      cell: ({ row }) => (
        <span className="whitespace-nowrap text-sm text-muted-foreground">{faFromNow(row.original.createdAtISO)}</span>
      ),
    },
  ];

  const categoryConfig = { count: { label: "تعداد تیکت", color: "var(--chart-1)" } } satisfies ChartConfig;
  const agentConfig = { handled: { label: "تیکت رسیدگی‌شده", color: "var(--chart-2)" } } satisfies ChartConfig;

  const hasFilters = statusFilter !== ALL || priorityFilter !== ALL || agentFilter !== ALL;

  return (
    <div className="space-y-6">
      <PageHeader
        title="پشتیبانی"
        description={`نمای کلی ${faNum(panel.tickets.length)} تیکت پشتیبانی — واگذاری، تغییر وضعیت و پاسخ‌گویی به‌عنوان مدیر`}
        loading={loading}
      />

      <section className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6" aria-label="شاخص‌های پشتیبانی">
        <StatCard title="تیکت‌های باز" value={faNum(stats.open)} icon={LifeBuoy} tone="sky" loading={loading} />
        <StatCard title="در انتظار پاسخ کاربر" value={faNum(stats.awaiting)} icon={Hourglass} tone="violet" loading={loading} />
        <StatCard title="پاسخ داده‌شده" value={faNum(stats.answered)} icon={MessageSquare} tone="emerald" loading={loading} />
        <StatCard title="بسته‌شده" value={faNum(stats.closed)} icon={CheckCircle2} tone="primary" loading={loading} />
        <StatCard
          title="میانگین اولین پاسخ"
          value={stats.avgFirstResponseMin !== null ? faDuration(Math.round(stats.avgFirstResponseMin)) : "—"}
          hint="از ثبت تیکت تا اولین پاسخ"
          icon={Timer}
          tone="amber"
          loading={loading}
        />
        <StatCard
          title="رضایت کاربران"
          value={stats.csat !== null ? `${faRating(stats.csat)} از ۵` : "—"}
          hint={stats.csat !== null ? `${faNum(stats.ratedCount)} تیکت امتیازدار` : "بدون امتیاز"}
          icon={Star}
          tone="rose"
          loading={loading}
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-2" aria-label="نمودارهای پشتیبانی">
        <ChartCard title="تیکت‌ها به تفکیک دسته" description="تعداد تیکت هر دسته" config={categoryConfig} loading={loading}>
          <BarChart data={byCategory} margin={{ top: 8, left: 0, right: 8 }}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} reversed tick={{ fontSize: 10 }} />
            <YAxis tickLine={false} axisLine={false} width={32} allowDecimals={false} tickFormatter={(v) => toFa(Number(v))} />
            <ChartTooltip
              content={
                <ChartTooltipContent labelFormatter={(l) => String(l)} formatter={(v) => [`${faNum(Number(v))} تیکت`, "تعداد"]} />
              }
            />
            <Bar dataKey="count" fill="var(--color-count)" radius={6} maxBarSize={40} />
          </BarChart>
        </ChartCard>

        <ChartCard
          title="عملکرد عوامل پشتیبانی"
          description="تیکت‌های واگذارشده یا پاسخ‌داده‌شده توسط هر عامل"
          config={agentConfig}
          loading={loading}
        >
          <BarChart data={agentPerformance} margin={{ top: 8, left: 0, right: 8 }}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={8} reversed tick={{ fontSize: 10 }} />
            <YAxis tickLine={false} axisLine={false} width={32} allowDecimals={false} tickFormatter={(v) => toFa(Number(v))} />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  labelFormatter={(l) => String(l)}
                  formatter={(v) => [`${faNum(Number(v))} تیکت`, "رسیدگی‌شده"]}
                />
              }
            />
            <Bar dataKey="handled" fill="var(--color-handled)" radius={6} maxBarSize={40} />
          </BarChart>
        </ChartCard>
      </section>

      <DataTable
        columns={columns}
        data={filtered}
        loading={loading}
        searchPlaceholder="جستجوی کد، موضوع یا درخواست‌کننده…"
        emptyTitle="تیکتی با این فیلترها یافت نشد"
        emptyDescription="فیلترها را تغییر دهید."
        emptyIcon={LifeBuoy}
        onRowClick={(t) => setSelectedId(t.id)}
        exportCsvName="تیکت‌های پشتیبانی"
        csvRows={(t) => ({
          "کد": t.code,
          "موضوع": t.subject,
          "درخواست‌کننده": t.creatorName,
          "نقش درخواست‌کننده": t.creatorRole === "patient" ? "بیمار" : "پزشک",
          "دسته": TICKET_CATEGORY_LABELS[t.category],
          "اولویت": TICKET_PRIORITY_LABELS[t.priority],
          "وضعیت": TICKET_STATUS_LABELS[t.status],
          "عامل": t.assignedAgentId ? staffMap.get(t.assignedAgentId)?.name ?? "" : "اختصاص‌نیافته",
          "ایجاد": faDateTime(t.createdAtISO),
        })}
        toolbar={
          <div className="flex w-full flex-wrap items-center gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 w-40" aria-label="فیلتر وضعیت">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>همه وضعیت‌ها</SelectItem>
                {TICKET_STATUS_ORDER.map((s) => (
                  <SelectItem key={s} value={s}>
                    {TICKET_STATUS_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="h-9 w-32" aria-label="فیلتر اولویت">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>همه اولویت‌ها</SelectItem>
                {(Object.keys(TICKET_PRIORITY_LABELS) as TicketPriority[]).map((p) => (
                  <SelectItem key={p} value={p}>
                    {TICKET_PRIORITY_LABELS[p]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={agentFilter} onValueChange={setAgentFilter}>
              <SelectTrigger className="h-9 w-40" aria-label="فیلتر عامل">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>همه عامل‌ها</SelectItem>
                <SelectItem value="unassigned">اختصاص‌نیافته</SelectItem>
                {staff.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {hasFilters && (
              <Button
                variant="ghost"
                size="sm"
                className="h-9"
                onClick={() => {
                  setStatusFilter(ALL);
                  setPriorityFilter(ALL);
                  setAgentFilter(ALL);
                }}
              >
                پاک‌کردن فیلترها
              </Button>
            )}
          </div>
        }
        mobileCard={(t) => (
          <div className="space-y-2 rounded-xl border p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{t.subject}</p>
                <p className="truncate text-[11px] text-muted-foreground">
                  <span className="font-mono tabular-nums">{toFa(t.code)}</span> • {t.creatorName} (
                  {t.creatorRole === "patient" ? "بیمار" : "پزشک"}) • {faFromNow(t.createdAtISO)}
                </p>
              </div>
              <SlaPill ticket={t} />
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <StatusBadge status={t.status} label={TICKET_STATUS_LABELS[t.status]} />
              <StatusBadge status={t.priority} label={TICKET_PRIORITY_LABELS[t.priority]} withDot={false} />
              <Badge variant="outline" className="text-[10px]">
                {t.assignedAgentId ? staffMap.get(t.assignedAgentId)?.name ?? "—" : "اختصاص‌نیافته"}
              </Badge>
            </div>
            <Button variant="outline" size="sm" className="h-7 w-full text-xs" onClick={() => setSelectedId(t.id)}>
              <Send className="size-3.5" aria-hidden />
              مدیریت تیکت
            </Button>
          </div>
        )}
      />

      <AdminTicketSheet
        ticket={selectedTicket}
        open={selectedTicket !== null}
        onOpenChange={(v) => !v && setSelectedId(null)}
        staff={staff}
        actorName={panel.actorName}
        actorId={actorId}
      />
    </div>
  );
}

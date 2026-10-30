"use client";

/**
 * /support/tickets — the ticket inbox: filters, table/kanban views,
 * bulk actions, CSV export and the agent-side detail sheet.
 * The `?focus=<ticketId>` query param (used by the dashboard SLA list)
 * opens that ticket's detail sheet once.
 */

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import {
  CheckCircle2,
  Inbox,
  Lock,
  Table2,
  UserPlus,
  Columns3,
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
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { DataTable } from "@/components/shared/data-table";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { useDemoLoading } from "@/components/shared/hydration-gate";
import { useAppStore } from "@/store/app-store";
import {
  TICKET_CATEGORY_LABELS,
  TICKET_PRIORITY_LABELS,
  TICKET_STATUS_LABELS,
  type TicketStatus,
} from "@/lib/constants";
import { faNum, toFa } from "@/lib/fa";
import { faDateTime, faFromNow } from "@/lib/jalali";
import { useSupportPanel } from "@/features/support/shared";
import { SlaBadge } from "@/features/support/sla-badge";
import { TicketDetailSheet } from "@/features/support/tickets/detail-sheet";
import { KanbanBoard } from "@/features/support/tickets/kanban";
import {
  countActiveFilters,
  EMPTY_TICKET_FILTERS,
  TicketFiltersBar,
  type TicketFilters,
} from "@/features/support/tickets/filters";
import type { Ticket } from "@/types";

type InboxView = "table" | "kanban";

export function SupportTicketsInbox() {
  const loading = useDemoLoading();
  const searchParams = useSearchParams();
  const { tickets, agentId, agentName, activeAgents, agentMap } = useSupportPanel();
  const updateTicket = useAppStore((s) => s.updateTicket);
  const closeTicket = useAppStore((s) => s.closeTicket);

  const [view, setView] = useState<InboxView>("table");
  const [filters, setFilters] = useState<TicketFilters>(EMPTY_TICKET_FILTERS);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [manualId, setManualId] = useState<string | null>(null);
  const [focusSheetClosed, setFocusSheetClosed] = useState(false);
  const [bulkCloseOpen, setBulkCloseOpen] = useState(false);

  /* the `?focus=<id>` param (from the dashboard SLA list) opens that ticket's
     detail sheet; everything is derived — no effects needed. Once the user
     closes the sheet it stays closed until a row/card is clicked. */
  const focusParam = searchParams.get("focus");
  const focusTicketId = focusParam && tickets.some((t) => t.id === focusParam) ? focusParam : null;
  const detailId = manualId ?? focusTicketId;
  const sheetOpen = manualId !== null || (focusTicketId !== null && !focusSheetClosed);

  const activeCount = countActiveFilters(filters);
  const patchFilters = (patch: Partial<TicketFilters>) => setFilters((f) => ({ ...f, ...patch }));
  const resetFilters = () => setFilters(EMPTY_TICKET_FILTERS);

  /* ------------------------------ filtering ------------------------------ */

  const filtered = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    return tickets.filter((t) => {
      if (q) {
        const haystack = `${t.subject} ${t.code} ${t.creatorName}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      if (filters.status !== "all" && t.status !== filters.status) return false;
      if (filters.priority !== "all" && t.priority !== filters.priority) return false;
      if (filters.category !== "all" && t.category !== filters.category) return false;
      if (filters.creatorRole !== "all" && t.creatorRole !== filters.creatorRole) return false;
      if (filters.agent === "unassigned" && t.assignedAgentId) return false;
      if (filters.agent !== "all" && filters.agent !== "unassigned" && t.assignedAgentId !== filters.agent) return false;
      const day = t.createdAtISO.split("T")[0];
      if (filters.fromISO && day < filters.fromISO) return false;
      if (filters.toISO && day > filters.toISO) return false;
      return true;
    });
  }, [tickets, filters]);

  /* ------------------------------ selection ------------------------------ */

  const selectableIds = filtered.map((t) => t.id);
  const selectedOnPage = selectableIds.filter((id) => selectedIds.has(id));
  const headerChecked: boolean | "indeterminate" =
    selectedOnPage.length === 0 ? false : selectedOnPage.length === selectableIds.length ? true : "indeterminate";

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = (checked: boolean) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const id of selectableIds) {
        if (checked) next.add(id);
        else next.delete(id);
      }
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  /* ------------------------------ actions ------------------------------ */

  const openDetail = (t: Ticket) => {
    setManualId(t.id);
  };

  const handleSheetOpenChange = (open: boolean) => {
    if (!open) {
      setManualId(null);
      setFocusSheetClosed(true);
    }
  };

  const moveTicket = (t: Ticket, status: TicketStatus) => {
    if (t.status === status) return;
    updateTicket(t.id, { status });
    toast.success(`وضعیت تیکت ${toFa(t.code)} تغییر کرد`, {
      description: `وضعیت جدید: ${TICKET_STATUS_LABELS[status]}`,
    });
  };

  const bulkAssignToMe = () => {
    const ids = [...selectedIds];
    for (const id of ids) updateTicket(id, { assignedAgentId: agentId });
    toast.success(`${faNum(ids.length)} تیکت به شما اختصاص یافت`, { description: `${agentName} به‌عنوان عامل مسئول ثبت شد.` });
    clearSelection();
  };

  const bulkMarkAnswered = () => {
    const ids = [...selectedIds];
    for (const id of ids) updateTicket(id, { status: "answered" });
    toast.success(`${faNum(ids.length)} تیکت به‌عنوان پاسخ‌داده‌شده علامت‌گذاری شد`);
    clearSelection();
  };

  const confirmBulkClose = () => {
    const ids = [...selectedIds];
    for (const id of ids) closeTicket(id, agentName);
    setBulkCloseOpen(false);
    clearSelection();
    toast.success(`${faNum(ids.length)} تیکت بسته شد`);
  };

  /* ------------------------------- columns ------------------------------- */

  const columns: ColumnDef<Ticket>[] = [
    {
      id: "select",
      enableSorting: false,
      header: () => (
        <Checkbox
          checked={headerChecked}
          onCheckedChange={(v) => toggleSelectAll(v === true)}
          aria-label="انتخاب همه تیکت‌های نمایش‌داده‌شده"
        />
      ),
      cell: ({ row }) => (
        <div className="flex justify-center" onClick={(e) => e.stopPropagation()}>
          <Checkbox
            checked={selectedIds.has(row.original.id)}
            onCheckedChange={() => toggleSelect(row.original.id)}
            aria-label={`انتخاب تیکت ${toFa(row.original.code)}`}
          />
        </div>
      ),
    },
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
      accessorKey: "creatorName",
      header: "درخواست‌کننده",
      cell: ({ row }) => (
        <div className="flex items-center gap-1.5">
          <span className="max-w-32 truncate text-sm">{row.original.creatorName}</span>
          <Badge variant="outline" className="text-[10px]">
            {row.original.creatorRole === "patient" ? "بیمار" : "پزشک"}
          </Badge>
        </div>
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
      id: "assignee",
      header: "عامل مسئول",
      cell: ({ row }) =>
        row.original.assignedAgentId ? (
          <span className="text-sm">{agentMap.get(row.original.assignedAgentId)?.name ?? "—"}</span>
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        ),
    },
    {
      accessorKey: "createdAtISO",
      header: "ایجاد",
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground" title={faDateTime(row.original.createdAtISO)}>
          {faFromNow(row.original.createdAtISO)}
        </span>
      ),
    },
    {
      id: "sla",
      header: "SLA",
      enableSorting: false,
      cell: ({ row }) => <SlaBadge ticket={row.original} />,
    },
  ];

  const detailTicket = detailId ? (tickets.find((t) => t.id === detailId) ?? null) : null;

  const resetButton = (
    <Button size="sm" variant="outline" onClick={resetFilters}>
      حذف فیلترها
    </Button>
  );

  return (
    <div className="space-y-4">
      <PageHeader
        title="صندوق تیکت‌ها"
        description="پاسخ‌گویی، اولویت‌بندی و پیگیری تیکت‌های کاربران"
        loading={loading}
      />

      <TicketFiltersBar
        filters={filters}
        onChange={patchFilters}
        onReset={resetFilters}
        activeCount={activeCount}
        agents={activeAgents}
      />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {faNum(filtered.length)} تیکت
        </p>
        <ToggleGroup
          type="single"
          variant="outline"
          value={view}
          onValueChange={(v) => {
            if (v) setView(v as InboxView);
          }}
          aria-label="نوع نمایش تیکت‌ها"
        >
          <ToggleGroupItem value="table" aria-label="نمایش جدولی">
            <Table2 className="size-4" aria-hidden />
            جدول
          </ToggleGroupItem>
          <ToggleGroupItem value="kanban" aria-label="نمایش کانبان">
            <Columns3 className="size-4" aria-hidden />
            کانبان
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {view === "table" ? (
        <DataTable
          columns={columns}
          data={filtered}
          searchable={false}
          loading={loading}
          emptyTitle="تیکتی یافت نشد"
          emptyDescription="هیچ تیکتی با فیلترهای فعلی مطابقت ندارد."
          emptyIcon={Inbox}
          emptyAction={activeCount > 0 ? resetButton : undefined}
          onRowClick={openDetail}
          exportCsvName="تیکت‌ها"
          csvRows={(t) => ({
            کد: t.code,
            موضوع: t.subject,
            درخواست‌کننده: t.creatorName,
            نقش: t.creatorRole === "patient" ? "بیمار" : "پزشک",
            دسته: TICKET_CATEGORY_LABELS[t.category],
            اولویت: TICKET_PRIORITY_LABELS[t.priority],
            وضعیت: TICKET_STATUS_LABELS[t.status],
            "عامل مسئول": t.assignedAgentId ? agentMap.get(t.assignedAgentId)?.name ?? "—" : "اختصاص‌نیافته",
            "تاریخ ایجاد": faDateTime(t.createdAtISO),
          })}
          mobileCard={(t) => (
            <div className="space-y-2 rounded-xl border p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-[11px] tabular-nums text-muted-foreground">{toFa(t.code)}</span>
                <StatusBadge status={t.status} label={TICKET_STATUS_LABELS[t.status]} />
              </div>
              <p className="text-sm font-medium">{t.subject}</p>
              <div className="flex flex-wrap items-center gap-1.5">
                <StatusBadge status={t.priority} label={TICKET_PRIORITY_LABELS[t.priority]} withDot={false} />
                <Badge variant="outline" className="text-[10px]">
                  {TICKET_CATEGORY_LABELS[t.category]}
                </Badge>
                <Badge variant="outline" className="text-[10px]">
                  {t.creatorRole === "patient" ? "بیمار" : "پزشک"}
                </Badge>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                <span className="truncate">
                  {t.creatorName} • {faFromNow(t.createdAtISO)}
                </span>
                <SlaBadge ticket={t} />
              </div>
            </div>
          )}
        />
      ) : loading ? (
        <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-64 w-full rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="تیکتی یافت نشد"
          description="هیچ تیکتی با فیلترهای فعلی مطابقت ندارد."
          action={activeCount > 0 ? resetButton : undefined}
        />
      ) : (
        <KanbanBoard tickets={filtered} onOpen={openDetail} onMove={moveTicket} />
      )}

      {/* floating bulk action bar */}
      {selectedIds.size > 0 && view === "table" && (
        <div className="pointer-events-none fixed inset-x-0 bottom-4 z-40 flex justify-center px-4">
          <div className="pointer-events-auto flex flex-wrap items-center justify-center gap-2 rounded-2xl border bg-background/95 p-2.5 shadow-xl backdrop-blur">
            <Badge variant="secondary" className="tabular-nums">
              {faNum(selectedIds.size)} مورد انتخاب شده
            </Badge>
            <Button size="sm" variant="outline" onClick={bulkAssignToMe}>
              <UserPlus className="size-4" aria-hidden />
              اختصاص به من
            </Button>
            <Button size="sm" variant="outline" onClick={bulkMarkAnswered}>
              <CheckCircle2 className="size-4" aria-hidden />
              پاسخ داده شد
            </Button>
            <Button size="sm" variant="destructive" onClick={() => setBulkCloseOpen(true)}>
              <Lock className="size-4" aria-hidden />
              بستن انتخاب‌شده‌ها
            </Button>
            <Button size="sm" variant="ghost" onClick={clearSelection}>
              لغو انتخاب
            </Button>
          </div>
        </div>
      )}

      <TicketDetailSheet ticket={detailTicket} open={sheetOpen} onOpenChange={handleSheetOpenChange} />

      {/* bulk close confirm */}
      <AlertDialog open={bulkCloseOpen} onOpenChange={setBulkCloseOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>تیکت‌های انتخاب‌شده بسته شوند؟</AlertDialogTitle>
            <AlertDialogDescription>
              {faNum(selectedIds.size)} تیکت بسته می‌شوند و کاربران دیگر نمی‌توانند در آن‌ها پاسخ دهند.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>انصراف</AlertDialogCancel>
            <AlertDialogAction onClick={confirmBulkClose}>بستن تیکت‌ها</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

"use client";

/**
 * پشتیبانی — فهرست تیکت‌های بیمار + گفتگو (TicketThread) و ثبت تیکت جدید.
 */

import { useMemo, useState } from "react";
import { LifeBuoy, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { faNum } from "@/lib/fa";
import { faFromNow } from "@/lib/jalali";
import { TICKET_CATEGORY_LABELS, TICKET_PRIORITY_LABELS, TICKET_STATUS_LABELS, type TicketCategory, type TicketPriority } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { TicketThread } from "@/components/shared/ticket-thread";
import { useDemoLoading } from "@/components/shared/hydration-gate";
import { useAppStore } from "@/store/app-store";
import { useAuthStore } from "@/store/auth-store";
import { NewTicketDialog } from "@/features/patient/support/new-ticket-dialog";
import { useIsDesktop } from "@/features/patient/helpers";

export default function PatientSupportPage() {
  const loading = useDemoLoading();
  const isDesktop = useIsDesktop();
  const session = useAuthStore((s) => s.session);
  const tickets = useAppStore((s) => s.tickets);
  const createTicket = useAppStore((s) => s.createTicket);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const mine = useMemo(
    () =>
      tickets
        .filter((t) => t.creatorId === session?.patientId)
        .sort((a, b) => b.updatedAtISO.localeCompare(a.updatedAtISO)),
    [tickets, session?.patientId]
  );

  const selected = mine.find((t) => t.id === selectedId) ?? mine[0] ?? null;

  const select = (id: string) => {
    setSelectedId(id);
    if (!isDesktop) setMobileOpen(true);
  };

  const handleNewTicket = (values: { subject: string; category: TicketCategory; priority: TicketPriority; body: string }) => {
    if (!session?.patientId) return;
    const ticket = createTicket({
      creatorId: session.patientId,
      creatorRole: "patient",
      creatorName: session.name,
      subject: values.subject,
      category: values.category,
      priority: values.priority,
      body: values.body,
    });
    setNewOpen(false);
    setSelectedId(ticket.id);
    toast.success("تیکت ثبت شد و به پشتیبان ارسال شد", {
      description: `کد پیگیری: ${ticket.code.replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)])}`,
    });
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="پشتیبانی"
        description={`${faNum(mine.length)} تیکت — پاسخ‌ها معمولاً کمتر از ۲۴ ساعت داده می‌شود.`}
        loading={loading}
        actions={
          <Button size="sm" disabled={!session?.patientId} onClick={() => setNewOpen(true)}>
            <Plus className="size-4" aria-hidden />
            ثبت تیکت جدید
          </Button>
        }
      />

      {loading ? (
        <Skeleton className="h-96 rounded-2xl" />
      ) : mine.length ? (
        <div className="grid items-start gap-4 lg:grid-cols-[320px_1fr]">
          {/* list */}
          <div className="space-y-2 lg:max-h-[70vh] lg:overflow-y-auto lg:pe-1">
            {mine.map((t) => {
              const active = selected?.id === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => select(t.id)}
                  aria-current={active ? "true" : undefined}
                  className={cn(
                    "flex w-full flex-col gap-1.5 rounded-xl border p-3 text-start transition-colors",
                    active ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                  )}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-semibold">{t.subject}</span>
                    <span className="shrink-0 text-[11px] text-muted-foreground tabular-nums">{faFromNow(t.updatedAtISO)}</span>
                  </span>
                  <span className="flex flex-wrap items-center gap-1.5">
                    <StatusBadge status={t.status} label={TICKET_STATUS_LABELS[t.status]} withDot={false} />
                    <StatusBadge status={t.priority} label={TICKET_PRIORITY_LABELS[t.priority]} withDot={false} />
                    <Badge variant="outline" className="text-[10px]">
                      {TICKET_CATEGORY_LABELS[t.category]}
                    </Badge>
                    {t.rating && (
                      <Badge variant="outline" className="border-amber-500/30 text-[10px] text-amber-700 dark:text-amber-400 tabular-nums">
                        امتیاز {faNum(t.rating)}/۵
                      </Badge>
                    )}
                  </span>
                </button>
              );
            })}
          </div>

          {/* thread (desktop) */}
          {selected && (
            <div className="hidden lg:block">
              <TicketThread
                ticket={selected}
                perspective="creator"
                senderId={session?.patientId ?? ""}
                senderRole="patient"
                senderName={session?.name ?? ""}
              />
            </div>
          )}
        </div>
      ) : (
        <EmptyState
          icon={LifeBuoy}
          title="تیکتی ثبت نکرده‌اید"
          description="هر مشکل یا سؤالی درباره نوبت‌ها، پرداخت‌ها و آزمایش‌ها دارید، برای پشتیبان بنویسید."
          action={
            <Button size="sm" onClick={() => setNewOpen(true)}>
              <Plus className="size-4" aria-hidden />
              ثبت تیکت جدید
            </Button>
          }
        />
      )}

      {/* thread (mobile dialog) */}
      <Dialog open={mobileOpen} onOpenChange={setMobileOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl lg:hidden">
          <DialogTitle className="sr-only">گفتگوی تیکت</DialogTitle>
          {selected && (
            <TicketThread
              ticket={selected}
              perspective="creator"
              senderId={session?.patientId ?? ""}
              senderRole="patient"
              senderName={session?.name ?? ""}
              className="border-0 shadow-none"
            />
          )}
        </DialogContent>
      </Dialog>

      <NewTicketDialog open={newOpen} onOpenChange={setNewOpen} onSubmit={handleNewTicket} />
    </div>
  );
}

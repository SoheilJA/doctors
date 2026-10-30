"use client";

/**
 * TicketDetailSheet — the agent-side ticket workspace: metadata header,
 * status/priority/category/assignee controls, close/reopen, the shared
 * TicketThread, workflow timeline and the user's rating.
 */

import { useState } from "react";
import { toast } from "sonner";
import {
  CheckCircle2,
  Link2,
  Lock,
  LockOpen,
  MessageSquareReply,
  PlusCircle,
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { RatingStars } from "@/components/shared/rating-stars";
import { StatusBadge } from "@/components/shared/status-badge";
import { TicketThread } from "@/components/shared/ticket-thread";
import { UserAvatar } from "@/components/shared/user-avatar";
import { useAppStore } from "@/store/app-store";
import {
  TICKET_CATEGORY_LABELS,
  TICKET_PRIORITY_LABELS,
  TICKET_STATUS_LABELS,
  TICKET_STATUS_ORDER,
  type TicketCategory,
  type TicketPriority,
  type TicketStatus,
} from "@/lib/constants";
import { toFa } from "@/lib/fa";
import { faDateTime } from "@/lib/jalali";
import {
  RELATED_ENTITY_LABELS,
  creatorHue,
  relatedEntityCode,
  useSupportPanel,
} from "@/features/support/shared";
import { SlaBadge } from "@/features/support/sla-badge";
import type { StaffUser, Ticket } from "@/types";

interface TicketDetailSheetProps {
  ticket: Ticket | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TicketDetailSheet({ ticket, open, onOpenChange }: TicketDetailSheetProps) {
  const updateTicket = useAppStore((s) => s.updateTicket);
  const closeTicket = useAppStore((s) => s.closeTicket);
  const reopenTicket = useAppStore((s) => s.reopenTicket);
  const appointments = useAppStore((s) => s.appointments);
  const labOrders = useAppStore((s) => s.labOrders);
  const consultations = useAppStore((s) => s.consultations);
  const { agentId, agentName, activeAgents, staff, patientMap, doctorMap } = useSupportPanel();
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

  /* assignee options: active agents + the currently assigned agent (even if inactive) */
  const assigneeOptions: StaffUser[] = [...activeAgents];
  if (ticket.assignedAgentId && !assigneeOptions.some((a) => a.id === ticket.assignedAgentId)) {
    const current = staff.find((s) => s.id === ticket.assignedAgentId);
    if (current) assigneeOptions.push(current);
  }

  const relatedCode = relatedEntityCode(ticket, appointments, labOrders, consultations);
  const hue = creatorHue(ticket, patientMap, doctorMap);

  const changeStatus = (status: TicketStatus) => {
    updateTicket(ticket.id, { status });
    toast.success(`وضعیت تیکت ${toFa(ticket.code)} تغییر کرد`, {
      description: `وضعیت جدید: ${TICKET_STATUS_LABELS[status]}`,
    });
  };

  const changePriority = (priority: TicketPriority) => {
    updateTicket(ticket.id, { priority });
    toast.success(`اولویت تیکت ${toFa(ticket.code)} تغییر کرد`, {
      description: `اولویت جدید: ${TICKET_PRIORITY_LABELS[priority]}`,
    });
  };

  const changeCategory = (category: TicketCategory) => {
    updateTicket(ticket.id, { category });
    toast.success(`دسته تیکت ${toFa(ticket.code)} تغییر کرد`, {
      description: `دسته جدید: ${TICKET_CATEGORY_LABELS[category]}`,
    });
  };

  const changeAssignee = (value: string) => {
    if (value === "unassigned") {
      updateTicket(ticket.id, { assignedAgentId: undefined });
      toast.success(`اختصاص تیکت ${toFa(ticket.code)} برداشته شد`);
      return;
    }
    const agent = assigneeOptions.find((a) => a.id === value);
    updateTicket(ticket.id, { assignedAgentId: value });
    toast.success(`تیکت ${toFa(ticket.code)} به ${agent?.name ?? "عامل"} اختصاص یافت`);
  };

  const confirmClose = () => {
    closeTicket(ticket.id, agentName);
    setCloseConfirmOpen(false);
    toast.success(`تیکت ${toFa(ticket.code)} بسته شد`, { description: "کاربر دیگر نمی‌تواند در این تیکت پاسخ دهد." });
  };

  const handleReopen = () => {
    reopenTicket(ticket.id);
    toast.success(`تیکت ${toFa(ticket.code)} بازگشایی شد`, { description: "وضعیت به «در حال بررسی» برگشت." });
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
            <SlaBadge ticket={ticket} />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2">
              <UserAvatar name={ticket.creatorName} hue={hue} size="sm" />
              <div className="leading-tight">
                <p className="text-sm font-medium">{ticket.creatorName}</p>
                <p className="text-xs text-muted-foreground">
                  {ticket.creatorRole === "patient" ? "بیمار" : "پزشک"}
                </p>
              </div>
            </div>
            {ticket.relatedEntityType && (
              <Badge variant="outline" className="gap-1 text-xs">
                <Link2 className="size-3" aria-hidden />
                مرتبط: {RELATED_ENTITY_LABELS[ticket.relatedEntityType]}
                {relatedCode ? ` ${toFa(relatedCode)}` : ""}
              </Badge>
            )}
            <StatusBadge status={ticket.priority} label={TICKET_PRIORITY_LABELS[ticket.priority]} withDot={false} />
            <StatusBadge status={ticket.status} label={TICKET_STATUS_LABELS[ticket.status]} />
          </div>
        </SheetHeader>

        <div className="space-y-4 p-4">
          {/* controls */}
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">وضعیت</Label>
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
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">اولویت</Label>
              <Select value={ticket.priority} onValueChange={(v) => changePriority(v as TicketPriority)}>
                <SelectTrigger size="sm" className="w-full" aria-label="تغییر اولویت تیکت">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(TICKET_PRIORITY_LABELS) as TicketPriority[]).map((p) => (
                    <SelectItem key={p} value={p}>
                      {TICKET_PRIORITY_LABELS[p]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">دسته</Label>
              <Select value={ticket.category} onValueChange={(v) => changeCategory(v as TicketCategory)}>
                <SelectTrigger size="sm" className="w-full" aria-label="تغییر دسته تیکت">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(TICKET_CATEGORY_LABELS) as TicketCategory[]).map((c) => (
                    <SelectItem key={c} value={c}>
                      {TICKET_CATEGORY_LABELS[c]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">عامل مسئول</Label>
              <Select
                value={ticket.assignedAgentId ?? "unassigned"}
                onValueChange={changeAssignee}
              >
                <SelectTrigger size="sm" className="w-full" aria-label="تغییر عامل مسئول">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">اختصاص‌نیافته</SelectItem>
                  {assigneeOptions.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name}
                      {a.id === agentId ? " (من)" : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {ticket.status !== "closed" ? (
            <Button variant="destructive" size="sm" className="w-full sm:w-auto" onClick={() => setCloseConfirmOpen(true)}>
              <Lock className="size-4" aria-hidden />
              بستن تیکت
            </Button>
          ) : (
            <Button variant="outline" size="sm" className="w-full sm:w-auto" onClick={handleReopen}>
              <LockOpen className="size-4" aria-hidden />
              بازگشایی تیکت
            </Button>
          )}

          <TicketThread
            ticket={ticket}
            perspective="agent"
            senderId={agentId}
            senderRole="support"
            senderName={agentName}
          />

          {/* timeline */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">گردش کار تیکت</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="space-y-3" aria-label="گردش کار تیکت">
                <TimelineItem
                  icon={PlusCircle}
                  label="ایجاد تیکت"
                  value={faDateTime(ticket.createdAtISO)}
                  done
                />
                <TimelineItem
                  icon={MessageSquareReply}
                  label="اولین پاسخ پشتیبانی"
                  value={ticket.firstResponseAtISO ? faDateTime(ticket.firstResponseAtISO) : "هنوز پاسخی ثبت نشده"}
                  done={Boolean(ticket.firstResponseAtISO)}
                />
                <TimelineItem
                  icon={CheckCircle2}
                  label="بستن تیکت"
                  value={ticket.resolvedAtISO ? faDateTime(ticket.resolvedAtISO) : "هنوز بسته نشده"}
                  done={Boolean(ticket.resolvedAtISO)}
                />
              </ol>

              {typeof ticket.rating === "number" && (
                <>
                  <Separator className="my-3" />
                  <div className="rounded-xl bg-emerald-500/10 p-3">
                    <p className="text-sm font-medium">بازخورد کاربر</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                      <RatingStars value={ticket.rating} />
                      {ticket.ratingComment && (
                        <span className="text-xs text-muted-foreground">«{ticket.ratingComment}»</span>
                      )}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* close confirm */}
        <AlertDialog open={closeConfirmOpen} onOpenChange={setCloseConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>تیکت بسته شود؟</AlertDialogTitle>
              <AlertDialogDescription>
                کاربر دیگر نمی‌تواند پاسخ دهد. در صورت نیاز، تیکت را می‌توانید بازگشایی کنید.
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

function TimelineItem({
  icon: Icon,
  label,
  value,
  done,
}: {
  icon: typeof PlusCircle;
  label: string;
  value: string;
  done: boolean;
}) {
  return (
    <li className="flex items-center gap-3">
      <span
        className={
          done
            ? "grid size-8 shrink-0 place-items-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
            : "grid size-8 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground"
        }
      >
        <Icon className="size-4" aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-medium leading-tight">{label}</p>
        <p className="text-xs text-muted-foreground">{value}</p>
      </div>
    </li>
  );
}

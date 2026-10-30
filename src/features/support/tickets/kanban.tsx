"use client";

/**
 * KanbanBoard — five status columns with compact ticket cards.
 * Drag & drop is intentionally replaced by a quick "move status" select.
 */

import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/shared/status-badge";
import { UserAvatar } from "@/components/shared/user-avatar";
import {
  TICKET_PRIORITY_LABELS,
  TICKET_STATUS_LABELS,
  TICKET_STATUS_ORDER,
  type TicketStatus,
} from "@/lib/constants";
import { faNum, toFa } from "@/lib/fa";
import { creatorHue, useSupportPanel } from "@/features/support/shared";
import { SlaBadge } from "@/features/support/sla-badge";
import type { Ticket } from "@/types";

interface KanbanBoardProps {
  tickets: Ticket[];
  onOpen: (ticket: Ticket) => void;
  onMove: (ticket: Ticket, status: TicketStatus) => void;
}

export function KanbanBoard({ tickets, onOpen, onMove }: KanbanBoardProps) {
  const { patientMap, doctorMap } = useSupportPanel();

  return (
    <div className="flex gap-3 overflow-x-auto pb-2" role="list" aria-label="تابلوی کانبان تیکت‌ها">
      {TICKET_STATUS_ORDER.map((status) => {
        const columnTickets = tickets.filter((t) => t.status === status);
        return (
          <section
            key={status}
            role="listitem"
            aria-label={`ستون ${TICKET_STATUS_LABELS[status]}`}
            className="flex w-64 shrink-0 flex-col gap-2 rounded-xl bg-muted/40 p-2.5 md:w-full md:max-w-72 md:flex-1"
          >
            <header className="flex items-center justify-between gap-2 px-1">
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <StatusBadge status={status} label={TICKET_STATUS_LABELS[status]} />
              </h3>
              <Badge variant="secondary" className="tabular-nums">
                {faNum(columnTickets.length)}
              </Badge>
            </header>

            <div className="space-y-2">
              {columnTickets.length === 0 && (
                <p className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">
                  تیکتی در این وضعیت نیست
                </p>
              )}
              {columnTickets.map((t) => (
                <KanbanCard
                  key={t.id}
                  ticket={t}
                  hue={creatorHue(t, patientMap, doctorMap)}
                  onOpen={onOpen}
                  onMove={onMove}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function KanbanCard({
  ticket,
  hue,
  onOpen,
  onMove,
}: {
  ticket: Ticket;
  hue: number;
  onOpen: (ticket: Ticket) => void;
  onMove: (ticket: Ticket, status: TicketStatus) => void;
}) {
  return (
    <div className="rounded-xl border bg-card p-3 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
      <button
        type="button"
        onClick={() => onOpen(ticket)}
        className="w-full space-y-2 text-start focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={`جزئیات تیکت ${ticket.subject}`}
      >
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-[11px] tabular-nums text-muted-foreground">{toFa(ticket.code)}</span>
          <StatusBadge status={ticket.priority} label={TICKET_PRIORITY_LABELS[ticket.priority]} withDot={false} />
        </div>
        <p className="line-clamp-2 min-h-10 text-sm font-medium leading-snug">{ticket.subject}</p>
        <div className="flex items-center justify-between gap-2">
          <span className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
            <UserAvatar name={ticket.creatorName} hue={hue} size="sm" className="size-6 text-[9px]" />
            <span className="truncate">{ticket.creatorName}</span>
          </span>
          <SlaBadge ticket={ticket} />
        </div>
      </button>
      <div className="mt-2.5 border-t pt-2.5" onClick={(e) => e.stopPropagation()}>
        <Select value={ticket.status} onValueChange={(v) => onMove(ticket, v as TicketStatus)}>
          <SelectTrigger size="sm" className="h-7 w-full text-xs" aria-label={`تغییر وضعیت تیکت ${toFa(ticket.code)}`}>
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
    </div>
  );
}

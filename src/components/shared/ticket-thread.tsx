"use client";

/**
 * TicketThread — shared ticket conversation UI.
 * perspective "creator": the patient/doctor who opened the ticket (replies land in Support panel).
 * perspective "agent": support staff (internal notes + canned replies).
 */

import { useMemo, useRef, useState } from "react";
import { FileText, Image as ImageIcon, MessageSquarePlus, Send, StickyNote, Lock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { faDateTimeShort } from "@/lib/jalali";
import { toFa } from "@/lib/fa";
import { TICKET_CATEGORY_LABELS, TICKET_PRIORITY_LABELS, TICKET_SLA_HOURS, TICKET_STATUS_LABELS } from "@/lib/constants";
import { useAppStore } from "@/store/app-store";
import { StatusBadge } from "@/components/shared/status-badge";
import { RatingStars } from "@/components/shared/rating-stars";
import type { Ticket } from "@/types";

interface TicketThreadProps {
  ticket: Ticket;
  perspective: "creator" | "agent";
  /** current sender info */
  senderId: string;
  senderRole: "patient" | "doctor" | "support" | "admin";
  senderName: string;
  onAfterClose?: () => void;
  className?: string;
}

export function TicketThread({
  ticket,
  perspective,
  senderId,
  senderRole,
  senderName,
  onAfterClose,
  className,
}: TicketThreadProps) {
  const addTicketMessage = useAppStore((s) => s.addTicketMessage);
  const closeTicket = useAppStore((s) => s.closeTicket);
  const rateTicket = useAppStore((s) => s.rateTicket);
  const cannedReplies = useAppStore((s) => s.cannedReplies);
  const [text, setText] = useState("");
  const [internal, setInternal] = useState(false);
  const [attachments, setAttachments] = useState<{ name: string; sizeKB: number; type: "image" | "pdf" }[]>([]);
  const [rated, setRated] = useState(false);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  const isStaff = perspective === "agent";
  const visibleMessages = useMemo(
    () => ticket.messages.filter((m) => (isStaff ? true : !m.internal)),
    [ticket.messages, isStaff]
  );

  const send = () => {
    if (!text.trim()) {
      toast.error("متن پیام خالی است");
      return;
    }
    if (isStaff && internal && senderRole !== "support" && senderRole !== "admin") {
      toast.error("یادداشت داخلی فقط برای پشتیبان‌ها مجاز است");
      return;
    }
    addTicketMessage(ticket.id, {
      senderId,
      senderRole,
      senderName,
      text: text.trim(),
      internal: isStaff && internal,
      attachments,
    });
    setText("");
    setAttachments([]);
    toast.success(internal ? "یادداشت داخلی ثبت شد" : "پاسخ شما ارسال شد");
  };

  const attachMock = (kind: "image" | "pdf") => {
    setAttachments((prev) => [
      ...prev,
      kind === "image"
        ? { name: `تصویر-نمونه-${prev.length + 1}.jpg`, sizeKB: 240, type: "image" }
        : { name: `مستند-نمونه-${prev.length + 1}.pdf`, sizeKB: 480, type: "pdf" },
    ]);
    toast.success("فایل نمونه پیوست شد (شبیه‌سازی)");
  };

  const overdueHours =
    !ticket.firstResponseAtISO && !["closed", "answered"].includes(ticket.status)
      ? (Date.now() - new Date(ticket.createdAtISO).getTime()) / 3600_000
      : null;

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="border-b bg-muted/40 pb-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="space-y-1">
            <CardTitle className="text-base">{ticket.subject}</CardTitle>
            <p className="text-xs text-muted-foreground">
              کد: {ticket.code.replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)])} • ایجادکننده: {ticket.creatorName} (
              {ticket.creatorRole === "patient" ? "بیمار" : "پزشک"}) • {faDateTimeShort(ticket.createdAtISO)}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <StatusBadge status={ticket.status} label={TICKET_STATUS_LABELS[ticket.status]} />
            <StatusBadge status={ticket.priority} label={TICKET_PRIORITY_LABELS[ticket.priority]} />
            <Badge variant="outline" className="text-xs">{TICKET_CATEGORY_LABELS[ticket.category]}</Badge>
            {overdueHours !== null && overdueHours > TICKET_SLA_HOURS[ticket.priority] && (
              <Badge variant="destructive" className="text-xs">SLA از دست رفته</Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-4">
        {/* messages */}
        <div className="max-h-96 space-y-3 overflow-y-auto pe-1" role="log" aria-label="گفتگوی تیکت">
          {visibleMessages.map((m) => {
            const mine =
              perspective === "creator"
                ? m.senderRole === ticket.creatorRole
                : m.senderRole === "support" || m.senderRole === "admin";
            return (
              <div key={m.id} className={cn("flex", mine ? "justify-start" : "justify-end")}>
                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm shadow-sm",
                    m.internal
                      ? "border border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-300"
                      : mine
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                  )}
                >
                  <p className={cn("mb-1 flex items-center gap-1 text-[11px] font-semibold", m.internal && "text-amber-600")}>
                    {m.internal && <StickyNote className="size-3" aria-hidden />}
                    {m.senderName}
                    {m.internal && "(یادداشت داخلی — فقط کارشناسان)"}
                  </p>
                  <p className="whitespace-pre-wrap leading-relaxed">{m.text}</p>
                  {m.attachments.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {m.attachments.map((a, i) => (
                        <span key={i} className="flex items-center gap-1 rounded-lg bg-background/30 px-2 py-1 text-[11px]">
                          {a.type === "image" ? <ImageIcon className="size-3" aria-hidden /> : <FileText className="size-3" aria-hidden />}
                          {a.name} ({toFa(a.sizeKB)} کیلوبایت)
                        </span>
                      ))}
                    </div>
                  )}
                  <p className={cn("mt-1 text-[10px]", mine ? "text-primary-foreground/70" : "text-muted-foreground")}>
                    {faDateTimeShort(m.sentAtISO)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* rating (creator side, after close) */}
        {perspective === "creator" && ticket.status === "closed" && !ticket.rating && !rated && (
          <div className="rounded-xl border border-dashed p-3">
            <p className="mb-2 text-sm font-medium">تجربه شما از این پشتیبانی چطور بود؟</p>
            <div className="flex flex-wrap items-center gap-3">
              <RatingStars
                value={0}
                interactive
                size={22}
                onChange={(r) => {
                  rateTicket(ticket.id, r, undefined);
                  setRated(true);
                  toast.success("امتیاز شما ثبت شد؛ سپاس از بازخوردتان");
                }}
              />
            </div>
          </div>
        )}
        {ticket.rating && (
          <div className="flex items-center gap-2 rounded-xl bg-emerald-500/10 p-3 text-sm">
            <Lock className="size-4 text-emerald-600" aria-hidden />
            <span>این تیکت بسته شده است. امتیاز کاربر:</span>
            <RatingStars value={ticket.rating} count={undefined} />
            {ticket.ratingComment && <span className="text-xs text-muted-foreground">«{ticket.ratingComment}»</span>}
          </div>
        )}

        {/* reply form */}
        {ticket.status !== "closed" ? (
          <div className="space-y-2 rounded-xl border p-3">
            {isStaff && cannedReplies.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <MessageSquarePlus className="size-4 text-muted-foreground" aria-hidden />
                <Select
                  onValueChange={(id) => {
                    const r = cannedReplies.find((c) => c.id === id);
                    if (r) setText(r.text);
                  }}
                >
                  <SelectTrigger className="h-8 w-56 text-xs" aria-label="پاسخ‌های آماده">
                    <SelectValue placeholder="درج پاسخ آماده…" />
                  </SelectTrigger>
                  <SelectContent>
                    {cannedReplies.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="ms-auto flex items-center gap-2">
                  <Label htmlFor={`internal-${ticket.id}`} className="text-xs text-muted-foreground">
                    یادداشت داخلی
                  </Label>
                  <Switch id={`internal-${ticket.id}`} checked={internal} onCheckedChange={setInternal} />
                </div>
              </div>
            )}
            <Textarea
              ref={textAreaRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={
                isStaff
                  ? internal
                    ? "یادداشت داخلی برای تیم پشتیبانی…"
                    : "پاسخ خود را بنویسید…"
                  : "پاسخ خود را بنویسید…"
              }
              className="min-h-20 text-sm"
              aria-label="متن پاسخ"
            />
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" variant="outline" className="h-8" onClick={() => attachMock("image")}>
                <ImageIcon className="size-3.5" aria-hidden />
                پیوست تصویر
              </Button>
              <Button size="sm" variant="outline" className="h-8" onClick={() => attachMock("pdf")}>
                <FileText className="size-3.5" aria-hidden />
                پیوست فایل
              </Button>
              {attachments.length > 0 && (
                <span className="text-xs text-muted-foreground">{toFa(attachments.length)} فایل پیوست شد</span>
              )}
              <div className="ms-auto flex gap-2">
                {perspective === "creator" && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8"
                    onClick={() => {
                      closeTicket(ticket.id);
                      toast.success("تیکت بسته شد");
                      onAfterClose?.();
                    }}
                  >
                    بستن تیکت
                  </Button>
                )}
                <Button size="sm" className="h-8" onClick={send}>
                  <Send className="size-3.5" aria-hidden />
                  ارسال پاسخ
                </Button>
              </div>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

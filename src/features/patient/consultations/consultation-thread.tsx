"use client";

/**
 * ConsultationThreadPanel — گفتگوی مشاوره: حباب‌ها، مهلت پاسخ، نسخه و فرم پاسخ.
 */

import { useState } from "react";
import { toast } from "sonner";
import { FileText, Hash, Lock, MessagesSquare, Paperclip, Pill, Send, Timer, Video, Phone } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { toFa, toman } from "@/lib/fa";
import { faDateTimeShort, faFromNow } from "@/lib/jalali";
import { CONSULTATION_STATUS_LABELS, SPECIALTY_LABELS } from "@/lib/constants";
import type { Consultation, Doctor } from "@/types";
import { StatusBadge } from "@/components/shared/status-badge";
import { UserAvatar } from "@/components/shared/user-avatar";
import { useAppStore } from "@/store/app-store";
import { deadlineText } from "@/features/patient/helpers";

const TYPE_ICON = { text: MessagesSquare, phone: Phone, video: Video } as const;

export function ConsultationThreadPanel({
  consultation: c,
  doctor,
  className,
}: {
  consultation: Consultation;
  doctor: Doctor;
  className?: string;
}) {
  const addConsultationMessage = useAppStore((s) => s.addConsultationMessage);
  const setConsultationStatus = useAppStore((s) => s.setConsultationStatus);
  const [text, setText] = useState("");
  const [confirmClose, setConfirmClose] = useState(false);

  const TypeIcon = TYPE_ICON[c.type];
  const deadline = c.status === "waiting" ? deadlineText(c.deadlineISO) : null;

  const send = () => {
    if (!text.trim()) return toast.error("متن پیام خالی است");
    addConsultationMessage(c.id, { sender: "patient", text: text.trim() });
    setText("");
    toast.success("پیام شما ارسال شد");
  };

  const close = () => {
    setConsultationStatus(c.id, "closed");
    setConfirmClose(false);
    toast.success("مشاوره بسته شد", { description: "در صورت نیاز، می‌توانید مشاوره جدیدی ثبت کنید." });
  };

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="space-y-2 border-b bg-muted/40 pb-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex min-w-0 items-start gap-2.5">
            <UserAvatar name={doctor.name} hue={doctor.avatarHue} size="sm" />
            <div className="min-w-0">
              <p className="truncate text-sm font-bold">{c.subject}</p>
              <p className="truncate text-xs text-muted-foreground">
                {doctor.name} — {SPECIALTY_LABELS[doctor.specialtyId]}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <StatusBadge status={c.status} label={CONSULTATION_STATUS_LABELS[c.status]} />
            <Badge variant="outline" className="gap-1 text-xs tabular-nums">
              <Hash className="size-3" aria-hidden />
              {toFa(c.code)}
            </Badge>
            <Badge variant="secondary" className="gap-1 text-xs">
              <TypeIcon className="size-3" aria-hidden />
              مشاوره {c.type === "text" ? "متنی" : c.type === "phone" ? "تلفنی" : "ویدیویی"}
            </Badge>
            <Badge variant="outline" className="text-xs tabular-nums">
              {toman(c.fee)}
            </Badge>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>ثبت: {faFromNow(c.createdAtISO)}</span>
          {deadline ? (
            <Badge variant="outline" className="gap-1 border-amber-500/40 text-amber-700 dark:text-amber-400">
              <Timer className="size-3" aria-hidden />
              مهلت پاسخ پزشک: {deadline}
            </Badge>
          ) : c.status === "waiting" ? (
            <Badge variant="outline" className="gap-1 border-rose-500/40 text-rose-600 dark:text-rose-400">
              <Timer className="size-3" aria-hidden />
              مهلت پاسخ به پایان رسید؛ پلتفرم پیگیری می‌کند
            </Badge>
          ) : null}
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-4">
        {/* messages */}
        <div className="max-h-96 space-y-3 overflow-y-auto pe-1" role="log" aria-label="گفتگوی مشاوره">
          {c.messages.map((m) => {
            const mine = m.sender === "patient";
            return (
              <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm shadow-sm",
                    mine ? "bg-primary text-primary-foreground" : "bg-muted"
                  )}
                >
                  <p className="mb-1 text-[11px] font-semibold">{mine ? "شما" : doctor.name}</p>
                  <p className="whitespace-pre-wrap leading-relaxed">{m.text}</p>
                  {m.attachments.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {m.attachments.map((a, i) => (
                        <span
                          key={i}
                          className={cn(
                            "flex items-center gap-1 rounded-lg px-2 py-1 text-[11px]",
                            mine ? "bg-primary-foreground/15" : "bg-background"
                          )}
                        >
                          <FileText className="size-3" aria-hidden />
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

        {/* prescription note */}
        {c.prescriptionNote && (
          <div className="flex items-start gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/8 p-3.5">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
              <Pill className="size-5" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 text-sm font-bold text-emerald-700 dark:text-emerald-400">
                نسخه و توصیه پزشک
              </p>
              <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">{c.prescriptionNote}</p>
            </div>
          </div>
        )}

        {/* reply form */}
        {c.status !== "closed" ? (
          <div className="space-y-2 rounded-2xl border p-3">
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="پاسخ یا سؤال خود را بنویسید…"
              className="min-h-20 text-sm"
              aria-label="متن پاسخ"
            />
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5"
                onClick={() => toast.info("پیوست فایل در نسخه نمایشی شبیه‌سازی می‌شود")}
              >
                <Paperclip className="size-3.5" aria-hidden />
                پیوست
              </Button>
              <div className="ms-auto flex items-center gap-2">
                {c.status === "answered" && (
                  <Button variant="ghost" size="sm" className="h-8" onClick={() => setConfirmClose(true)}>
                    <Lock className="size-3.5" aria-hidden />
                    بستن مشاوره
                  </Button>
                )}
                <Button size="sm" className="h-8 gap-1.5" onClick={send}>
                  <Send className="size-3.5" aria-hidden />
                  ارسال پیام
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <p className="rounded-xl bg-muted/60 p-3 text-center text-xs text-muted-foreground">
            این مشاوره بسته شده است؛ در صورت نیاز مشاوره جدیدی ثبت کنید.
          </p>
        )}
      </CardContent>

      <AlertDialog open={confirmClose} onOpenChange={setConfirmClose}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>بستن مشاوره؟</AlertDialogTitle>
            <AlertDialogDescription>
              پس از بستن، امکان ارسال پیام در این گفتگو وجود ندارد و نسخه (در صورت ثبت) در پرونده پزشکی شما نگه‌داری می‌شود.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>انصراف</AlertDialogCancel>
            <AlertDialogAction onClick={close}>بله، ببند</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

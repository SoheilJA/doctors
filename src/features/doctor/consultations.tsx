"use client";

/**
 * /doctor/consultations — online consultation inbox: two-pane list + detail
 * (mobile: detail inside a sheet), reply thread, mock attachments, prescription
 * dialog and close flow with Persian toasts.
 */

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { z } from "zod";
import {
  FileText,
  Image as ImageIcon,
  Lock,
  MessagesSquare,
  Pill,
  Send,
  Timer,
  X,
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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { useDemoLoading } from "@/components/shared/hydration-gate";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAppStore } from "@/store/app-store";
import { CONSULTATION_STATUS_LABELS, PAYMENT_STATUS_LABELS } from "@/lib/constants";
import { faDateTimeShort, faFromNow } from "@/lib/jalali";
import { toFa, toman } from "@/lib/fa";
import { cn } from "@/lib/utils";
import { useDoctorPanel } from "@/features/doctor/shared";
import type { Attachment, Consultation } from "@/types";

const CONSULT_TYPE_LABELS: Record<Consultation["type"], string> = {
  text: "متنی",
  phone: "تلفنی",
  video: "ویدیویی",
};

type FilterTab = "all" | Consultation["status"];

/* ------------------------- detail pane ------------------------- */

const prescriptionSchema = z.object({
  note: z.string().trim().min(10, "متن نسخه باید حداقل ۱۰ کاراکتر باشد"),
});
type PrescriptionForm = z.infer<typeof prescriptionSchema>;

function ConsultationDetail({ consultation, onDone }: { consultation: Consultation; onDone?: () => void }) {
  const { patientMap } = useDoctorPanel();
  const addConsultationMessage = useAppStore((s) => s.addConsultationMessage);
  const setConsultationStatus = useAppStore((s) => s.setConsultationStatus);
  const setConsultationPrescription = useAppStore((s) => s.setConsultationPrescription);

  const [reply, setReply] = useState("");
  const [pendingAttachments, setPendingAttachments] = useState<Attachment[]>([]);
  const [confirmClose, setConfirmClose] = useState(false);
  const [prescriptionOpen, setPrescriptionOpen] = useState(false);
  const [now, setNow] = useState<number>(() => Date.now());

  const form = useForm<PrescriptionForm>({
    resolver: zodResolver(prescriptionSchema),
    defaultValues: { note: "" },
  });

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);

  const patient = patientMap.get(consultation.patientId);
  const deadline = new Date(consultation.deadlineISO).getTime();
  const hoursLeft = Math.ceil((deadline - now) / 3_600_000);
  const overdue = consultation.status === "waiting" && hoursLeft <= 0;

  const sendReply = () => {
    if (!reply.trim()) {
      toast.error("متن پاسخ خالی است");
      return;
    }
    addConsultationMessage(consultation.id, { sender: "doctor", text: reply.trim(), attachments: pendingAttachments });
    setReply("");
    setPendingAttachments([]);
    toast.success("پاسخ شما ارسال شد", { description: `برای مشاوره ${toFa(consultation.code)}` });
  };

  const attachReport = () => {
    setPendingAttachments((prev) => [...prev, { name: "گزارش-آزمایش.jpg", sizeKB: 512, type: "image" }]);
    toast.success("پیوست تصویر گزارش به پاسخ اضافه شد");
  };

  const submitPrescription = (values: PrescriptionForm) => {
    setConsultationPrescription(consultation.id, values.note);
    setPrescriptionOpen(false);
    form.reset();
    toast.success("نسخه ثبت و برای بیمار ارسال شد");
  };

  const doClose = () => {
    setConsultationStatus(consultation.id, "closed");
    setConfirmClose(false);
    toast.success("مشاوره بسته شد");
    onDone?.();
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b bg-muted/40 pb-3">
        <CardTitle className="flex flex-wrap items-center justify-between gap-2 text-base">
          <span className="min-w-0">{consultation.subject}</span>
          <StatusBadge
            status={consultation.status}
            label={consultation.status === "waiting" ? "در انتظار پاسخ شما" : CONSULTATION_STATUS_LABELS[consultation.status]}
          />
        </CardTitle>
        <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs text-muted-foreground">
          <Badge variant="outline" className="text-[11px]">{CONSULT_TYPE_LABELS[consultation.type]}</Badge>
          <span>{patient?.name ?? "بیمار"}</span>
          <span>• کد {toFa(consultation.code)}</span>
          <span>• {toman(consultation.fee)}</span>
          <StatusBadge status={consultation.paymentStatus} label={PAYMENT_STATUS_LABELS[consultation.paymentStatus]} withDot={false} />
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-4">
        {/* deadline chip */}
        {consultation.status === "waiting" && (
          <p
            className={cn(
              "flex w-fit items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium",
              overdue
                ? "border-rose-500/40 bg-rose-500/10 text-rose-600 dark:text-rose-400"
                : "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-400"
            )}
          >
            <Timer className="size-3.5" aria-hidden />
            {overdue
              ? "مهلت پاسخ گذشته است — لطفاً هرچه زودتر پاسخ دهید"
              : hoursLeft >= 24
                ? `مهلت پاسخ: ${toFa(Math.ceil(hoursLeft / 24))} روز دیگر`
                : `مهلت پاسخ: ${toFa(hoursLeft)} ساعت دیگر`}
          </p>
        )}

        {/* question bubble */}
        <div className="flex justify-start">
          <div className="max-w-[85%] rounded-2xl rounded-ss-md bg-muted px-3.5 py-2.5 text-sm shadow-sm">
            <p className="mb-1 text-[11px] font-semibold text-muted-foreground">
              پرسش بیمار — {faDateTimeShort(consultation.createdAtISO)}
            </p>
            <p className="whitespace-pre-wrap leading-relaxed">{consultation.question}</p>
          </div>
        </div>

        {/* thread */}
        <div className="space-y-3" role="log" aria-label="گفتگو">
          {consultation.messages.slice(1).map((m) => {
            const mine = m.sender === "doctor";
            return (
              <div key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm shadow-sm",
                    mine ? "rounded-se-md bg-primary text-primary-foreground" : "rounded-ss-md bg-muted"
                  )}
                >
                  <p className={cn("mb-1 text-[11px] font-semibold", mine ? "text-primary-foreground/70" : "text-muted-foreground")}>
                    {mine ? "پاسخ شما" : (patient?.name ?? "بیمار")}
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
                  <p className={cn("mt-1 text-[10px]", mine ? "text-primary-foreground/60" : "text-muted-foreground")}>
                    {faDateTimeShort(m.sentAtISO)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* prescription sent */}
        {consultation.prescriptionNote && (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3">
            <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
              <Pill className="size-3.5" aria-hidden />
              نسخه ارسال‌شده برای بیمار
            </p>
            <p className="whitespace-pre-wrap text-sm leading-relaxed">{consultation.prescriptionNote}</p>
          </div>
        )}

        {/* reply form */}
        {consultation.status !== "closed" ? (
          <div className="space-y-2 rounded-xl border p-3">
            <Textarea
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              placeholder="پاسخ خود را بنویسید…"
              className="min-h-24 text-sm"
              aria-label="متن پاسخ"
            />
            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" size="sm" variant="outline" className="h-8" onClick={attachReport}>
                <ImageIcon className="size-3.5" aria-hidden />
                پیوست تصویر گزارش
              </Button>
              {pendingAttachments.map((a, i) => (
                <span key={i} className="flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px]">
                  <ImageIcon className="size-3" aria-hidden />
                  {a.name}
                  <button
                    type="button"
                    className="text-rose-500 hover:text-rose-600"
                    aria-label={`حذف پیوست ${a.name}`}
                    onClick={() => setPendingAttachments((prev) => prev.filter((_, j) => j !== i))}
                  >
                    <X className="size-3" aria-hidden />
                  </button>
                </span>
              ))}
              <div className="ms-auto flex flex-wrap gap-2">
                <Button type="button" size="sm" variant="outline" className="h-8" onClick={() => setPrescriptionOpen(true)}>
                  <Pill className="size-3.5" aria-hidden />
                  ارسال نسخه
                </Button>
                <Button type="button" size="sm" variant="ghost" className="h-8 text-rose-600 hover:text-rose-700" onClick={() => setConfirmClose(true)}>
                  <Lock className="size-3.5" aria-hidden />
                  بستن مشاوره
                </Button>
                <Button type="button" size="sm" className="h-8" onClick={sendReply}>
                  <Send className="size-3.5" aria-hidden />
                  ارسال پاسخ
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <p className="flex items-center gap-1.5 rounded-xl border border-dashed p-3 text-xs text-muted-foreground">
            <Lock className="size-3.5" aria-hidden />
            این مشاوره بسته شده است.
          </p>
        )}
      </CardContent>

      {/* close confirm */}
      <AlertDialog open={confirmClose} onOpenChange={setConfirmClose}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>بستن این مشاوره؟</AlertDialogTitle>
            <AlertDialogDescription>
              پس از بستن، بیمار نمی‌تواند ادامه صحبت کند و مشاوره به حالت «بسته‌شده» می‌رود.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>انصراف</AlertDialogCancel>
            <AlertDialogAction className="bg-rose-600 text-white hover:bg-rose-700" onClick={doClose}>
              بله، ببند
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* prescription dialog */}
      <Dialog open={prescriptionOpen} onOpenChange={setPrescriptionOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader className="text-start">
            <DialogTitle>ارسال نسخه برای بیمار</DialogTitle>
            <DialogDescription>متن نسخه و توصیه‌های دارویی را بنویسید؛ پس از ثبت، برای بیمار ارسال می‌شود.</DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(submitPrescription)} className="space-y-3 text-start">
              <FormField
                control={form.control}
                name="note"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel className="text-sm">متن نسخه</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="مثلاً: پماد آداپالن هر شب — کرم ضدآفتاب روزانه…" className="min-h-32 text-sm" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setPrescriptionOpen(false)}>
                  انصراف
                </Button>
                <Button type="submit">ثبت و ارسال نسخه</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

/* ------------------------- main content ------------------------- */

export function ConsultationsContent() {
  const loading = useDemoLoading();
  const isMobile = useIsMobile();
  const { consultations, patientMap } = useDoctorPanel();
  const [filter, setFilter] = useState<FilterTab>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const filtered = useMemo(
    () => consultations.filter((c) => filter === "all" || c.status === filter),
    [consultations, filter]
  );

  const sorted = useMemo(() => [...filtered].sort((a, b) => b.createdAtISO.localeCompare(a.createdAtISO)), [filtered]);

  // auto-select the newest consultation when nothing is selected
  useEffect(() => {
    if (!selectedId && sorted.length > 0) setSelectedId(sorted[0].id);
  }, [selectedId, sorted]);

  const selected = useMemo(() => consultations.find((c) => c.id === selectedId) ?? null, [consultations, selectedId]);

  const waitingCount = consultations.filter((c) => c.status === "waiting").length;
  const overdueCount = consultations.filter(
    (c) => c.status === "waiting" && new Date(c.deadlineISO).getTime() < Date.now()
  ).length;

  const pick = (id: string) => {
    setSelectedId(id);
    if (isMobile) setSheetOpen(true);
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="مشاوره‌های آنلاین"
        description={`${toFa(waitingCount)} مشاوره در انتظار پاسخ شما${overdueCount > 0 ? ` — ${toFa(overdueCount)} مورد مهلت‌گذشته` : ""}`}
        loading={loading}
      />

      <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterTab)}>
        <TabsList>
          <TabsTrigger value="all">همه</TabsTrigger>
          <TabsTrigger value="waiting">در انتظار</TabsTrigger>
          <TabsTrigger value="answered">پاسخ‌داده</TabsTrigger>
          <TabsTrigger value="closed">بسته</TabsTrigger>
        </TabsList>
      </Tabs>

      {loading ? (
        <div className="grid gap-4 lg:grid-cols-[380px_minmax(0,1fr)]">
          <div className="h-96 animate-pulse rounded-xl bg-muted" />
          <div className="h-96 animate-pulse rounded-xl bg-muted" />
        </div>
      ) : consultations.length === 0 ? (
        <EmptyState
          icon={MessagesSquare}
          title="مشاوره‌ای ثبت نشده است"
          description="وقتی بیماران مشاوره آنلاین بگیرند، اینجا نمایش داده می‌شود."
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[380px_minmax(0,1fr)]">
          {/* list */}
          <div className="space-y-2">
            {sorted.length === 0 ? (
              <EmptyState icon={MessagesSquare} title="موردی در این وضعیت نیست" className="py-10" />
            ) : (
              <ul className="max-h-[70vh] space-y-2 overflow-y-auto pe-0.5 lg:max-h-none">
                {sorted.map((c) => {
                  const overdue = c.status === "waiting" && new Date(c.deadlineISO).getTime() < Date.now();
                  const active = c.id === selectedId;
                  return (
                    <li key={c.id}>
                      <button
                        type="button"
                        onClick={() => pick(c.id)}
                        className={cn(
                          "w-full rounded-xl border p-3 text-start transition-all hover:border-primary/40 hover:shadow-sm",
                          active && "border-primary bg-primary/5",
                          overdue && "border-rose-500/50 ring-1 ring-rose-500/30"
                        )}
                        aria-current={active ? "true" : undefined}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="min-w-0 truncate text-sm font-semibold">{c.subject}</p>
                          <StatusBadge
                            status={c.status}
                            label={c.status === "waiting" ? "در انتظار پاسخ شما" : CONSULTATION_STATUS_LABELS[c.status]}
                          />
                        </div>
                        <p className="mt-1 truncate text-xs text-muted-foreground">
                          {patientMap.get(c.patientId)?.name ?? "بیمار"} • {CONSULT_TYPE_LABELS[c.type]} • کد {toFa(c.code)}
                        </p>
                        <p className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
                          <span>{faFromNow(c.createdAtISO.split("T")[0])}</span>
                          {overdue && (
                            <span className="rounded bg-rose-500/15 px-1.5 font-medium text-rose-600 dark:text-rose-400">مهلت گذشته</span>
                          )}
                        </p>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* desktop detail */}
          {selected && (
            <div className="hidden lg:block">
              <ConsultationDetail consultation={selected} />
            </div>
          )}
        </div>
      )}

      {/* mobile detail sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="left" className="w-full gap-0 overflow-y-auto p-0 sm:max-w-lg">
          <SheetHeader className="border-b bg-muted/40 px-4 py-3">
            <SheetTitle className="text-sm">جزئیات مشاوره</SheetTitle>
            <SheetDescription className="sr-only">گفتگوی مشاوره آنلاین</SheetDescription>
          </SheetHeader>
          <div className="p-4">
            {selected && <ConsultationDetail consultation={selected} onDone={() => setSheetOpen(false)} />}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

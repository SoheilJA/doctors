"use client";

/**
 * /doctor/support — the doctor's own tickets: list + create dialog (zod) +
 * TicketThread sheet (perspective "creator") with rating display for closed ones.
 */

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { z } from "zod";
import { LifeBuoy, Plus, Ticket as TicketIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { RatingStars } from "@/components/shared/rating-stars";
import { StatusBadge } from "@/components/shared/status-badge";
import { TicketThread } from "@/components/shared/ticket-thread";
import { useDemoLoading } from "@/components/shared/hydration-gate";
import { useAppStore } from "@/store/app-store";
import {
  TICKET_CATEGORY_LABELS,
  TICKET_PRIORITY_LABELS,
  TICKET_STATUS_LABELS,
  type TicketCategory,
  type TicketPriority,
} from "@/lib/constants";
import { faDateTimeShort, faFromNow } from "@/lib/jalali";
import { toFa } from "@/lib/fa";
import { useDoctorPanel } from "@/features/doctor/shared";

const ticketSchema = z.object({
  subject: z.string().trim().min(3, "موضوع را وارد کنید"),
  category: z.string().min(1, "دسته تیکت را انتخاب کنید"),
  priority: z.string().min(1, "اولویت را انتخاب کنید"),
  body: z.string().trim().min(10, "متن تیکت را وارد کنید"),
});
type TicketForm = z.infer<typeof ticketSchema>;

export function SupportContent() {
  const loading = useDemoLoading();
  const { doctor, tickets, session } = useDoctorPanel();
  const createTicket = useAppStore((s) => s.createTicket);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  const form = useForm<TicketForm>({
    resolver: zodResolver(ticketSchema),
    defaultValues: { subject: "", category: "", priority: "medium", body: "" },
  });

  const sorted = useMemo(() => [...tickets].sort((a, b) => b.updatedAtISO.localeCompare(a.updatedAtISO)), [tickets]);
  const selected = useMemo(() => tickets.find((t) => t.id === selectedId) ?? null, [tickets, selectedId]);

  const submit = (values: TicketForm) => {
    if (!doctor) return;
    const ticket = createTicket({
      creatorId: doctor.id,
      creatorRole: "doctor",
      creatorName: doctor.name,
      subject: values.subject,
      category: values.category as TicketCategory,
      priority: values.priority as TicketPriority,
      body: values.body,
    });
    form.reset({ subject: "", category: "", priority: "medium", body: "" });
    setCreateOpen(false);
    setSelectedId(ticket.id);
    setSheetOpen(true);
    toast.success("تیکت ثبت شد و به پشتیبانی ارسال شد", { description: `کد پیگیری: ${toFa(ticket.code)}` });
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="پشتیبانی"
        description="تیکت‌های شما با تیم پشتیبانی «دکترها»"
        loading={loading}
        actions={
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" aria-hidden />
            ثبت تیکت جدید
          </Button>
        }
      />

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : sorted.length === 0 ? (
        <EmptyState
          icon={LifeBuoy}
          title="تیکتی ثبت نکرده‌اید"
          description="هر مشکلی در رزرو، پرداخت یا تقویم داشتید، برای ما تیکت ثبت کنید."
          action={
            <Button size="sm" variant="outline" onClick={() => setCreateOpen(true)}>
              <Plus className="size-4" aria-hidden />
              ثبت اولین تیکت
            </Button>
          }
        />
      ) : (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">تیکت‌های من</CardTitle>
            <CardDescription className="text-xs">
              پاسخ‌های پشتیبان در همین صفحه و در اعلان‌ها به شما اعلام می‌شود.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="divide-y">
              {sorted.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedId(t.id);
                      setSheetOpen(true);
                    }}
                    className="w-full p-3.5 text-start transition-colors hover:bg-muted/50"
                    aria-label={`تیکت ${t.subject}`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="min-w-0 truncate text-sm font-semibold">
                        <TicketIcon className="me-1.5 inline size-4 text-primary" aria-hidden />
                        {t.subject}
                      </p>
                      <span className="flex flex-wrap items-center gap-1.5">
                        <StatusBadge status={t.status} label={TICKET_STATUS_LABELS[t.status]} />
                        <StatusBadge status={t.priority} label={TICKET_PRIORITY_LABELS[t.priority]} withDot={false} />
                      </span>
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <Badge variant="outline" className="text-[10px]">{TICKET_CATEGORY_LABELS[t.category]}</Badge>
                      <span className="font-mono tabular-nums">{toFa(t.code)}</span>
                      <span>به‌روزشده {faFromNow(t.updatedAtISO.split("T")[0])}</span>
                      <span className="hidden sm:inline">• ایجاد: {faDateTimeShort(t.createdAtISO)}</span>
                      {t.status === "closed" && typeof t.rating === "number" && (
                        <RatingStars value={t.rating} size={13} />
                      )}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* thread sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="left" className="w-full gap-0 overflow-y-auto p-0 sm:max-w-xl lg:max-w-2xl">
          <SheetHeader className="border-b bg-muted/40 px-4 py-3">
            <SheetTitle className="text-sm">گفتگوی تیکت</SheetTitle>
            <SheetDescription className="sr-only">گفتگو با پشتیبانی</SheetDescription>
          </SheetHeader>
          <div className="p-4">
            {selected && doctor && (
              <TicketThread
                ticket={selected}
                perspective="creator"
                senderId={session?.userId ?? doctor.id}
                senderRole="doctor"
                senderName={doctor.name}
                onAfterClose={() => setSheetOpen(false)}
              />
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader className="text-start">
            <DialogTitle>ثبت تیکت جدید</DialogTitle>
            <DialogDescription>تیم پشتیبانی در سریع‌ترین زمان ممکن پاسخ می‌دهد.</DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(submit)} className="space-y-3 text-start">
              <FormField
                control={form.control}
                name="subject"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel className="text-sm">موضوع</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="مثلاً: نمایش نادرست ساعت در تقویم" className="h-9" aria-label="موضوع تیکت" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem className="space-y-1.5">
                      <FormLabel className="text-sm">دسته</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="h-9 w-full" aria-label="دسته تیکت">
                            <SelectValue placeholder="انتخاب دسته" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {(Object.keys(TICKET_CATEGORY_LABELS) as TicketCategory[]).map((c) => (
                            <SelectItem key={c} value={c}>
                              {TICKET_CATEGORY_LABELS[c]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem className="space-y-1.5">
                      <FormLabel className="text-sm">اولویت</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger className="h-9 w-full" aria-label="اولویت تیکت">
                            <SelectValue placeholder="انتخاب اولویت" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {(Object.keys(TICKET_PRIORITY_LABELS) as TicketPriority[]).map((p) => (
                            <SelectItem key={p} value={p}>
                              {TICKET_PRIORITY_LABELS[p]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="body"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel className="text-sm">متن تیکت</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="شرح کامل مشکل را بنویسید…" className="min-h-28 text-sm" aria-label="متن تیکت" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                  انصراف
                </Button>
                <Button type="submit">ارسال تیکت</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

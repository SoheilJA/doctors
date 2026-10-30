"use client";

/**
 * /support/faq — knowledge base grouped by category with add/edit/delete.
 */

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { z } from "zod";
import { BookOpen, Pencil, Plus, Trash2 } from "lucide-react";
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
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/shared/status-badge";
import { useDemoLoading } from "@/components/shared/hydration-gate";
import { useAppStore } from "@/store/app-store";
import { TICKET_CATEGORY_LABELS, type TicketCategory } from "@/lib/constants";
import { faNum } from "@/lib/fa";
import type { Faq } from "@/types";

const FAQ_CATEGORY_LABELS: Record<Faq["category"], string> = {
  general: "عمومی",
  ...TICKET_CATEGORY_LABELS,
};

const FAQ_CATEGORY_ORDER: Faq["category"][] = ["general", ...(Object.keys(TICKET_CATEGORY_LABELS) as TicketCategory[])];

const faqSchema = z.object({
  question: z.string().trim().min(5, "پرسش را کامل بنویسید"),
  answer: z.string().trim().min(10, "پاسخ حداقل ۱۰ حرف باشد"),
  category: z.string().min(1, "دسته را انتخاب کنید"),
  published: z.boolean(),
});
type FaqForm = z.infer<typeof faqSchema>;

export function FaqManager() {
  const loading = useDemoLoading();
  const faqs = useAppStore((s) => s.faqs);
  const upsertFaq = useAppStore((s) => s.upsertFaq);
  const deleteFaq = useAppStore((s) => s.deleteFaq);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Faq | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Faq | null>(null);

  const form = useForm<FaqForm>({
    resolver: zodResolver(faqSchema),
    defaultValues: { question: "", answer: "", category: "general", published: true },
  });

  const grouped = useMemo(() => {
    const map = new Map<Faq["category"], Faq[]>();
    for (const f of [...faqs].sort((a, b) => a.order - b.order)) {
      const list = map.get(f.category) ?? [];
      list.push(f);
      map.set(f.category, list);
    }
    return FAQ_CATEGORY_ORDER.map((c) => ({ category: c, items: map.get(c) ?? [] })).filter((g) => g.items.length > 0);
  }, [faqs]);

  const openCreate = () => {
    setEditing(null);
    form.reset({ question: "", answer: "", category: "general", published: true });
    setDialogOpen(true);
  };

  const openEdit = (faq: Faq) => {
    setEditing(faq);
    form.reset({ question: faq.question, answer: faq.answer, category: faq.category, published: faq.published });
    setDialogOpen(true);
  };

  const submit = (values: FaqForm) => {
    upsertFaq({
      id: editing?.id ?? `faq-${Date.now()}`,
      question: values.question,
      answer: values.answer,
      category: values.category as Faq["category"],
      published: values.published,
      order: editing?.order ?? faqs.length + 1,
    });
    setDialogOpen(false);
    toast.success(editing ? "پرسش ویرایش شد" : "پرسش جدید اضافه شد", {
      description: values.question,
    });
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    deleteFaq(deleteTarget.id);
    toast.success("پرسش حذف شد", { description: deleteTarget.question });
    setDeleteTarget(null);
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="دانش‌نامه (پرسش‌های متداول)"
        description={`پاسخ‌های آماده پرسش‌های پرتکرار کاربران — ${faNum(faqs.length)} پرسش`}
        loading={loading}
        actions={
          <Button size="sm" onClick={openCreate}>
            <Plus className="size-4" aria-hidden />
            افزودن پرسش
          </Button>
        }
      />

      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-24 w-full rounded-xl" />
            </div>
          ))}
        </div>
      ) : faqs.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="پرسشی ثبت نشده است"
          description="پرسش‌های متداول را اینجا ثبت کنید تا کاربران سریع‌تر پاسخ بگیرند."
          action={
            <Button size="sm" variant="outline" onClick={openCreate}>
              <Plus className="size-4" aria-hidden />
              افزودن اولین پرسش
            </Button>
          }
        />
      ) : (
        <div className="space-y-5">
          {grouped.map(({ category, items }) => (
            <section key={category} aria-label={`دسته ${FAQ_CATEGORY_LABELS[category]}`} className="space-y-2">
              <h2 className="flex items-center gap-2">
                <Badge variant="outline">{FAQ_CATEGORY_LABELS[category]}</Badge>
                <span className="text-xs text-muted-foreground">{faNum(items.length)} پرسش</span>
              </h2>
              <Card>
                <CardContent className="p-2 sm:p-4">
                  <Accordion type="multiple" className="w-full">
                    {items.map((f) => (
                      <AccordionItem key={f.id} value={f.id}>
                        <AccordionTrigger className="text-start text-sm hover:no-underline" aria-label={f.question}>
                          <span className="flex flex-1 items-center gap-2 text-start">
                            <span className="font-medium">{f.question}</span>
                            <StatusBadge
                              status={f.published ? "published" : "draft"}
                              label={f.published ? "منتشرشده" : "پیش‌نویس"}
                              withDot={false}
                              className="ms-auto"
                            />
                          </span>
                        </AccordionTrigger>
                        <AccordionContent className="space-y-3 pb-4">
                          <p className="text-sm leading-relaxed text-muted-foreground">{f.answer}</p>
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="text-xs text-muted-foreground">ترتیب نمایش: {faNum(f.order)}</span>
                            <div className="flex items-center gap-1">
                              <Button size="sm" variant="ghost" className="h-8" onClick={() => openEdit(f)} aria-label={`ویرایش ${f.question}`}>
                                <Pencil className="size-4" aria-hidden />
                                ویرایش
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 text-rose-500 hover:text-rose-600"
                                onClick={() => setDeleteTarget(f)}
                                aria-label={`حذف ${f.question}`}
                              >
                                <Trash2 className="size-4" aria-hidden />
                                حذف
                              </Button>
                            </div>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </CardContent>
              </Card>
            </section>
          ))}
        </div>
      )}

      {/* create / edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader className="text-start">
            <DialogTitle>{editing ? "ویرایش پرسش" : "افزودن پرسش"}</DialogTitle>
            <DialogDescription>پرسش و پاسخ آن در دانش‌نامه ثبت می‌شود.</DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(submit)} className="space-y-3 text-start">
              <FormField
                control={form.control}
                name="question"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel className="text-sm">پرسش</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="پرسش کاربر…" className="min-h-16 text-sm" aria-label="متن پرسش" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="answer"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <FormLabel className="text-sm">پاسخ</FormLabel>
                    <FormControl>
                      <Textarea {...field} placeholder="پاسخ کامل…" className="min-h-24 text-sm" aria-label="متن پاسخ" />
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
                          <SelectTrigger className="h-9 w-full" aria-label="دسته پرسش">
                            <SelectValue placeholder="انتخاب دسته" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {FAQ_CATEGORY_ORDER.map((c) => (
                            <SelectItem key={c} value={c}>
                              {FAQ_CATEGORY_LABELS[c]}
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
                  name="published"
                  render={({ field }) => (
                    <FormItem className="space-y-1.5">
                      <FormLabel className="text-sm">وضعیت انتشار</FormLabel>
                      <div className="flex h-9 items-center gap-2">
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} aria-label="انتشار پرسش" />
                        </FormControl>
                        <span className="text-xs text-muted-foreground">
                          {field.value ? "منتشرشده" : "پیش‌نویس"}
                        </span>
                      </div>
                    </FormItem>
                  )}
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  انصراف
                </Button>
                <Button type="submit">{editing ? "ذخیره تغییرات" : "افزودن"}</Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* delete confirm */}
      <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>این پرسش حذف شود؟</AlertDialogTitle>
            <AlertDialogDescription>«{deleteTarget?.question}» از دانش‌نامه حذف می‌شود.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>انصراف</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>حذف شود</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

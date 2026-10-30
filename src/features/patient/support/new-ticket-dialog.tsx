"use client";

/**
 * NewTicketDialog — ثبت تیکت پشتیبانی جدید (zod فارسی).
 */

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { LifeBuoy, Send } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { TICKET_CATEGORY_LABELS, TICKET_PRIORITY_LABELS, type TicketCategory, type TicketPriority } from "@/lib/constants";

const schema = z.object({
  subject: z.string().trim().min(4, "موضوع بسیار کوتاه است"),
  category: z.string().min(1, "دسته‌بندی را انتخاب کنید"),
  priority: z.string().min(1, "اولویت را انتخاب کنید"),
  body: z.string().trim().min(20, "شرح کافی از مشکل لازم است"),
});
type Values = z.infer<typeof schema>;

interface NewTicketDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSubmit: (values: { subject: string; category: TicketCategory; priority: TicketPriority; body: string }) => void;
}

export function NewTicketDialog({ open, onOpenChange, onSubmit }: NewTicketDialogProps) {
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { subject: "", category: "", priority: "medium", body: "" },
  });

  useEffect(() => {
    if (open) form.reset({ subject: "", category: "", priority: "medium", body: "" });
  }, [open]);

  const submit = form.handleSubmit((values) => {
    onSubmit({
      subject: values.subject,
      category: values.category as TicketCategory,
      priority: values.priority as TicketPriority,
      body: values.body,
    });
    form.reset();
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LifeBuoy className="size-5 text-primary" aria-hidden />
            ثبت تیکت جدید
          </DialogTitle>
          <DialogDescription>
            تیم پشتیبانی «دکترها» در سریع‌ترین زمان ممکن پاسخ می‌دهد؛ اولویت «فوری» کمتر از ۲ ساعت بررسی می‌شود.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={submit} className="space-y-4">
            <FormField
              control={form.control}
              name="subject"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>موضوع</FormLabel>
                  <FormControl>
                    <Input placeholder="مثلاً: مشکل در پرداخت نوبت" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>دسته‌بندی</FormLabel>
                    <Select value={field.value || undefined} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger aria-label="انتخاب دسته‌بندی">
                          <SelectValue placeholder="انتخاب…" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(TICKET_CATEGORY_LABELS).map(([id, label]) => (
                          <SelectItem key={id} value={id}>
                            {label}
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
                  <FormItem>
                    <FormLabel>اولویت</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger aria-label="انتخاب اولویت">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(TICKET_PRIORITY_LABELS).map(([id, label]) => (
                          <SelectItem key={id} value={id}>
                            {label}
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
                <FormItem>
                  <FormLabel>شرح مشکل</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="مشکل خود را با جزئیات بنویسید: کد پیگیری، زمان وقوع و اقداماتی که انجام داده‌اید…"
                      className="min-h-32"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                انصراف
              </Button>
              <Button type="submit" className="gap-1.5">
                <Send className="size-4" aria-hidden />
                ارسال تیکت
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

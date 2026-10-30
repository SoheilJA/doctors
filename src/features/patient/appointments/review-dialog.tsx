"use client";

/**
 * ReviewDialog — ثبت نظر برای ویزیت انجام‌شده (امتیاز + متن) با اعتبارسنجی زود.
 */

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { faDate } from "@/lib/jalali";
import { toFa } from "@/lib/fa";
import { RatingStars } from "@/components/shared/rating-stars";
import type { Appointment, Doctor } from "@/types";

const reviewSchema = z.object({
  rating: z.number().min(1, "امتیاز را انتخاب کنید"),
  comment: z.string().trim().min(5, "متن نظر بسیار کوتاه است"),
});
type ReviewValues = z.infer<typeof reviewSchema>;

interface ReviewDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  appointment: Appointment;
  doctor: Doctor;
  onSubmit: (rating: number, comment: string) => void;
}

export function ReviewDialog({ open, onOpenChange, appointment, doctor, onSubmit }: ReviewDialogProps) {
  const form = useForm<ReviewValues>({
    resolver: zodResolver(reviewSchema),
    defaultValues: { rating: 0, comment: "" },
  });

  const submit = form.handleSubmit((values) => {
    onSubmit(values.rating, values.comment);
    form.reset({ rating: 0, comment: "" });
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Star className="size-5 fill-amber-400 text-amber-400" aria-hidden />
            ثبت نظر برای ویزیت
          </DialogTitle>
          <DialogDescription>
            ویزیت شما با {doctor.name} در تاریخ {faDate(appointment.date)} — کد {toFa(appointment.code)}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={submit} className="space-y-4">
            <FormField
              control={form.control}
              name="rating"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>امتیاز شما</FormLabel>
                  <FormControl>
                    <RatingStars
                      value={field.value}
                      interactive
                      size={26}
                      onChange={(r) => field.onChange(r)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="comment"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>متن نظر</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="تجربه خود از ویزیت، برخورد پزشک و روند درمان را بنویسید…"
                      className="min-h-24"
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
              <Button type="submit">ثبت نظر</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

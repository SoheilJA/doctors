"use client";

/**
 * NewConsultationDialog — ثبت مشاوره جدید: پزشک آنلاین، نوع مشاوره، موضوع و شرح.
 */

import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { MessagesSquare, Phone, Send, Video } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { toman } from "@/lib/fa";
import { SPECIALTY_LABELS } from "@/lib/constants";
import type { Doctor } from "@/types";

const schema = z.object({
  doctorId: z.string().min(1, "پزشک را انتخاب کنید"),
  type: z.enum(["text", "phone", "video"], { message: "نوع مشاوره را انتخاب کنید" }),
  subject: z.string().trim().min(4, "موضوع بسیار کوتاه است"),
  question: z.string().trim().min(20, "شرح کافی از مشکل لازم است"),
});
type Values = z.infer<typeof schema>;

const TYPE_META: { id: "text" | "phone" | "video"; label: string; icon: typeof MessagesSquare }[] = [
  { id: "text", label: "متنی", icon: MessagesSquare },
  { id: "phone", label: "تلفنی", icon: Phone },
  { id: "video", label: "ویدیویی", icon: Video },
];

export interface NewConsultationPayload {
  doctorId: string;
  type: "text" | "phone" | "video";
  subject: string;
  question: string;
  doctor: Doctor;
}

interface NewConsultationDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  doctors: Doctor[];
  onCreated: (payload: NewConsultationPayload) => void;
}

export function NewConsultationDialog({ open, onOpenChange, doctors, onCreated }: NewConsultationDialogProps) {
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { doctorId: "", type: "text", subject: "", question: "" },
  });

  const doctorId = form.watch("doctorId");
  const type = form.watch("type");
  const doctor = useMemo(() => doctors.find((d) => d.id === doctorId), [doctors, doctorId]);
  const fee = doctor
    ? type === "text"
      ? doctor.textFee
      : type === "phone"
        ? doctor.phoneFee
        : doctor.videoFee
    : 0;

  const submit = form.handleSubmit((values) => {
    if (!doctor) return;
    // The store action is invoked by the parent (keeps relation wiring in one place).
    const { doctorId, type, subject, question } = values;
    onCreated({ doctorId, type, subject, question, doctor });
    form.reset({ doctorId: "", type: "text", subject: "", question: "" });
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessagesSquare className="size-5 text-primary" aria-hidden />
            مشاوره جدید
          </DialogTitle>
          <DialogDescription>
            سؤال خود را بنویسید؛ پزشک حداکثر تا ۲۴ ساعت آینده پاسخ می‌دهد. مبلغ مشاوره پس از ثبت کسر می‌شود.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={submit} className="space-y-4">
            <FormField
              control={form.control}
              name="doctorId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>پزشک</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger aria-label="انتخاب پزشک">
                        <SelectValue placeholder="انتخاب پزشک آنلاین…" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {doctors.map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.name} — {SPECIALTY_LABELS[d.specialtyId]}
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
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>نوع مشاوره</FormLabel>
                  <FormControl>
                    <RadioGroup value={field.value} onValueChange={field.onChange} className="grid grid-cols-3 gap-2">
                      {TYPE_META.map(({ id, label, icon: Icon }) => (
                        <label
                          key={id}
                          className={cn(
                            "flex cursor-pointer flex-col items-center gap-1.5 rounded-xl border p-3 text-center text-xs font-semibold transition-colors",
                            field.value === id && "border-primary bg-primary/5 text-primary"
                          )}
                        >
                          <RadioGroupItem value={id} className="sr-only" />
                          <Icon className="size-5" aria-hidden />
                          {label}
                          <span className="text-[11px] font-normal text-muted-foreground tabular-nums">
                            {doctor
                              ? toman(id === "text" ? doctor.textFee : id === "phone" ? doctor.phoneFee : doctor.videoFee)
                              : "—"}
                          </span>
                        </label>
                      ))}
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="subject"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>موضوع</FormLabel>
                  <FormControl>
                    <Input placeholder="مثلاً: خارش و قرمزی پوست صورت" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="question"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>شرح مشکل</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="شرح کامل علائم، مدت زمان، داروهای مصرفی و سؤال خود را بنویسید (حداقل ۲۰ نویسه)…"
                      className="min-h-28"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex items-center justify-between rounded-xl border bg-muted/50 px-3 py-2 text-sm">
              <Label className="text-xs text-muted-foreground">مبلغ مشاوره</Label>
              <span className="font-bold text-primary tabular-nums">{doctor ? toman(fee) : "—"}</span>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                انصراف
              </Button>
              <Button type="submit" className="gap-1.5">
                <Send className="size-4" aria-hidden />
                ثبت مشاوره و پرداخت
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

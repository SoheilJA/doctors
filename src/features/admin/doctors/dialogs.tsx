"use client";

/**
 * دیالوگ‌های مشترک مدیریت پزشکان: رد احراز هویت، ویرایش کمیسیون و تعلیق حساب.
 * بین صفحه فهرست پزشکان و صفحه جزئیات پزشک مشترک است.
 */

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { z } from "zod";
import { Ban, PercentCircle, ShieldX } from "lucide-react";
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAppStore } from "@/store/app-store";
import { faNum, faPercent, parseFaNumber } from "@/lib/fa";
import type { Doctor } from "@/types";

/* ------------------------------ رد احراز هویت ------------------------------ */

const rejectSchema = z.object({
  reason: z.string().trim().min(5, "دلیل رد را بنویسید (حداقل ۵ نویسه)"),
});
type RejectValues = z.infer<typeof rejectSchema>;

interface RejectVerificationDialogProps {
  doctor: Doctor | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  actorName: string;
}

export function RejectVerificationDialog({ doctor, open, onOpenChange, actorName }: RejectVerificationDialogProps) {
  const setDoctorVerification = useAppStore((s) => s.setDoctorVerification);
  const form = useForm<RejectValues>({
    resolver: zodResolver(rejectSchema),
    defaultValues: { reason: "" },
  });

  useEffect(() => {
    if (open) form.reset({ reason: "" });
  }, [open, form]);

  const submit = form.handleSubmit((values) => {
    if (!doctor) return;
    setDoctorVerification(doctor.id, "rejected", actorName, values.reason);
    toast.error(`احراز هویت ${doctor.name} رد شد`, { description: `دلیل: ${values.reason}` });
    onOpenChange(false);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldX className="size-5 text-rose-500" aria-hidden />
            رد احراز هویت پزشک
          </DialogTitle>
          <DialogDescription>
            دلیل رد مدارک {doctor?.name ?? ""} را بنویسید؛ این متن برای پزشک ثبت می‌شود.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={submit} className="space-y-4">
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>دلیل رد</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={3}
                      placeholder="مثلاً: تصویر پروانه پزشکی ناخواناست"
                      className="resize-none"
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
              <Button type="submit" variant="destructive">
                ثبت و رد احراز
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------ ویرایش کمیسیون ------------------------------ */

const commissionSchema = z.object({
  rate: z
    .number({ message: "نرخ کمیسیون را وارد کنید" })
    .int("نرخ کمیسیون باید عدد صحیح باشد")
    .min(20, "کمیسیون باید بین ۲۰ تا ۶۰ درصد باشد")
    .max(60, "کمیسیون باید بین ۲۰ تا ۶۰ درصد باشد"),
});
type CommissionValues = z.infer<typeof commissionSchema>;

interface CommissionDialogProps {
  doctor: Doctor | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  actorName: string;
}

export function CommissionDialog({ doctor, open, onOpenChange, actorName }: CommissionDialogProps) {
  const updateDoctor = useAppStore((s) => s.updateDoctor);
  const addAuditLog = useAppStore((s) => s.addAuditLog);
  const form = useForm<CommissionValues>({
    resolver: zodResolver(commissionSchema),
    defaultValues: { rate: 30 },
  });

  useEffect(() => {
    if (open && doctor) form.reset({ rate: doctor.commissionRate });
  }, [open, doctor, form]);

  const submit = form.handleSubmit((values) => {
    if (!doctor) return;
    updateDoctor(doctor.id, { commissionRate: values.rate });
    addAuditLog({
      actorName,
      actorRole: "admin",
      action: "ویرایش نرخ کمیسیون پزشک",
      target: `${doctor.name} — از ${faPercent(doctor.commissionRate)} به ${faPercent(values.rate)}`,
    });
    toast.success("نرخ کمیسیون ذخیره شد", {
      description: `${doctor.name}: ${faPercent(values.rate)} (پیش‌تر ${faPercent(doctor.commissionRate)})`,
    });
    onOpenChange(false);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PercentCircle className="size-5 text-primary" aria-hidden />
            ویرایش نرخ کمیسیون
          </DialogTitle>
          <DialogDescription>
            سهم پلتفرم از ویزیت‌ها و مشاوره‌های {doctor?.name ?? ""} — بازه مجاز ۲۰ تا ۶۰ درصد.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={submit} className="space-y-4">
            <FormField
              control={form.control}
              name="rate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>نرخ کمیسیون (درصد)</FormLabel>
                  <FormControl>
                    <Input
                      inputMode="numeric"
                      value={field.value ? faNum(field.value) : ""}
                      onChange={(e) => {
                        const n = parseFaNumber(e.target.value);
                        field.onChange(Number.isFinite(n) ? n : Number.NaN);
                      }}
                      placeholder="مثلاً: ۳۵"
                      className="h-9 tabular-nums"
                      aria-label="نرخ کمیسیون به درصد"
                    />
                  </FormControl>
                  <FormDescription className="text-[11px]">عدد بین ۲۰ تا ۶۰ وارد کنید.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                انصراف
              </Button>
              <Button type="submit">ذخیره نرخ</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

/* -------------------------------- تعلیق حساب -------------------------------- */

interface SuspendDoctorDialogProps {
  doctor: Doctor | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  actorName: string;
}

export function SuspendDoctorDialog({ doctor, open, onOpenChange, actorName }: SuspendDoctorDialogProps) {
  const setDoctorAccountStatus = useAppStore((s) => s.setDoctorAccountStatus);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Ban className="size-5 text-rose-500" aria-hidden />
            تعلیق پزشک
          </AlertDialogTitle>
          <AlertDialogDescription>
            حساب {doctor?.name ?? ""} تعلیق شود؟ پروفایل او از نتایج جستجو پنهان می‌شود و امکان رزرو نوبت از او
            غیرفعال می‌گردد. این اقدام قابل بازگشت است.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>انصراف</AlertDialogCancel>
          <AlertDialogAction
            className="bg-rose-600 text-white hover:bg-rose-700"
            onClick={() => {
              if (!doctor) return;
              setDoctorAccountStatus(doctor.id, "suspended", actorName);
              toast(`${doctor.name} تعلیق شد`, { description: "وضعیت حساب: غیرفعال" });
            }}
          >
            بله، تعلیق شود
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

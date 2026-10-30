"use client";

/**
 * FamilyFormDialog — افزودن/ویرایش عضو خانواده با اعتبارسنجی زود (Persian zod).
 */

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { UsersRound } from "lucide-react";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { JalaliDatePicker } from "@/components/shared/jalali-date-picker";
import { FAMILY_RELATIONS, GENDER_LABELS } from "@/features/patient/helpers";
import type { FamilyMember } from "@/types";

const schema = z.object({
  name: z.string().trim().min(3, "نام و نام خانوادگی را کامل وارد کنید"),
  relation: z.string().min(1, "نسبت را انتخاب کنید"),
  gender: z.enum(["male", "female"], { message: "جنسیت را انتخاب کنید" }),
  birthDateISO: z.string().min(1, "تاریخ تولد را انتخاب کنید"),
  nationalId: z
    .string()
    .trim()
    .regex(/^\d{10}$/, "کد ملی باید ۱۰ رقم باشد"),
});
type Values = z.infer<typeof schema>;

interface FamilyFormDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** editing member or null for new */
  member: FamilyMember | null;
  onSubmit: (values: Omit<FamilyMember, "id">) => void;
}

export function FamilyFormDialog({ open, onOpenChange, member, onSubmit }: FamilyFormDialogProps) {
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", relation: "", gender: "male", birthDateISO: "", nationalId: "" },
  });

  useEffect(() => {
    if (open) {
      form.reset(
        member
          ? {
              name: member.name,
              relation: member.relation,
              gender: member.gender,
              birthDateISO: member.birthDateISO,
              nationalId: member.nationalId,
            }
          : { name: "", relation: "", gender: "male", birthDateISO: "", nationalId: "" }
      );
    }
  }, [open, member]);

  const submit = form.handleSubmit((values) => {
    onSubmit({
      name: values.name,
      relation: values.relation,
      gender: values.gender,
      birthDateISO: values.birthDateISO,
      nationalId: values.nationalId,
    });
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UsersRound className="size-5 text-primary" aria-hidden />
            {member ? `ویرایش «${member.name}»` : "افزودن عضو خانواده"}
          </DialogTitle>
          <DialogDescription>اطلاعات عضو خانواده را وارد کنید تا بتوانید برای او نوبت رزرو کنید.</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={submit} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>نام و نام خانوادگی</FormLabel>
                  <FormControl>
                    <Input placeholder="مثلاً: مریم رضایی" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="relation"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>نسبت</FormLabel>
                  <Select value={field.value || undefined} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger aria-label="انتخاب نسبت">
                        <SelectValue placeholder="انتخاب…" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {FAMILY_RELATIONS.map((r) => (
                        <SelectItem key={r} value={r}>
                          {r}
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
              name="gender"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>جنسیت</FormLabel>
                  <FormControl>
                    <RadioGroup value={field.value} onValueChange={field.onChange} className="flex gap-3">
                      {(["male", "female"] as const).map((g) => (
                        <label
                          key={g}
                          className={cn(
                            "flex cursor-pointer items-center gap-2 rounded-xl border px-4 py-2 text-sm transition-colors",
                            field.value === g ? "border-primary bg-primary/5 text-primary" : "hover:bg-muted/50"
                          )}
                        >
                          <RadioGroupItem value={g} className="sr-only" />
                          {GENDER_LABELS[g]}
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
              name="birthDateISO"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>تاریخ تولد</FormLabel>
                  <JalaliDatePicker value={field.value} onChange={field.onChange} placeholder="انتخاب تاریخ تولد" />
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="nationalId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>کد ملی</FormLabel>
                  <FormControl>
                    <Input inputMode="numeric" dir="ltr" placeholder="۰۰۱۲۳۴۵۶۷۸" className="text-start tabular-nums" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                انصراف
              </Button>
              <Button type="submit">{member ? "ذخیره تغییرات" : "افزودن عضو"}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

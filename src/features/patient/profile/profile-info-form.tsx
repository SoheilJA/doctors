"use client";

/**
 * ProfileInfoForm — فرم اطلاعات شخصی بیمار (zod فارسی) → updatePatient.
 */

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Save, UserRound } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { faPhone } from "@/lib/fa";
import { CITIES, INSURERS } from "@/lib/constants";
import type { Patient } from "@/types";

const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"] as const;

const schema = z.object({
  name: z.string().trim().min(3, "نام و نام خانوادگی را کامل وارد کنید"),
  city: z.string().min(1, "شهر را انتخاب کنید"),
  address: z.string().trim().min(8, "نشانی را کامل‌تر وارد کنید"),
  insurance: z.string().min(1, "بیمه را انتخاب کنید"),
  bloodType: z.string().min(1, "گروه خونی را انتخاب کنید"),
  allergies: z.string(),
  chronicConditions: z.string(),
});
type Values = z.infer<typeof schema>;

export function ProfileInfoForm({ patient, onSaved }: { patient: Patient; onSaved: (v: Values) => void }) {
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: patient.name,
      city: patient.city,
      address: patient.address,
      insurance: patient.insurance,
      bloodType: patient.bloodType,
      allergies: patient.allergies.join("، "),
      chronicConditions: patient.chronicConditions.join("، "),
    },
  });

  useEffect(() => {
    form.reset({
      name: patient.name,
      city: patient.city,
      address: patient.address,
      insurance: patient.insurance,
      bloodType: patient.bloodType,
      allergies: patient.allergies.join("، "),
      chronicConditions: patient.chronicConditions.join("، "),
    });
  }, [patient.id]);

  const submit = form.handleSubmit((values) => onSaved(values));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <UserRound className="size-4.5 text-primary" aria-hidden />
          اطلاعات شخصی
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={submit} className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>نام و نام خانوادگی</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormItem>
              <FormLabel>شماره موبایل</FormLabel>
              <Input value={faPhone(patient.phone)} readOnly dir="ltr" className="text-start bg-muted/50" aria-readonly />
              <FormDescription className="text-xs text-muted-foreground">
                شماره موبایل در نسخه نمایشی قابل تغییر نیست.
              </FormDescription>
            </FormItem>

            <FormField
              control={form.control}
              name="city"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>شهر</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger aria-label="انتخاب شهر">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {CITIES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
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
              name="insurance"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>بیمه</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger aria-label="انتخاب بیمه">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {INSURERS.map((i) => (
                        <SelectItem key={i} value={i}>
                          {i}
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
              name="bloodType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>گروه خونی</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger aria-label="انتخاب گروه خونی">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {BLOOD_TYPES.map((b) => (
                        <SelectItem key={b} value={b}>
                          {b}
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
              name="address"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>نشانی</FormLabel>
                  <FormControl>
                    <Textarea placeholder="خیابان، کوچه، پلاک…" className="min-h-16" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="allergies"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>حساسیت‌ها</FormLabel>
                  <FormControl>
                    <Input placeholder="مثلاً: پنی‌سیلین، گردو" {...field} />
                  </FormControl>
                  <FormDescription className="text-xs text-muted-foreground">موارد را با «،» جدا کنید.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="chronicConditions"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>بیماری‌های زمینه‌ای</FormLabel>
                  <FormControl>
                    <Input placeholder="مثلاً: فشار خون بالا، دیابت" {...field} />
                  </FormControl>
                  <FormDescription className="text-xs text-muted-foreground">موارد را با «،» جدا کنید.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="md:col-span-2">
              <Button type="submit" className="gap-1.5">
                <Save className="size-4" aria-hidden />
                ذخیره تغییرات
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

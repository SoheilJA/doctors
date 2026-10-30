"use client";

/**
 * /doctor/settings — profile & preferences in 3 tabs:
 * personal info (RHF+zod), professional info (bio + education/certificates),
 * and demo notification switches + simulated password change.
 */

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { z } from "zod";
import {
  BadgeCheck,
  Bell,
  KeyRound,
  Plus,
  Save,
  Trash2,
  Upload,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PageHeader } from "@/components/shared/page-header";
import { useDemoLoading } from "@/components/shared/hydration-gate";
import { useAppStore } from "@/store/app-store";
import { CITIES } from "@/lib/constants";
import { toFa } from "@/lib/fa";
import { useDoctorPanel } from "@/features/doctor/shared";
import type { Doctor } from "@/types";

/* ------------------------- personal tab ------------------------- */

const personalSchema = z.object({
  name: z.string().trim().min(3, "نام را کامل وارد کنید"),
  city: z.string().min(1, "شهر را انتخاب کنید"),
  address: z.string().trim().min(10, "نشانی را کامل‌تر وارد کنید"),
});
type PersonalForm = z.infer<typeof personalSchema>;

function PersonalTab({ doctor }: { doctor: Doctor }) {
  const updateDoctor = useAppStore((s) => s.updateDoctor);
  const form = useForm<PersonalForm>({
    resolver: zodResolver(personalSchema),
    defaultValues: { name: doctor.name, city: doctor.city, address: doctor.address },
  });

  const submit = (values: PersonalForm) => {
    updateDoctor(doctor.id, values);
    toast.success("اطلاعات شخصی ذخیره شد");
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(submit)} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem className="space-y-1.5">
                <FormLabel className="text-sm">نام و نام خانوادگی</FormLabel>
                <FormControl>
                  <Input {...field} className="h-9" aria-label="نام و نام خانوادگی" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="city"
            render={({ field }) => (
              <FormItem className="space-y-1.5">
                <FormLabel className="text-sm">شهر</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger className="h-9 w-full" aria-label="انتخاب شهر">
                      <SelectValue placeholder="انتخاب شهر" />
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
        </div>
        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem className="space-y-1.5">
              <FormLabel className="text-sm">نشانی مطب</FormLabel>
              <FormControl>
                <Textarea {...field} className="min-h-20 text-sm" aria-label="نشانی مطب" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="space-y-1.5">
          <Label className="text-sm">شماره تماس</Label>
          <Input value="۰۹۱۲ ۳۴۵ ۶۷۸۹" disabled className="h-9" aria-label="شماره تماس (غیرفعال)" />
          <p className="text-[11px] text-muted-foreground">
            تغییر شماره تماس در نسخه نمایشی فعال نیست؛ برای تغییر واقعی با پشتیبانی تماس بگیرید.
          </p>
        </div>
        <Button type="submit" size="sm">
          <Save className="size-4" aria-hidden />
          ذخیره اطلاعات شخصی
        </Button>
      </form>
    </Form>
  );
}

/* ------------------------- professional tab ------------------------- */

function ProfessionalTab({ doctor }: { doctor: Doctor }) {
  const updateDoctor = useAppStore((s) => s.updateDoctor);
  const [bio, setBio] = useState(doctor.bio);
  const [education, setEducation] = useState<string[]>(doctor.education);
  const [certificates, setCertificates] = useState<string[]>(doctor.certificates);
  const [eduInput, setEduInput] = useState("");
  const [certInput, setCertInput] = useState("");
  const [bioError, setBioError] = useState<string | null>(null);

  const save = () => {
    const trimmed = bio.trim();
    if (trimmed.length < 30) {
      setBioError("بیوگرافی باید حداقل ۳۰ کاراکتر باشد");
      return;
    }
    if (trimmed.length > 600) {
      setBioError("بیوگرافی حداکثر ۶۰۰ کاراکتر است");
      return;
    }
    setBioError(null);
    updateDoctor(doctor.id, { bio: trimmed, education, certificates });
    toast.success("اطلاعات حرفه‌ای ذخیره شد");
  };

  const addEducation = () => {
    const v = eduInput.trim();
    if (v.length < 3) {
      toast.error("عنوان تحصیلات را کامل وارد کنید");
      return;
    }
    setEducation((prev) => [...prev, v]);
    setEduInput("");
  };

  const addCertificate = () => {
    const v = certInput.trim();
    if (v.length < 3) {
      toast.error("عنوان مدرک را کامل وارد کنید");
      return;
    }
    setCertificates((prev) => [...prev, v]);
    setCertInput("");
  };

  const uploadMock = () => {
    setCertificates((prev) => [...prev, "مدرک-نمونه.pdf"]);
    toast.success("مدرک نمونه بارگذاری شد (شبیه‌سازی)");
  };

  return (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor="bio" className="text-sm">بیوگرافی حرفه‌ای</Label>
        <Textarea
          id="bio"
          value={bio}
          onChange={(e) => {
            setBio(e.target.value);
            setBioError(null);
          }}
          className="min-h-32 text-sm"
          placeholder="سابقه، تخصص‌ها و حوزه‌های کاری خود را معرفی کنید…"
          aria-label="بیوگرافی حرفه‌ای"
        />
        <div className="flex items-center justify-between">
          {bioError ? (
            <p className="text-xs text-rose-600" role="alert">{bioError}</p>
          ) : (
            <span className="text-xs text-muted-foreground">در پروفایل عمومی شما نمایش داده می‌شود.</span>
          )}
          <span className={`text-xs tabular-nums ${bio.length > 600 ? "text-rose-600" : "text-muted-foreground"}`}>
            {toFa(bio.length)} از {toFa(600)} کاراکتر
          </span>
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        {/* education */}
        <div className="space-y-2">
          <Label className="text-sm">سوابق تحصیلی</Label>
          <ul className="space-y-1.5">
            {education.map((e, i) => (
              <li key={`${e}-${i}`} className="flex items-center gap-2 rounded-xl border p-2.5 text-sm">
                <BadgeCheck className="size-4 shrink-0 text-primary" aria-hidden />
                <span className="min-w-0 flex-1">{e}</span>
                <button
                  type="button"
                  className="shrink-0 text-rose-500 hover:text-rose-600"
                  aria-label={`حذف ${e}`}
                  onClick={() => setEducation((prev) => prev.filter((_, j) => j !== i))}
                >
                  <Trash2 className="size-4" aria-hidden />
                </button>
              </li>
            ))}
            {education.length === 0 && <li className="rounded-xl border border-dashed p-3 text-xs text-muted-foreground">موردی ثبت نشده است.</li>}
          </ul>
          <div className="flex gap-2">
            <Input
              value={eduInput}
              onChange={(e) => setEduInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addEducation();
                }
              }}
              placeholder="مثلاً: فلوشیپ لیزر از دانشگاه…"
              className="h-9 text-sm"
              aria-label="عنوان تحصیلات جدید"
            />
            <Button type="button" variant="outline" size="sm" className="h-9" onClick={addEducation}>
              <Plus className="size-4" aria-hidden />
              افزودن
            </Button>
          </div>
        </div>

        {/* certificates */}
        <div className="space-y-2">
          <Label className="text-sm">مدارک و گواهینامه‌ها</Label>
          <ul className="space-y-1.5">
            {certificates.map((c, i) => (
              <li key={`${c}-${i}`} className="flex items-center gap-2 rounded-xl border p-2.5 text-sm">
                <BadgeCheck className="size-4 shrink-0 text-emerald-500" aria-hidden />
                <span className="min-w-0 flex-1">{c}</span>
                <button
                  type="button"
                  className="shrink-0 text-rose-500 hover:text-rose-600"
                  aria-label={`حذف ${c}`}
                  onClick={() => setCertificates((prev) => prev.filter((_, j) => j !== i))}
                >
                  <Trash2 className="size-4" aria-hidden />
                </button>
              </li>
            ))}
            {certificates.length === 0 && <li className="rounded-xl border border-dashed p-3 text-xs text-muted-foreground">موردی ثبت نشده است.</li>}
          </ul>
          <div className="flex gap-2">
            <Input
              value={certInput}
              onChange={(e) => setCertInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addCertificate();
                }
              }}
              placeholder="مثلاً: گواهینامه لیزر پزشکی"
              className="h-9 text-sm"
              aria-label="عنوان مدرک جدید"
            />
            <Button type="button" variant="outline" size="sm" className="h-9" onClick={addCertificate}>
              <Plus className="size-4" aria-hidden />
              افزودن
            </Button>
          </div>
          <Button type="button" variant="outline" size="sm" className="h-9 w-full" onClick={uploadMock}>
            <Upload className="size-4" aria-hidden />
            بارگذاری مدرک (فایل نمونه)
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="rounded-xl bg-muted/60 p-3 text-sm">
          <span className="text-xs text-muted-foreground">شماره پروانه پزشکی: </span>
          <span className="font-semibold tabular-nums">{toFa(doctor.licenseNumber)}</span>
          <span className="ms-2 text-[11px] text-muted-foreground">(غیرقابل تغییر)</span>
        </div>
        <Button size="sm" onClick={save}>
          <Save className="size-4" aria-hidden />
          ذخیره اطلاعات حرفه‌ای
        </Button>
      </div>
    </div>
  );
}

/* ------------------------- preferences tab ------------------------- */

const passwordSchema = z
  .object({
    current: z.string().min(1, "رمز فعلی را وارد کنید"),
    next: z.string().min(8, "رمز عبور باید حداقل ۸ کاراکتر باشد"),
    confirm: z.string().min(1, "تکرار رمز عبور را وارد کنید"),
  })
  .refine((v) => v.next === v.confirm, { message: "تکرار رمز عبور مطابقت ندارد", path: ["confirm"] });

type PasswordForm = z.infer<typeof passwordSchema>;

function PreferencesTab() {
  const [smsNewBooking, setSmsNewBooking] = useState(true);
  const [emailReviews, setEmailReviews] = useState(true);
  const [pushConsults, setPushConsults] = useState(false);

  const form = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { current: "", next: "", confirm: "" },
  });

  const submitPassword = () => {
    form.reset();
    toast.success("رمز عبور تغییر کرد (شبیه‌سازی)", { description: "در نسخه نمایشی رمزی ذخیره نمی‌شود." });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <Bell className="size-4 text-primary" aria-hidden />
          ترجیحات اعلان‌ها (نمونه)
        </h3>
        <p className="text-xs text-muted-foreground">در این نسخه نمایشی، این تنظیمات فقط در همین صفحه ذخیره می‌شوند و جایی ارسال نمی‌شوند.</p>
        <ul className="divide-y rounded-xl border">
          {[
            { id: "sms", label: "پیامک نوبت جدید", desc: "به‌محض ثبت هر نوبت جدید پیامک دریافت کنید", value: smsNewBooking, set: setSmsNewBooking },
            { id: "email", label: "ایمیل نظرات جدید", desc: "خلاصه نظرات بیماران به ایمیل شما", value: emailReviews, set: setEmailReviews },
            { id: "push", label: "اعلان مشاوره‌های جدید", desc: "اطلاع فوری از مشاوره‌های در انتظار پاسخ", value: pushConsults, set: setPushConsults },
          ].map((row) => (
            <li key={row.id} className="flex items-center justify-between gap-3 p-3.5">
              <div className="min-w-0">
                <p className="text-sm font-medium">{row.label}</p>
                <p className="text-xs text-muted-foreground">{row.desc}</p>
              </div>
              <Switch checked={row.value} onCheckedChange={row.set} aria-label={row.label} />
            </li>
          ))}
        </ul>
      </div>

      <div className="space-y-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <KeyRound className="size-4 text-primary" aria-hidden />
          تغییر رمز عبور
        </h3>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(submitPassword)} className="grid gap-4 sm:grid-cols-3">
            <FormField
              control={form.control}
              name="current"
              render={({ field }) => (
                <FormItem className="space-y-1.5">
                  <FormLabel className="text-sm">رمز فعلی</FormLabel>
                  <FormControl>
                    <Input {...field} type="password" className="h-9" aria-label="رمز عبور فعلی" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="next"
              render={({ field }) => (
                <FormItem className="space-y-1.5">
                  <FormLabel className="text-sm">رمز جدید</FormLabel>
                  <FormControl>
                    <Input {...field} type="password" className="h-9" aria-label="رمز عبور جدید" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="confirm"
              render={({ field }) => (
                <FormItem className="space-y-1.5">
                  <FormLabel className="text-sm">تکرار رمز جدید</FormLabel>
                  <FormControl>
                    <Input {...field} type="password" className="h-9" aria-label="تکرار رمز عبور جدید" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="sm:col-span-3">
              <Button type="submit" size="sm">
                <KeyRound className="size-4" aria-hidden />
                تغییر رمز عبور
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}

/* ------------------------- main content ------------------------- */

export function SettingsContent() {
  const loading = useDemoLoading();
  const { doctor } = useDoctorPanel();

  return (
    <div className="space-y-6">
      <PageHeader
        title="پروفایل و تنظیمات"
        description="اطلاعات شما در صفحه عمومی‌تان به بیماران نمایش داده می‌شود."
        loading={loading}
      />

      {!doctor ? (
        <div className="h-96 animate-pulse rounded-xl bg-muted" />
      ) : (
        <Tabs defaultValue="personal">
          <TabsList>
            <TabsTrigger value="personal">اطلاعات شخصی</TabsTrigger>
            <TabsTrigger value="professional">حرفه‌ای</TabsTrigger>
            <TabsTrigger value="prefs">تنظیمات</TabsTrigger>
          </TabsList>
          <TabsContent value="personal" className="mt-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">اطلاعات شخصی</CardTitle>
                <CardDescription className="text-xs">نام، شهر و نشانی مطب شما</CardDescription>
              </CardHeader>
              <CardContent>
                <PersonalTab doctor={doctor} />
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="professional" className="mt-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">اطلاعات حرفه‌ای</CardTitle>
                <CardDescription className="text-xs">بیوگرافی، سوابق تحصیلی و مدارک</CardDescription>
              </CardHeader>
              <CardContent>
                {/* keyed so it re-initializes when the doctor profile changes */}
                <ProfessionalTab doctor={doctor} key={doctor.id} />
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="prefs" className="mt-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">تنظیمات</CardTitle>
                <CardDescription className="text-xs">اعلان‌ها و امنیت حساب</CardDescription>
              </CardHeader>
              <CardContent>
                <PreferencesTab />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      <Alert>
        <BadgeCheck className="size-4" aria-hidden />
        <AlertDescription>
          احراز هویت شما {doctor?.verification === "verified" ? "تأیید شده است" : "در انتظار تأیید است"} و وضعیت حساب شما فعال است.
        </AlertDescription>
      </Alert>
    </div>
  );
}

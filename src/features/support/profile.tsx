"use client";

/**
 * /support/profile — agent profile card, simulated profile/password edit forms
 * (RHF + zod, Persian errors) and notification preferences (local state).
 */

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { z } from "zod";
import { Info, KeyRound, Mail, ShieldCheck, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { UserAvatar } from "@/components/shared/user-avatar";
import { useDemoLoading } from "@/components/shared/hydration-gate";
import { faNum } from "@/lib/fa";
import { computeAgentStats, faRating, useSupportPanel } from "@/features/support/shared";

const profileSchema = z.object({
  name: z.string().trim().min(3, "نام حداقل ۳ حرف باشد"),
  email: z
    .string()
    .trim()
    .min(1, "رایانامه را وارد کنید")
    .refine((v) => /^\S+@\S+\.\S+$/.test(v), "رایانامه معتبر نیست"),
});
type ProfileForm = z.infer<typeof profileSchema>;

const passwordSchema = z
  .object({
    password: z.string().min(8, "رمز عبور باید حداقل ۸ کاراکتر باشد"),
    confirm: z.string().min(1, "تکرار رمز عبور را وارد کنید"),
  })
  .refine((v) => v.password === v.confirm, { message: "تکرار رمز عبور مطابقت ندارد", path: ["confirm"] });
type PasswordForm = z.infer<typeof passwordSchema>;

const NOTIF_PREFS = [
  { key: "newTicket", label: "تیکت جدید", description: "ثبت تیکت تازه توسط کاربران" },
  { key: "userReply", label: "پاسخ کاربر در تیکت", description: "پیام جدید کاربر در تیکت‌های شما" },
  { key: "slaOverdue", label: "رد شدن از مهلت SLA", description: "هشدار پیش از پایان مهلت پاسخ" },
  { key: "dailyDigest", label: "خلاصه روزانه", description: "گزارش عملکرد روزانه در پایان روز" },
] as const;

type NotifPrefs = Record<(typeof NOTIF_PREFS)[number]["key"], boolean>;

export function SupportProfile() {
  const loading = useDemoLoading();
  const { session, agentId, agentName, staff, tickets } = useSupportPanel();
  const me = staff.find((s) => s.id === agentId);
  const stats = computeAgentStats(tickets, agentId);

  const [notifPrefs, setNotifPrefs] = useState<NotifPrefs>({
    newTicket: true,
    userReply: true,
    slaOverdue: true,
    dailyDigest: false,
  });

  const profileForm = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: me?.name ?? agentName, email: me?.email ?? "support1@doktorha.ir" },
  });

  const passwordForm = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { password: "", confirm: "" },
  });

  const submitProfile = (values: ProfileForm) => {
    toast.success("پروفایل به‌روزرسانی شد (شبیه‌سازی)", {
      description: `${values.name} — ${values.email}`,
    });
  };

  const submitPassword = () => {
    passwordForm.reset({ password: "", confirm: "" });
    toast.success("رمز عبور تغییر کرد (شبیه‌سازی)");
  };

  return (
    <div className="space-y-4">
      <PageHeader title="پروفایل" description="اطلاعات حساب و تنظیمات کارشناس پشتیبانی" loading={loading} />

      <div className="grid gap-4 lg:grid-cols-3">
        {/* identity card */}
        <Card className="h-fit">
          <CardHeader className="items-center pb-3 text-center">
            <UserAvatar name={agentName} hue={session?.avatarHue ?? me?.avatarHue ?? 330} size="xl" />
            <div className="space-y-1.5 pt-2">
              <CardTitle className="text-lg">{agentName}</CardTitle>
              <div className="flex flex-wrap items-center justify-center gap-1.5">
                <Badge variant="secondary">
                  <ShieldCheck className="size-3.5" aria-hidden />
                  کارشناس پشتیبانی
                </Badge>
                <StatusBadge status={me && !me.active ? "suspended" : "active"} label={me && !me.active ? "غیرفعال" : "فعال"} />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Mail className="size-4" aria-hidden />
              <span dir="ltr">{me?.email ?? "support1@doktorha.ir"}</span>
            </p>
            <Separator />
            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="rounded-xl bg-muted/60 p-3">
                <p className="text-xs text-muted-foreground">تیکت‌های فعال من</p>
                <p className="mt-1 text-lg font-bold tabular-nums">{faNum(stats.activeAssigned)}</p>
              </div>
              <div className="rounded-xl bg-muted/60 p-3">
                <p className="text-xs text-muted-foreground">امتیاز رضایت</p>
                <p className="mt-1 flex items-center justify-center gap-1 text-lg font-bold tabular-nums">
                  <Star className="size-4 fill-amber-400 text-amber-400" aria-hidden />
                  {stats.satisfaction !== null ? `${faRating(stats.satisfaction)} از ۵` : "—"}
                </p>
              </div>
            </div>
            <p className="flex items-start gap-1.5 rounded-lg bg-primary/5 p-2.5 text-[11px] leading-relaxed text-muted-foreground">
              <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden />
              در این نسخه نمایشی، تغییرات پروفایل و تنظیمات فقط شبیه‌سازی می‌شوند و در داده‌ها ذخیره نمی‌شوند.
            </p>
          </CardContent>
        </Card>

        <div className="space-y-4 lg:col-span-2">
          {/* edit profile */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">ویرایش پروفایل</CardTitle>
              <CardDescription className="text-xs">نام و رایانامه‌ای که در پنل نمایش داده می‌شود.</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...profileForm}>
                <form onSubmit={profileForm.handleSubmit(submitProfile)} className="space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <FormField
                      control={profileForm.control}
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
                      control={profileForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem className="space-y-1.5">
                          <FormLabel className="text-sm">رایانامه</FormLabel>
                          <FormControl>
                            <Input {...field} dir="ltr" className="h-9 text-start" aria-label="رایانامه" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="flex justify-end">
                    <Button type="submit" size="sm">
                      ذخیره تغییرات
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>

          {/* password */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <KeyRound className="size-4 text-muted-foreground" aria-hidden />
                تغییر رمز عبور
              </CardTitle>
              <CardDescription className="text-xs">رمز عبور حداقل ۸ کاراکتر باشد.</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...passwordForm}>
                <form onSubmit={passwordForm.handleSubmit(submitPassword)} className="space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <FormField
                      control={passwordForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem className="space-y-1.5">
                          <FormLabel className="text-sm">رمز عبور جدید</FormLabel>
                          <FormControl>
                            <Input {...field} type="password" dir="ltr" className="h-9 text-start" aria-label="رمز عبور جدید" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={passwordForm.control}
                      name="confirm"
                      render={({ field }) => (
                        <FormItem className="space-y-1.5">
                          <FormLabel className="text-sm">تکرار رمز عبور</FormLabel>
                          <FormControl>
                            <Input {...field} type="password" dir="ltr" className="h-9 text-start" aria-label="تکرار رمز عبور" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="flex justify-end">
                    <Button type="submit" size="sm" variant="outline">
                      تغییر رمز عبور
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>

          {/* notifications */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-base">تنظیمات اطلاع‌رسانی</CardTitle>
                <Badge variant="outline">شبیه‌سازی</Badge>
              </div>
              <CardDescription className="text-xs">انتخاب کنید برای چه رویدادهایی اعلان دریافت کنید.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-1">
              {NOTIF_PREFS.map((pref) => (
                <div
                  key={pref.key}
                  className="flex items-center justify-between gap-4 rounded-xl px-3 py-2.5 transition-colors hover:bg-muted/50"
                >
                  <div className="min-w-0">
                    <Label htmlFor={`notif-${pref.key}`} className="cursor-pointer text-sm font-medium">
                      {pref.label}
                    </Label>
                    <p className="text-xs text-muted-foreground">{pref.description}</p>
                  </div>
                  <Switch
                    id={`notif-${pref.key}`}
                    checked={notifPrefs[pref.key]}
                    onCheckedChange={(v) => setNotifPrefs((prev) => ({ ...prev, [pref.key]: v }))}
                    aria-label={pref.label}
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

"use client";

/**
 * پروفایل — اطلاعات شخصی و تنظیمات (نسخه نمایشی).
 */

import { useState } from "react";
import { Bell, Info, ShieldAlert, Trash2 } from "lucide-react";
import { toast } from "sonner";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/shared/page-header";
import { useDemoLoading } from "@/components/shared/hydration-gate";
import { useAppStore } from "@/store/app-store";
import { ProfileInfoForm } from "@/features/patient/profile/profile-info-form";
import { useCurrentPatient } from "@/features/patient/helpers";

export default function PatientProfilePage() {
  const loading = useDemoLoading();
  const patient = useCurrentPatient();
  const updatePatient = useAppStore((s) => s.updatePatient);

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [notifPrefs, setNotifPrefs] = useState({
    appointments: true,
    labs: true,
    support: true,
    offers: false,
  });

  if (loading || !patient) {
    return (
      <div className="space-y-4">
        <PageHeader title="پروفایل" loading />
        <Skeleton className="h-96 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <PageHeader title="پروفایل" description="اطلاعات شخصی، سلامت و تنظیمات حساب خود را مدیریت کنید." />

      <Tabs defaultValue="info">
        <TabsList>
          <TabsTrigger value="info">اطلاعات شخصی</TabsTrigger>
          <TabsTrigger value="settings">تنظیمات</TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="mt-4">
          <ProfileInfoForm
            patient={patient}
            onSaved={(values) => {
              updatePatient(patient.id, {
                name: values.name,
                city: values.city,
                address: values.address,
                insurance: values.insurance,
                bloodType: values.bloodType,
                allergies: splitList(values.allergies),
                chronicConditions: splitList(values.chronicConditions),
              });
              toast.success("اطلاعات پروفایل به‌روزرسانی شد");
            }}
          />
        </TabsContent>

        <TabsContent value="settings" className="mt-4 space-y-4">
          {/* notification prefs */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Bell className="size-4.5 text-primary" aria-hidden />
                تنظیمات اعلان‌ها
                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-normal text-muted-foreground">نمونه</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(
                [
                  { key: "appointments", label: "یادآوری نوبت‌ها", desc: "پیامک و اعلان قبل از زمان ویزیت" },
                  { key: "labs", label: "اتمام آزمایش‌ها", desc: "اطلاع از آماده‌شدن جواب آزمایش" },
                  { key: "support", label: "پاسخ پشتیبانی و مشاوره", desc: "اعلان پاسخ پزشک و پشتیبان" },
                  { key: "offers", label: "تخفیف‌ها و پیشنهادها", desc: "کدهای تخفیف و کمپین‌های سامانه" },
                ] as const
              ).map(({ key, label, desc }) => (
                <div key={key} className="flex items-center justify-between gap-3 rounded-xl border p-3">
                  <div className="min-w-0">
                    <Label className="cursor-pointer text-sm font-semibold">{label}</Label>
                    <p className="text-xs text-muted-foreground">{desc}</p>
                  </div>
                  <Switch
                    checked={notifPrefs[key]}
                    onCheckedChange={(v) => {
                      setNotifPrefs((p) => ({ ...p, [key]: v }));
                      toast.info("تنظیمات اعلان (نمونه) تغییر کرد", { description: `${label}: ${v ? "فعال" : "غیرفعال"}` });
                    }}
                    aria-label={label}
                  />
                </div>
              ))}
              <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <Info className="size-3.5" aria-hidden />
                در نسخه نمایشی، این تنظیمات فقط در همین صفحه ذخیره می‌شوند.
              </p>
            </CardContent>
          </Card>

          {/* danger zone */}
          <Card className="border-rose-500/30">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base text-rose-600 dark:text-rose-400">
                <ShieldAlert className="size-4.5" aria-hidden />
                منطقه خطر
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold">حذف حساب کاربری</p>
                <p className="text-xs text-muted-foreground">
                  حذف حساب، سوابق نوبت‌ها و پرونده پزشکی را نیز حذف می‌کند.
                </p>
              </div>
              <Button variant="destructive" className="gap-1.5" onClick={() => setConfirmDelete(true)}>
                <Trash2 className="size-4" aria-hidden />
                حذف حساب کاربری
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف حساب کاربری؟</AlertDialogTitle>
            <AlertDialogDescription>
              این عمل در نسخه نمایشی غیرفعال است؛ سوابق شما حفظ می‌شود.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>انصراف</AlertDialogCancel>
            <AlertDialogAction className="bg-rose-600 hover:bg-rose-700" onClick={() => {
              setConfirmDelete(false);
              toast.info("در نسخه نمایشی امکان‌پذیر نیست");
            }}>
              بله، حسابم را حذف کن
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function splitList(input: string): string[] {
  return input
    .split(/[،,]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

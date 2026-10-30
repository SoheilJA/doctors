"use client";

/**
 * /admin/settings — تنظیمات سامانه با ۴ تب (عمومی، درگاه پرداخت، پیامک، اعلان‌ها).
 * همه کنترل‌ها فقط در وضعیت محلی ذخیره می‌شوند و با ذخیرهسازی واقعی ندارند؛
 * هر ذخیره با توست «(شبیه‌سازی)» و یادداشت صادقانه اعلام می‌شود.
 */

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { z } from "zod";
import {
  Bell,
  CreditCard,
  Info,
  MapPin,
  Save,
  Smartphone,
  Store,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/shared/page-header";
import { useDemoLoading } from "@/components/shared/hydration-gate";
import { APP_NAME } from "@/lib/constants";
import { toEnDigits, toFa } from "@/lib/fa";

const DEMO_NOTE = "در نسخه نمایشی ذخیره‌سازی واقعی انجام نمی‌شود.";

/* --------------------------------- تب عمومی --------------------------------- */

const generalSchema = z.object({
  appName: z.string().trim().min(2, "نام سامانه را وارد کنید"),
  supportPhone: z
    .string()
    .trim()
    .refine((v) => /^0\d{10}$/.test(toEnDigits(v).replace(/\s/g, "")), "شماره تماس معتبر نیست (مثلاً ۰۲۱۹۱۰۰۹۱۰۰)"),
  email: z.string().trim().email("ایمیل معتبر نیست"),
  address: z.string().trim().min(5, "آدرس دفتر را وارد کنید"),
});
type GeneralValues = z.infer<typeof generalSchema>;

const GENERAL_DEFAULTS: GeneralValues = {
  appName: APP_NAME,
  supportPhone: "02191009100",
  email: "support@doktorha.ir",
  address: "تهران، خیابان ولیعصر، بالاتر از پارک ساعی، پلاک ۱۲۴، طبقه ۵",
};

function GeneralTab() {
  const form = useForm<GeneralValues>({
    resolver: zodResolver(generalSchema),
    defaultValues: GENERAL_DEFAULTS,
  });

  const submit = form.handleSubmit((values) => {
    toast.success("تنظیمات ذخیره شد (شبیه‌سازی)", {
      description: `نام سامانه: ${values.appName} — تغییرات فقط در همین صفحه باقی می‌ماند.`,
    });
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Store className="size-5 text-primary" aria-hidden />
          اطلاعات عمومی سامانه
        </CardTitle>
        <CardDescription>نام سامانه و اطلاعات تماس پشتیبانی که در پایین همه صفحات نمایش داده می‌شود.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={submit} className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="appName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>نام سامانه</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="supportPhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>تلفن پشتیبانی</FormLabel>
                    <FormControl>
                      <Input dir="ltr" inputMode="tel" placeholder="02191009100" className="text-start tabular-nums" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ایمیل پشتیبانی</FormLabel>
                  <FormControl>
                    <Input dir="ltr" type="email" placeholder="support@doktorha.ir" className="text-start" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>آدرس دفتر مرکزی</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                <Info className="size-3.5" aria-hidden />
                {DEMO_NOTE}
              </p>
              <Button type="submit">
                <Save className="size-4" aria-hidden />
                ذخیره تنظیمات
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

/* ----------------------------- تب درگاه پرداخت ----------------------------- */

const GATEWAYS: { key: string; label: string }[] = [
  { key: "zarinpal", label: "زرین‌پال" },
  { key: "idpay", label: "آیدی‌پی" },
  { key: "mellat", label: "ملت" },
];

function PaymentTab() {
  const [gateway, setGateway] = useState("zarinpal");
  const [merchantId, setMerchantId] = useState("MID-4F82A9C1");
  const [sandbox, setSandbox] = useState(true);

  const save = () => {
    toast.success("تنظیمات درگاه پرداخت ذخیره شد (شبیه‌سازی)", {
      description: `درگاه: ${GATEWAYS.find((g) => g.key === gateway)?.label} — حالت ${sandbox ? "آزمایشی" : "عملیاتی"}`,
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <CreditCard className="size-5 text-primary" aria-hidden />
            درگاه پرداخت آنلاین
          </CardTitle>
          <Badge variant="outline" className="border-amber-500/25 bg-amber-500/12 text-[10px] text-amber-700 dark:text-amber-400">
            نمایشی
          </Badge>
        </div>
        <CardDescription>تنظیمات اتصال به درگاه برای پرداخت نوبت‌ها، مشاوره‌ها و آزمایش‌ها.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>درگاه پرداخت</Label>
            <Select value={gateway} onValueChange={setGateway}>
              <SelectTrigger className="w-full" aria-label="انتخاب درگاه پرداخت">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {GATEWAYS.map((g) => (
                  <SelectItem key={g.key} value={g.key}>
                    {g.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="merchant-id">شناسه پذیرنده (Merchant ID)</Label>
            <Input
              id="merchant-id"
              dir="ltr"
              value={merchantId}
              onChange={(e) => setMerchantId(e.target.value)}
              className="text-start font-mono"
              placeholder="MID-XXXXXXXX"
            />
          </div>
        </div>
        <div className="flex items-center justify-between rounded-xl border p-3">
          <div className="space-y-0.5">
            <Label htmlFor="sandbox-switch">حالت آزمایشی (Sandbox)</Label>
            <p className="text-xs text-muted-foreground">پرداخت‌ها شبیه‌سازی می‌شوند و مبلغ واقعی کسر نمی‌شود.</p>
          </div>
          <Switch id="sandbox-switch" checked={sandbox} onCheckedChange={setSandbox} aria-label="حالت آزمایشی درگاه" />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            <Info className="size-3.5" aria-hidden />
            {DEMO_NOTE}
          </p>
          <Button onClick={save}>
            <Save className="size-4" aria-hidden />
            ذخیره تنظیمات
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/* -------------------------------- تب پیامک -------------------------------- */

const SMS_PROVIDERS: { key: string; label: string }[] = [
  { key: "kavenegar", label: "کاوه‌نگار" },
  { key: "melipayamak", label: "ملی‌پیامک" },
];

function SmsTab() {
  const [provider, setProvider] = useState("kavenegar");
  const [senderNumber, setSenderNumber] = useState("10004346");

  const save = () => {
    toast.success("تنظیمات پیامک ذخیره شد (شبیه‌سازی)", {
      description: `سرویس: ${SMS_PROVIDERS.find((p) => p.key === provider)?.label} — شماره فرستنده: ${toFa(senderNumber)}`,
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-center gap-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Smartphone className="size-5 text-primary" aria-hidden />
            سرویس پیامک
          </CardTitle>
          <Badge variant="outline" className="border-amber-500/25 bg-amber-500/12 text-[10px] text-amber-700 dark:text-amber-400">
            نمایشی
          </Badge>
        </div>
        <CardDescription>ارسال کد تأیید، یادآوری نوبت و اطلاع‌رسانی آزمایش به کاربران.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>سرویس‌دهنده</Label>
            <Select value={provider} onValueChange={setProvider}>
              <SelectTrigger className="w-full" aria-label="انتخاب سرویس پیامک">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SMS_PROVIDERS.map((p) => (
                  <SelectItem key={p.key} value={p.key}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="sms-sender">شماره فرستنده</Label>
            <Input
              id="sms-sender"
              dir="ltr"
              inputMode="numeric"
              value={senderNumber}
              onChange={(e) => setSenderNumber(e.target.value)}
              className="text-start tabular-nums"
              placeholder="10004346"
            />
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            <Info className="size-3.5" aria-hidden />
            {DEMO_NOTE}
          </p>
          <Button onClick={save}>
            <Save className="size-4" aria-hidden />
            ذخیره تنظیمات
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/* -------------------------------- تب اعلان‌ها -------------------------------- */

const NOTIFICATION_ITEMS: { key: string; label: string; description: string }[] = [
  { key: "newsletter", label: "خبرنامه", description: "ارسال مقالات و اخبار مجله سلامت برای کاربران" },
  { key: "appointment", label: "اعلان نوبت", description: "یادآوری نوبت حضوری و آنلاین برای بیماران" },
  { key: "ticket", label: "اعلان تیکت", description: "اطلاع‌رسانی پاسخ جدید در تیکت‌های پشتیبانی" },
];

function NotificationsTab() {
  const [toggles, setToggles] = useState<Record<string, boolean>>({
    newsletter: true,
    appointment: true,
    ticket: true,
  });

  const save = () => {
    const on = NOTIFICATION_ITEMS.filter((n) => toggles[n.key]).length;
    toast.success("تنظیمات اعلان‌ها ذخیره شد (شبیه‌سازی)", {
      description: `${toFa(on)} اعلان از ${toFa(NOTIFICATION_ITEMS.length)} اعلان فعال است.`,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Bell className="size-5 text-primary" aria-hidden />
          اعلان‌ها و اطلاع‌رسانی
        </CardTitle>
        <CardDescription>کانال‌های اطلاع‌رسانی درون‌برنامه‌ای و پیامکی برای کاربران.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {NOTIFICATION_ITEMS.map((n) => (
          <div key={n.key} className="flex items-center justify-between gap-3 rounded-xl border p-3">
            <div className="space-y-0.5">
              <Label htmlFor={`notif-${n.key}`}>{n.label}</Label>
              <p className="text-xs text-muted-foreground">{n.description}</p>
            </div>
            <Switch
              id={`notif-${n.key}`}
              checked={toggles[n.key]}
              onCheckedChange={(v) => setToggles((prev) => ({ ...prev, [n.key]: v }))}
              aria-label={n.label}
            />
          </div>
        ))}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            <Info className="size-3.5" aria-hidden />
            {DEMO_NOTE}
          </p>
          <Button onClick={save}>
            <Save className="size-4" aria-hidden />
            ذخیره تنظیمات
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/* -------------------------------- صفحه اصلی -------------------------------- */

export function AdminSettingsManager() {
  const loading = useDemoLoading();

  return (
    <div className="space-y-6">
      <PageHeader
        title="تنظیمات"
        description="پیکربندی عمومی سامانه، درگاه پرداخت، پیامک و اعلان‌ها — نسخه نمایشی"
        loading={loading}
      />

      <Alert>
        <MapPin className="size-4" aria-hidden />
        <AlertTitle>نسخه نمایشی</AlertTitle>
        <AlertDescription>
          همه تنظیمات این صفحه فقط در حافظه مرورگر و به‌صورت موقت نگه داشته می‌شوند؛ پس از بازخوانی صفحه به
          مقادیر اولیه برمی‌گردند.
        </AlertDescription>
      </Alert>

      <Tabs defaultValue="general" dir="rtl">
        <TabsList className="h-auto flex-wrap">
          <TabsTrigger value="general">عمومی</TabsTrigger>
          <TabsTrigger value="payment">درگاه پرداخت</TabsTrigger>
          <TabsTrigger value="sms">پیامک</TabsTrigger>
          <TabsTrigger value="notifications">اعلان‌ها</TabsTrigger>
        </TabsList>
        <TabsContent value="general">
          <GeneralTab />
        </TabsContent>
        <TabsContent value="payment">
          <PaymentTab />
        </TabsContent>
        <TabsContent value="sms">
          <SmsTab />
        </TabsContent>
        <TabsContent value="notifications">
          <NotificationsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

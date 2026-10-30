"use client";

/**
 * Fake login: phone number + OTP step (any 5-digit code works).
 * Plus a "ورود سریع" card logging in as one of the 4 seeded demo users.
 */

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, HeartPulse, LockKeyhole, Phone } from "lucide-react";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ROLE_HOME, ROLE_LABELS, type Role } from "@/lib/constants";
import { toEnDigits } from "@/lib/fa";
import { useAuthStore } from "@/store/auth-store";
import { UserAvatar } from "@/components/shared/user-avatar";

const QUICK: { role: Role; name: string; hue: number; desc: string }[] = [
  { role: "patient", name: "علی رضایی", hue: 210, desc: "رزرو نوبت، آزمایش، کیف پول" },
  { role: "doctor", name: "دکتر سارا محمدی", hue: 173, desc: "پوست و مو — تهران" },
  { role: "support", name: "نگار حسینی", hue: 330, desc: "پاسخ‌گویی به تیکت‌ها" },
  { role: "admin", name: "محمد کریمی", hue: 258, desc: "مدیریت کامل سامانه" },
];

export default function LoginPage() {
  const router = useRouter();
  const { loginAs, loginWithPhone } = useAuthStore();
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("0912-345-6789");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);

  const submitPhone = (e: React.FormEvent) => {
    e.preventDefault();
    const digits = toEnDigits(phone).replace(/\D/g, "");
    if (!/^09\d{9}$/.test(digits)) {
      toast.error("شماره موبایل معتبر نیست", { description: "شماره باید با ۰۹ شروع شده و ۱۱ رقم باشد." });
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setStep("otp");
      toast.info("کد تأیید پیامک شد (نمونه)", { description: "هر کد ۵ رقمی در این نسخه نمایشی پذیرفته می‌شود." });
    }, 600);
  };

  const submitOtp = (e: React.FormEvent) => {
    e.preventDefault();
    const code = toEnDigits(otp);
    if (code.length !== 5) {
      toast.error("کد تأیید باید ۵ رقم باشد");
      return;
    }
    setLoading(true);
    setTimeout(() => {
      const session = loginWithPhone(phone);
      toast.success(`خوش آمدید، ${session.name}!`, { description: "ورود به پنل بیمار انجام شد." });
      router.push(ROLE_HOME[session.role]);
    }, 700);
  };

  const quickLogin = (role: Role) => {
    const session = loginAs(role);
    toast.success(`ورود سریع انجام شد: ${session.name}`, { description: `به ${ROLE_LABELS[role]} خوش آمدید.` });
    router.push(ROLE_HOME[role]);
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-gradient-to-b from-teal-500/10 via-background to-background p-4">
      <div className="text-center">
        <Link href="/" className="inline-flex items-center gap-2.5">
          <span className="grid size-12 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-lg">
            <HeartPulse className="size-6" aria-hidden />
          </span>
          <span className="text-3xl font-extrabold">دکترها</span>
        </Link>
        <p className="mt-2 text-sm text-muted-foreground">پلتفرم سلامت و نوبت‌دهی آنلاین — نسخه نمایشی</p>
      </div>

      <div className="grid w-full max-w-4xl items-start gap-6 md:grid-cols-2">
        {/* phone / otp card */}
        <Card className="rounded-2xl shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg">ورود / ثبت‌نام</CardTitle>
            <CardDescription>با شماره موبایل وارد شوید؛ رمز عبور لازم نیست.</CardDescription>
          </CardHeader>
          <CardContent>
            {step === "phone" ? (
              <form onSubmit={submitPhone} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">شماره موبایل</Label>
                  <div className="relative">
                    <Phone className="absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                    <Input
                      id="phone"
                      dir="ltr"
                      inputMode="numeric"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="09xx-xxx-xxxx"
                      className="ps-9 text-start"
                      aria-label="شماره موبایل"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">به‌عنوان بیمار وارد می‌شوید (شماره نمونه: ۰۹۱۲۳۴۵۶۷۸۹)</p>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "در حال ارسال کد…" : "دریافت کد تأیید"}
                </Button>
              </form>
            ) : (
              <form onSubmit={submitOtp} className="space-y-4">
                <div className="space-y-2">
                  <Label>کد تأیید ۵ رقمی پیامک‌شده</Label>
                  <div dir="ltr" className="flex justify-center py-2">
                    <InputOTP maxLength={5} value={otp} onChange={setOtp} autoFocus>
                      <InputOTPGroup>
                        <InputOTPSlot index={0} />
                        <InputOTPSlot index={1} />
                        <InputOTPSlot index={2} />
                      </InputOTPGroup>
                      <InputOTPSeparator />
                      <InputOTPGroup>
                        <InputOTPSlot index={3} />
                        <InputOTPSlot index={4} />
                      </InputOTPGroup>
                    </InputOTP>
                  </div>
                  <p className="text-center text-xs text-muted-foreground">
                    در این نسخه نمایشی هر کد ۵ رقمی پذیرفته می‌شود.
                  </p>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  <LockKeyhole className="size-4" aria-hidden />
                  {loading ? "در حال ورود…" : "ورود به پنل بیمار"}
                </Button>
                <Button type="button" variant="ghost" className="w-full text-xs" onClick={() => setStep("phone")}>
                  تغییر شماره موبایل
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        {/* quick login card */}
        <Card className="rounded-2xl border-primary/20 bg-primary/5 shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg">ورود سریع (نسخه نمایشی)</CardTitle>
            <CardDescription>برای مرور سریع پنل‌ها روی یکی از کاربران نمونه کلیک کنید.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {QUICK.map((q) => (
              <button
                key={q.role}
                type="button"
                onClick={() => quickLogin(q.role)}
                className="flex w-full items-center gap-3 rounded-xl border bg-background p-3 text-start transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring"
              >
                <UserAvatar name={q.name} hue={q.hue} />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold">{q.name}</span>
                  <span className="block text-xs text-muted-foreground">{q.desc}</span>
                </span>
                <span className="rounded-lg bg-primary/10 px-2 py-1 text-xs font-medium text-primary">{ROLE_LABELS[q.role]}</span>
              </button>
            ))}
            <p className="pt-1 text-center text-[11px] text-muted-foreground">
              نسخه نمایشی فرانت‌اند — احراز هویت واقعی وجود ندارد و همه داده‌ها ساختگی هستند.
            </p>
          </CardContent>
        </Card>
      </div>

      <Link href="/" className="flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground">
        <ArrowLeft className="size-4" aria-hidden />
        بازگشت به صفحه اصلی
      </Link>
    </div>
  );
}

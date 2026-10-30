"use client";

/**
 * Temporary home page (Stage 1). Will be replaced by the full landing page in Stage 6.
 * Shows quick links to all parts of the demo.
 */

import Link from "next/link";
import { HeartPulse, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ROLE_LABELS, type Role } from "@/lib/constants";

const PANELS: { role: Role; href: string; desc: string }[] = [
  { role: "patient", href: "/patient", desc: "رزرو نوبت، مشاوره آنلاین، آزمایش، کیف پول" },
  { role: "doctor", href: "/doctor", desc: "تقویم، ساعات کاری، بیماران، مالی" },
  { role: "support", href: "/support", desc: "صندوق تیکت‌ها و پاسخ‌گویی" },
  { role: "admin", href: "/admin", desc: "مدیریت کامل سامانه" },
];

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 p-6">
      <div className="text-center">
        <div className="mb-3 inline-flex items-center gap-2.5">
          <span className="grid size-14 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-lg">
            <HeartPulse className="size-7" aria-hidden />
          </span>
          <h1 className="text-4xl font-extrabold">دکترها</h1>
        </div>
        <p className="text-muted-foreground">
          پلتفرم سلامت و نوبت‌دهی آنلاین — نسخه نمایشی فرانت‌اند (مرحله راه‌اندازی پایه)
        </p>
      </div>

      <div className="grid w-full max-w-3xl gap-4 sm:grid-cols-2">
        {PANELS.map((p) => (
          <Link key={p.role} href={p.href}>
            <Card className="h-full transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md">
              <CardHeader>
                <CardTitle className="text-lg">پنل {ROLE_LABELS[p.role]}</CardTitle>
                <CardDescription>{p.desc}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="outline" size="sm">
                  ورود به پنل
                  <LogIn className="size-4" aria-hidden />
                </Button>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <p className="text-xs text-muted-foreground">
        برای ورود به پنل‌ها از صفحه <Link href="/login" className="text-primary underline">ورود سریع</Link> استفاده کنید.
      </p>
    </div>
  );
}

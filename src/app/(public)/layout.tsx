"use client";

/**
 * (public) layout — هدر و فوتر سایت عمومی «دکترها».
 */

import Link from "next/link";
import { HeartPulse, LogIn, Menu } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ThemeToggle } from "@/components/shared/panel-shell";
import { APP_NAME } from "@/lib/constants";

const NAV = [
  { href: "/", label: "صفحه اصلی" },
  { href: "/doctors", label: "پزشکان" },
  { href: "/magazine", label: "مجله سلامت" },
];

function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2.5" aria-label="دکترها — صفحه اصلی">
      <span className="grid size-10 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
        <HeartPulse className="size-5" aria-hidden />
      </span>
      <span className="text-xl font-extrabold">{APP_NAME}</span>
    </Link>
  );
}

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="flex min-h-svh flex-col bg-gradient-to-b from-primary/5 via-transparent to-transparent">
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
          <Logo />

          <nav className="hidden items-center gap-1 md:flex" aria-label="ناوبری اصلی">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-xl px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button asChild size="sm" className="hidden sm:inline-flex">
              <Link href="/login">
                <LogIn className="size-4" aria-hidden />
                ورود / ثبت‌نام
              </Link>
            </Button>

            <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="md:hidden" aria-label="باز کردن منو">
                  <Menu className="size-4.5" aria-hidden />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72">
                <SheetHeader>
                  <SheetTitle className="text-start">{APP_NAME}</SheetTitle>
                </SheetHeader>
                <nav className="flex flex-col gap-1 px-4" aria-label="ناوبری موبایل">
                  {NAV.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMenuOpen(false)}
                      className="rounded-xl px-4 py-3 font-medium hover:bg-muted"
                    >
                      {item.label}
                    </Link>
                  ))}
                  <Button asChild className="mt-3">
                    <Link href="/login" onClick={() => setMenuOpen(false)}>
                      <LogIn className="size-4" aria-hidden />
                      ورود / ثبت‌نام
                    </Link>
                  </Button>
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t bg-muted/40">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 md:grid-cols-4">
          <div className="space-y-3">
            <Logo />
            <p className="text-sm leading-relaxed text-muted-foreground">
              پلتفرم نوبت‌دهی آنلاین پزشکان، مشاوره‌های تلفنی و ویدیویی و آزمایش در منزل —
              در سراسر ایران.
            </p>
          </div>
          <div>
            <p className="mb-3 font-bold">دسترسی سریع</p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="/doctors" className="hover:text-foreground">
                  جستجوی پزشک
                </Link>
              </li>
              <li>
                <Link href="/magazine" className="hover:text-foreground">
                  مجله سلامت
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-foreground">
                  ورود به پنل کاربری
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <p className="mb-3 font-bold">پنل‌ها</p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="/patient" className="hover:text-foreground">
                  پنل بیمار
                </Link>
              </li>
              <li>
                <Link href="/doctor" className="hover:text-foreground">
                  پنل پزشک
                </Link>
              </li>
              <li>
                <Link href="/support" className="hover:text-foreground">
                  پشتیبانی
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <p className="mb-3 font-bold">تماس با ما</p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>تهران، خیابان ولیعصر، برج سلامت</li>
              <li>پشتیبانی: ۰۲۱-۹۱۰۰۲۰۳۰</li>
              <li>همه‌روزه ۸ صبح تا ۱۰ شب</li>
            </ul>
          </div>
        </div>
        <div className="border-t py-4 text-center text-xs text-muted-foreground">
          {APP_NAME} — نسخه نمایشی؛ تمامی داده‌ها و کاربران ساختگی هستند.
        </div>
      </footer>
    </div>
  );
}

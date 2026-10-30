"use client";

/**
 * PanelShell — shared layout for the 4 admin panels:
 * RTL sidebar (right side), sticky topbar (breadcrumb, notifications,
 * theme toggle, user menu with quick role switcher), route guard.
 */

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bell,
  ChevronLeft,
  ChevronsLeft,
  Heart,
  LogOut,
  Menu,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  RotateCcw,
  Sun,
  UserRound,
} from "lucide-react";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
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
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { ROLE_HOME, ROLE_LABELS, type Role } from "@/lib/constants";
import { PANEL_NAVS, type PanelNav } from "@/lib/nav";
import { faFromNow } from "@/lib/jalali";
import { useAppStore } from "@/store/app-store";
import { useAuthStore } from "@/store/auth-store";
import { useUiStore } from "@/store/ui-store";
import { UserAvatar } from "@/components/shared/user-avatar";
import { StoreHydration } from "@/components/shared/hydration-gate";

/* ------------------------------ logo ------------------------------ */

function BrandMark({ collapsed }: { collapsed?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-accent">
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm">
        <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden>
          <path d="M12 5v14M5 12h14" />
        </svg>
      </span>
      {!collapsed && (
        <span className="leading-tight">
          <span className="block text-base font-extrabold">دکترها</span>
          <span className="block text-[11px] text-muted-foreground">پلتفرم سلامت آنلاین</span>
        </span>
      )}
    </Link>
  );
}

/* ---------------------------- sidebar ----------------------------- */

function SidebarContent({ panel, collapsed }: { panel: PanelNav; collapsed?: boolean }) {
  const pathname = usePathname();
  const { session } = useAuthStore();
  return (
    <div className="flex h-full flex-col gap-3 p-3">
      <div className={cn(collapsed && "flex justify-center")}>
        <BrandMark collapsed={collapsed} />
      </div>
      <Separator />
      <nav aria-label={panel.title} className="flex-1 space-y-1 overflow-y-auto pe-0.5">
        {panel.items.map((item) => {
          const active =
            item.href === `/${panel.role}`
              ? pathname === item.href
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              title={collapsed ? item.label : undefined}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                collapsed && "justify-center px-2"
              )}
            >
              <item.icon className="size-4.5 shrink-0" aria-hidden />
              {!collapsed && item.label}
            </Link>
          );
        })}
      </nav>
      <Separator />
      <Link
        href="/"
        className={cn(
          "flex items-center gap-3 rounded-xl px-3 py-2 text-xs text-muted-foreground transition-colors hover:bg-accent",
          collapsed && "justify-center px-2"
        )}
      >
        <ChevronLeft className="size-4 shrink-0" aria-hidden />
        {!collapsed && "بازگشت به سایت"}
      </Link>
      {session && !collapsed && (
        <div className="flex items-center gap-2.5 rounded-xl bg-muted/60 p-2.5">
          <UserAvatar name={session.name} hue={session.avatarHue} size="sm" />
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold">{session.name}</p>
            <p className="truncate text-[11px] text-muted-foreground">{ROLE_LABELS[session.role]}</p>
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------- notifications ------------------------- */

function NotificationsMenu() {
  const [open, setOpen] = useState(false);
  const { session } = useAuthStore();
  const notifications = useAppStore((s) => s.notifications);
  const markNotificationRead = useAppStore((s) => s.markNotificationRead);
  const markAllNotificationsRead = useAppStore((s) => s.markAllNotificationsRead);

  const mine = useMemo(
    () =>
      notifications.filter(
        (n) => n.role === session?.role && (n.userId === session?.userId || !n.userId)
      ),
    [notifications, session]
  );
  const unread = mine.filter((n) => !n.read).length;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative size-9" aria-label="اعلان‌ها">
          <Bell className="size-4.5" aria-hidden />
          {unread > 0 && (
            <span className="absolute -top-0.5 -end-0.5 grid size-4 place-items-center rounded-full bg-rose-500 text-[10px] font-bold text-white">
              {unread > 9 ? "۹+" : String(unread).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)])}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-3 py-2.5">
          <p className="text-sm font-semibold">اعلان‌ها</p>
          {unread > 0 && (
            <button
              type="button"
              className="text-xs text-primary hover:underline"
              onClick={() => {
                if (session) markAllNotificationsRead(session.role, session.userId);
                toast.success("همه اعلان‌ها خوانده شد");
              }}
            >
              علامت‌گذاری همه به‌عنوان خوانده‌شده
            </button>
          )}
        </div>
        <div className="max-h-80 overflow-y-auto">
          {mine.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">اعلان جدیدی ندارید</p>
          ) : (
            mine.slice(0, 10).map((n) => (
              <Link
                key={n.id}
                href={n.link ?? "#"}
                onClick={() => {
                  markNotificationRead(n.id);
                  setOpen(false);
                }}
                className={cn(
                  "flex items-start gap-2.5 border-b px-3 py-2.5 text-sm transition-colors last:border-b-0 hover:bg-muted/60",
                  !n.read && "bg-primary/5"
                )}
              >
                <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", n.read ? "bg-muted-foreground/30" : "bg-primary")} aria-hidden />
                <span className="min-w-0">
                  <span className="block font-medium">{n.title}</span>
                  <span className="line-clamp-2 block text-xs text-muted-foreground">{n.body}</span>
                  <span className="mt-0.5 block text-[11px] text-muted-foreground/70">{faFromNow(n.createdAtISO)}</span>
                </span>
              </Link>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

/* --------------------------- theme toggle -------------------------- */

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return (
    <Button
      variant="ghost"
      size="icon"
      className="size-9"
      aria-label={theme === "dark" ? "حالت روشن" : "حالت تاریک"}
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
    >
      {mounted && theme === "dark" ? (
        <Sun className="size-4.5" aria-hidden />
      ) : (
        <Moon className="size-4.5" aria-hidden />
      )}
    </Button>
  );
}

/* ---------------------------- user menu --------------------------- */

function UserMenu() {
  const { session, loginAs, logout } = useAuthStore();
  const resetDemoData = useAppStore((s) => s.resetDemoData);
  const router = useRouter();
  const pathname = usePathname();
  const [confirmReset, setConfirmReset] = useState(false);

  if (!session) return <Skeleton className="size-9 rounded-full" />;

  const switchRole = (role: Role) => {
    const newSession = loginAs(role);
    toast.success(`ورود به حساب ${ROLE_LABELS[role]} («${newSession.name}»)`, {
      description: "به پنل جدید منتقل شدید.",
    });
    router.push(ROLE_HOME[role]);
  };

  const settingsHref =
    session.role === "admin" || session.role === "support"
      ? `${ROLE_HOME[session.role]}/profile`
      : `${ROLE_HOME[session.role]}/settings`;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="rounded-full focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            aria-label="منوی کاربر"
          >
            <UserAvatar name={session.name} hue={session.avatarHue} size="sm" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel>
            <p className="font-semibold">{session.name}</p>
            <p className="text-xs font-normal text-muted-foreground">{ROLE_LABELS[session.role]}</p>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => router.push(settingsHref)}>
            <UserRound className="size-4" aria-hidden />
            پروفایل و تنظیمات
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <p className="px-2 py-1 text-[11px] font-medium text-muted-foreground">ورود سریع (تغییر نقش)</p>
          {(Object.keys(ROLE_LABELS) as Role[])
            .filter((r) => r !== session.role)
            .map((role) => (
              <DropdownMenuItem key={role} onClick={() => switchRole(role)}>
                <ChevronsLeft className="size-4" aria-hidden />
                ورود به‌عنوان {ROLE_LABELS[role]}
              </DropdownMenuItem>
            ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setConfirmReset(true)} variant="destructive">
            <RotateCcw className="size-4" aria-hidden />
            بازنشانی داده‌های نمونه
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              logout();
              toast("از حساب خارج شدید");
              router.push("/login");
            }}
          >
            <LogOut className="size-4" aria-hidden />
            خروج از حساب
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={confirmReset} onOpenChange={setConfirmReset}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>بازنشانی داده‌های نمونه؟</AlertDialogTitle>
            <AlertDialogDescription>
              تمام تغییرات شما (نوبت‌ها، تیکت‌ها، پیام‌ها و…) حذف و داده‌های اولیه نمایشی بازیابی می‌شوند. این عمل قابل بازگشت نیست.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>انصراف</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                resetDemoData();
                setConfirmReset(false);
                toast.success("داده‌های نمونه با موفقیت بازنشانی شد");
                router.refresh();
                router.push(pathname);
              }}
            >
              بله، بازنشانی کن
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

/* --------------------------- breadcrumbs -------------------------- */

function Breadcrumbs({ panel }: { panel: PanelNav }) {
  const pathname = usePathname();
  const crumbs = useMemo(() => {
    const segments = pathname.split("/").filter(Boolean);
    const items: { label: string; href: string }[] = [];
    let acc = "";
    for (const seg of segments) {
      acc += `/${seg}`;
      const navItem = panel.items.find((i) => i.href === acc);
      items.push({ label: navItem?.label ?? (seg === panel.role ? panel.title : "جزئیات"), href: acc });
    }
    return items;
  }, [pathname, panel]);

  return (
    <nav aria-label="مسیر صفحه" className="hidden items-center gap-1 text-sm md:flex">
      {crumbs.map((c, i) => (
        <span key={c.href} className="flex items-center gap-1">
          {i > 0 && <ChevronLeft className="size-3.5 text-muted-foreground/60" aria-hidden />}
          {i === crumbs.length - 1 ? (
            <span className="font-semibold">{c.label}</span>
          ) : (
            <Link href={c.href} className="text-muted-foreground transition-colors hover:text-foreground">
              {c.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  );
}

/* ---------------------------- topbar ------------------------------ */

function Topbar({ panel }: { panel: PanelNav }) {
  const collapsed = useUiStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-background/85 px-4 backdrop-blur-md lg:px-6">
      {/* mobile menu */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="size-9 lg:hidden" aria-label="باز کردن منو">
            <Menu className="size-5" aria-hidden />
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="w-72 p-0">
          <SheetTitle className="sr-only">منوی {panel.title}</SheetTitle>
          <SidebarContent panel={panel} />
        </SheetContent>
      </Sheet>

      {/* desktop collapse toggle */}
      <Button
        variant="ghost"
        size="icon"
        className="hidden size-9 lg:inline-flex"
        aria-label={collapsed ? "باز کردن نوار کنار" : "جمع کردن نوار کنار"}
        onClick={toggleSidebar}
      >
        {collapsed ? <PanelLeftOpen className="size-4.5" aria-hidden /> : <PanelLeftClose className="size-4.5" aria-hidden />}
      </Button>

      <Breadcrumbs panel={panel} />
      <div className="ms-auto flex items-center gap-1">
        <NotificationsMenu />
        <ThemeToggle />
        <UserMenu />
      </div>
    </header>
  );
}

/* ---------------------------- the shell ---------------------------- */

interface PanelShellProps {
  role: Role;
  children: ReactNode;
}

export function PanelShell({ role, children }: PanelShellProps) {
  const panel = PANEL_NAVS[role];
  const pathname = usePathname();
  const router = useRouter();
  const { session, _hasHydrated } = useAuthStore();
  const collapsed = useUiStore((s) => s.sidebarCollapsed);

  // simple client-side guard
  useEffect(() => {
    if (_hasHydrated && (!session || session.role !== role)) {
      toast.error("برای دسترسی به این بخش ابتدا وارد شوید", { description: `ورود سریع به ${panel.title}` });
      router.replace("/login");
    }
  }, [_hasHydrated, session, role, router, panel.title]);

  if (!_hasHydrated || !session || session.role !== role) {
    return (
      <div className="flex min-h-screen">
        <div className="hidden w-64 shrink-0 border-e bg-sidebar p-4 lg:block">
          <Skeleton className="h-10 w-40" />
          <div className="mt-6 space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-full" />
            ))}
          </div>
        </div>
        <div className="flex-1">
          <div className="flex h-16 items-center gap-3 border-b px-4 lg:px-6">
            <Skeleton className="size-9 rounded-full" />
            <Skeleton className="h-4 w-48" />
            <div className="ms-auto flex gap-2">
              <Skeleton className="size-9 rounded-lg" />
              <Skeleton className="size-9 rounded-lg" />
              <Skeleton className="size-9 rounded-full" />
            </div>
          </div>
          <div className="space-y-4 p-4 lg:p-6">
            <Skeleton className="h-8 w-56" />
            <div className="grid gap-4 md:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-28 rounded-2xl" />
              ))}
            </div>
            <Skeleton className="h-72 rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <StoreHydration />
      <div className="flex min-h-screen bg-background">
        {/* RTL: sidebar first in DOM = rendered on the right */}
        <aside
          className={cn(
            "hidden shrink-0 border-e bg-sidebar transition-[width] duration-200 lg:block",
            collapsed ? "w-[76px]" : "w-64"
          )}
        >
          <SidebarContent panel={panel} collapsed={collapsed} />
        </aside>
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar panel={panel} />
          <main id="main" className="flex-1 p-4 md:p-6 lg:p-8">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={pathname}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.18 }}
              >
                {children}
              </motion.div>
            </AnimatePresence>
          </main>
          <footer className="mt-auto border-t px-4 py-3 text-center text-xs text-muted-foreground lg:px-6">
            «دکترها» — نسخه نمایشی فرانت‌اند؛ تمام داده‌ها ساختگی هستند. <Heart className="inline size-3 text-rose-400" aria-hidden />
          </footer>
        </div>
      </div>
    </>
  );
}

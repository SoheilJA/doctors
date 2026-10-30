/**
 * Per-panel sidebar navigation config (Persian labels + Lucide icons).
 */

import {
  BookOpen,
  Building2,
  CalendarCheck,
  CalendarClock,
  CalendarDays,
  ClipboardCheck,
  FileText,
  FlaskConical,
  Gauge,
  Heart,
  Image,
  Inbox,
  Layers,
  LayoutDashboard,
  LifeBuoy,
  MessagesSquare,
  Newspaper,
  ScrollText,
  Search,
  Settings,
  ShieldCheck,
  Star,
  Stethoscope,
  TicketPercent,
  Users,
  UsersRound,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import type { Role } from "@/lib/constants";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export interface PanelNav {
  role: Role;
  title: string;
  items: NavItem[];
}

export const PANEL_NAVS: Record<Role, PanelNav> = {
  doctor: {
    role: "doctor",
    title: "پنل پزشک",
    items: [
      { href: "/doctor", label: "داشبورد", icon: LayoutDashboard },
      { href: "/doctor/calendar", label: "تقویم رزروها", icon: CalendarDays },
      { href: "/doctor/availability", label: "روزها و ساعات کاری", icon: CalendarClock },
      { href: "/doctor/appointments", label: "نوبت‌ها", icon: Stethoscope },
      { href: "/doctor/visits", label: "ویزیت‌های انجام‌شده", icon: ClipboardCheck },
      { href: "/doctor/consultations", label: "مشاوره‌های آنلاین", icon: MessagesSquare },
      { href: "/doctor/patients", label: "بیماران", icon: Users },
      { href: "/doctor/finance", label: "امور مالی", icon: Wallet },
      { href: "/doctor/reviews", label: "نظرات", icon: Star },
      { href: "/doctor/services", label: "خدمات و تعرفه‌ها", icon: Layers },
      { href: "/doctor/settings", label: "پروفایل و تنظیمات", icon: Settings },
      { href: "/doctor/support", label: "پشتیبانی", icon: LifeBuoy },
    ],
  },
  patient: {
    role: "patient",
    title: "پنل بیمار",
    items: [
      { href: "/patient", label: "داشبورد", icon: LayoutDashboard },
      { href: "/patient/find-doctor", label: "پیدا کردن پزشک", icon: Search },
      { href: "/patient/appointments", label: "نوبت‌های من", icon: CalendarCheck },
      { href: "/patient/consultations", label: "مشاوره‌های من", icon: MessagesSquare },
      { href: "/patient/labs", label: "آزمایش‌ها", icon: FlaskConical },
      { href: "/patient/records", label: "پرونده پزشکی", icon: ClipboardCheck },
      { href: "/patient/family", label: "اعضای خانواده", icon: UsersRound },
      { href: "/patient/wallet", label: "کیف پول", icon: Wallet },
      { href: "/patient/favorites", label: "علاقه‌مندی‌ها", icon: Heart },
      { href: "/patient/notifications", label: "اعلان‌ها", icon: Inbox },
      { href: "/patient/profile", label: "پروفایل", icon: Settings },
      { href: "/patient/support", label: "پشتیبانی", icon: LifeBuoy },
    ],
  },
  support: {
    role: "support",
    title: "پنل پشتیبانی",
    items: [
      { href: "/support", label: "داشبورد", icon: LayoutDashboard },
      { href: "/support/tickets", label: "صندوق تیکت‌ها", icon: Inbox },
      { href: "/support/canned", label: "پاسخ‌های آماده", icon: FileText },
      { href: "/support/faq", label: "دانش‌نامه", icon: BookOpen },
      { href: "/support/performance", label: "عملکرد من", icon: Gauge },
      { href: "/support/profile", label: "پروفایل", icon: Settings },
    ],
  },
  admin: {
    role: "admin",
    title: "پنل مدیریت",
    items: [
      { href: "/admin", label: "داشبورد", icon: LayoutDashboard },
      { href: "/admin/doctors", label: "پزشکان", icon: Stethoscope },
      { href: "/admin/patients", label: "کاربران", icon: Users },
      { href: "/admin/appointments", label: "نوبت‌ها و مشاوره‌ها", icon: CalendarDays },
      { href: "/admin/centers", label: "مراکز درمانی و آزمایشگاه‌ها", icon: Building2 },
      { href: "/admin/services", label: "خدمات و تخصص‌ها", icon: Layers },
      { href: "/admin/finance", label: "امور مالی", icon: Wallet },
      { href: "/admin/discounts", label: "کدهای تخفیف", icon: TicketPercent },
      { href: "/admin/reviews", label: "مدیریت نظرات", icon: Star },
      { href: "/admin/content", label: "مجله", icon: Newspaper },
      { href: "/admin/banners", label: "بنرها", icon: Image },
      { href: "/admin/support", label: "پشتیبانی", icon: LifeBuoy },
      { href: "/admin/staff", label: "کارکنان و نقش‌ها", icon: ShieldCheck },
      { href: "/admin/audit", label: "گزارش حسابرسی", icon: ScrollText },
      { href: "/admin/settings", label: "تنظیمات", icon: Settings },
    ],
  },
};

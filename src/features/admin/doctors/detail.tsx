"use client";

/**
 * /admin/doctors/[doctorId] — پروفایل کامل پزشک: اطلاعات، برنامه هفتگی، آمار،
 * نمودار نوبت‌های ۶ ماه اخیر، آخرین نظرات و عملیات مدیریتی.
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import type { ChartConfig } from "@/components/ui/chart";
import { ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import {
  Award,
  BadgeCheck,
  Ban,
  Banknote,
  CalendarDays,
  ChevronRight,
  GraduationCap,
  Languages,
  MapPin,
  MessageSquareQuote,
  PercentCircle,
  ShieldCheck,
  Star,
  Stethoscope,
  Wallet,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { LucideIcon } from "lucide-react";
import { ChartCard } from "@/components/shared/chart-card";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { RatingStars } from "@/components/shared/rating-stars";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { UserAvatar } from "@/components/shared/user-avatar";
import { useDemoLoading } from "@/components/shared/hydration-gate";
import { useAppStore } from "@/store/app-store";
import { DOCTOR_ACCOUNT_STATUS_LABELS, VERIFICATION_STATUS_LABELS } from "@/lib/constants";
import { faDateShort, faMonthLabel, jalaliMonthKey, subMonthsISO, todayISO } from "@/lib/jalali";
import { faNum, faPercent, toFa, toman, tomanCompact } from "@/lib/fa";
import { faRating, specialtyTitle, useAdminPanel } from "@/features/admin/shared";
import { CommissionDialog, RejectVerificationDialog, SuspendDoctorDialog } from "@/features/admin/doctors/dialogs";

const GENDER_LABELS: Record<"male" | "female", string> = { male: "مرد", female: "زن" };

export function AdminDoctorDetail({ doctorId }: { doctorId: string }) {
  const loading = useDemoLoading();
  const panel = useAdminPanel();
  const setDoctorVerification = useAppStore((s) => s.setDoctorVerification);
  const setDoctorAccountStatus = useAppStore((s) => s.setDoctorAccountStatus);

  const [rejectOpen, setRejectOpen] = useState(false);
  const [commissionOpen, setCommissionOpen] = useState(false);
  const [suspendOpen, setSuspendOpen] = useState(false);

  const doctor = panel.doctorMap.get(doctorId);

  const stats = useMemo(() => {
    if (!doctor) return null;
    const mine = panel.appointments.filter((a) => a.doctorId === doctor.id);
    const completed = mine.filter((a) => a.status === "completed");
    const paid = mine.filter((a) => a.paymentStatus === "paid");
    return {
      total: mine.length,
      completed: completed.length,
      gross: mine.reduce((s, a) => s + a.fee, 0),
      commission: paid.reduce((s, a) => s + a.commission, 0),
      paidCount: paid.length,
    };
  }, [doctor, panel.appointments]);

  const monthlyAppointments = useMemo(() => {
    if (!doctor) return [];
    return Array.from({ length: 6 }, (_, i) => {
      const key = jalaliMonthKey(subMonthsISO(todayISO(), 5 - i));
      return {
        key,
        label: faMonthLabel(key),
        count: panel.appointments.filter((a) => a.doctorId === doctor.id && jalaliMonthKey(a.date) === key).length,
      };
    });
  }, [doctor, panel.appointments]);

  const activeDays = useMemo(() => {
    if (!doctor) return [];
    return Object.entries(doctor.weeklySchedule)
      .filter(([, day]) => day.active)
      .map(([idx, day]) => ({
        index: Number(idx),
        label: ["شنبه", "یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه"][Number(idx)],
        ranges: day.ranges.length,
      }))
      .sort((a, b) => a.index - b.index);
  }, [doctor]);

  const latestReviews = useMemo(() => {
    if (!doctor) return [];
    return panel.reviews
      .filter((r) => r.doctorId === doctor.id)
      .sort((a, b) => b.createdAtISO.localeCompare(a.createdAtISO))
      .slice(0, 5);
  }, [doctor, panel.reviews]);

  const chartConfig = { count: { label: "نوبت", color: "var(--chart-1)" } } satisfies ChartConfig;

  if (!loading && !doctor) {
    return (
      <div className="space-y-6">
        <PageHeader title="جزئیات پزشک" description="پزشک مورد نظر یافت نشد" />
        <EmptyState
          icon={Stethoscope}
          title="پزشک یافت نشد"
          description="این شناسه در سیستم موجود نیست یا پزشک حذف شده است."
          action={
            <Button asChild variant="outline">
              <Link href="/admin/doctors">
                <ChevronRight className="size-4" aria-hidden />
                بازگشت به فهرست پزشکان
              </Link>
            </Button>
          }
        />
      </div>
    );
  }

  const verify = () => {
    if (!doctor) return;
    setDoctorVerification(doctor.id, "verified", panel.actorName);
    toast.success(`احراز هویت ${doctor.name} تأیید شد`, { description: "وضعیت حساب: فعال" });
  };
  const activate = () => {
    if (!doctor) return;
    setDoctorAccountStatus(doctor.id, "active", panel.actorName);
    toast.success(`حساب ${doctor.name} فعال شد`);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={doctor?.name ?? "جزئیات پزشک"}
        description={doctor ? `${specialtyTitle(doctor.specialtyId, panel.specialties)} — ${doctor.city}` : "در حال بارگذاری…"}
        loading={loading}
        actions={
          <>
            <Button asChild variant="outline" size="sm">
              <Link href="/admin/doctors">
                <ChevronRight className="size-4" aria-hidden />
                بازگشت
              </Link>
            </Button>
            {doctor?.verification === "pending" && (
              <>
                <Button size="sm" onClick={verify} className="bg-emerald-600 text-white hover:bg-emerald-700">
                  <BadgeCheck className="size-4" aria-hidden />
                  تأیید احراز
                </Button>
                <Button size="sm" variant="destructive" onClick={() => setRejectOpen(true)}>
                  <ShieldCheck className="size-4" aria-hidden />
                  رد احراز
                </Button>
              </>
            )}
            {doctor?.accountStatus === "active" && (
              <Button size="sm" variant="outline" onClick={() => setSuspendOpen(true)}>
                <Ban className="size-4 text-rose-500" aria-hidden />
                تعلیق حساب
              </Button>
            )}
            {doctor?.accountStatus === "suspended" && (
              <Button size="sm" onClick={activate} className="bg-emerald-600 text-white hover:bg-emerald-700">
                <BadgeCheck className="size-4" aria-hidden />
                فعال‌سازی
              </Button>
            )}
            {doctor && (
              <Button size="sm" variant="outline" onClick={() => setCommissionOpen(true)}>
                <PercentCircle className="size-4" aria-hidden />
                ویرایش کمیسیون
              </Button>
            )}
          </>
        }
      />

      <section className="grid gap-4 lg:grid-cols-3" aria-label="پروفایل و آمار پزشک">
        {/* profile card */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-start gap-4">
              {doctor ? <UserAvatar name={doctor.name} hue={doctor.avatarHue} size="xl" /> : <div className="size-20 rounded-full bg-muted" />}
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <CardTitle className="text-lg">{doctor?.name ?? "…"}</CardTitle>
                  {doctor && (
                    <>
                      <StatusBadge status={doctor.verification} label={VERIFICATION_STATUS_LABELS[doctor.verification]} />
                      <StatusBadge status={doctor.accountStatus} label={DOCTOR_ACCOUNT_STATUS_LABELS[doctor.accountStatus]} />
                    </>
                  )}
                </div>
                {doctor && (
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Stethoscope className="size-4" aria-hidden />
                      {specialtyTitle(doctor.specialtyId, panel.specialties)}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="size-4" aria-hidden />
                      {doctor.city}
                    </span>
                    <span>{GENDER_LABELS[doctor.gender]}</span>
                    <span className="tabular-nums">{faNum(doctor.experienceYears)} سال تجربه</span>
                    <span className="tabular-nums">پروانه: {toFa(doctor.licenseNumber)}</span>
                    <span className="flex items-center gap-1 tabular-nums">
                      <Star className="size-4 text-amber-500" aria-hidden />
                      {faRating(doctor.rating)} ({toFa(doctor.reviewCount)} نظر)
                    </span>
                  </div>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {doctor && (
              <>
                <p className="text-sm leading-7 text-muted-foreground">{doctor.bio}</p>
                <Separator />
                <div className="grid gap-3 sm:grid-cols-2">
                  <InfoList
                    icon={GraduationCap}
                    title="تحصیلات"
                    items={doctor.education.length ? doctor.education : ["—"]}
                  />
                  <InfoList icon={Award} title="مدارک و گواهی‌ها" items={doctor.certificates.length ? doctor.certificates : ["—"]} />
                  <InfoList icon={Languages} title="زبان‌های گفتگو" items={doctor.languages} />
                  <InfoList icon={ShieldCheck} title="بیمه‌های طرف قرارداد" items={doctor.insurers} />
                </div>
                <Separator />
                <div>
                  <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
                    <Banknote className="size-4 text-primary" aria-hidden />
                    تعرفه‌ها
                  </p>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {(
                      [
                        ["ویزیت حضوری", doctor.visitFee],
                        ["مشاوره تلفنی", doctor.phoneFee],
                        ["مشاوره متنی", doctor.textFee],
                        ["مشاوره ویدیویی", doctor.videoFee],
                      ] as const
                    ).map(([label, fee]) => (
                      <div key={label} className="rounded-xl border p-3 text-center">
                        <p className="text-[11px] text-muted-foreground">{label}</p>
                        <p className="mt-1 text-sm font-semibold tabular-nums">{toman(fee)}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <Separator />
                <div>
                  <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
                    <CalendarDays className="size-4 text-primary" aria-hidden />
                    برنامه هفتگی
                  </p>
                  {activeDays.length ? (
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground">
                        {toFa(activeDays.length)} روز فعال در هفته — در هر روز بین {toFa(Math.min(...activeDays.map((d) => d.ranges)))} تا{" "}
                        {toFa(Math.max(...activeDays.map((d) => d.ranges)))} بازه پذیرش
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {activeDays.map((d) => (
                          <Badge key={d.index} variant="secondary" className="text-xs">
                            {d.label} · {toFa(d.ranges)} بازه
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">برنامه هفتگی فعالی ثبت نشده است.</p>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* stats + mini chart */}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <StatCard
              title="کل نوبت‌ها"
              value={stats ? faNum(stats.total) : "…"}
              icon={CalendarDays}
              tone="sky"
              loading={loading}
            />
            <StatCard
              title="انجام‌شده"
              value={stats ? faNum(stats.completed) : "…"}
              icon={BadgeCheck}
              tone="emerald"
              loading={loading}
            />
            <StatCard
              title="درآمد ناخالص"
              value={stats ? tomanCompact(stats.gross) : "…"}
              icon={Wallet}
              tone="primary"
              loading={loading}
            />
            <StatCard
              title="کمیسیون پلتفرم"
              value={stats ? tomanCompact(stats.commission) : "…"}
              hint={doctor ? `نرخ: ${faPercent(doctor.commissionRate)}` : undefined}
              icon={PercentCircle}
              tone="amber"
              loading={loading}
            />
          </div>

          <ChartCard title="نوبت‌های ۶ ماه اخیر" description="تعداد نوبت در هر ماه شمسی" config={chartConfig} loading={loading}>
            <BarChart data={monthlyAppointments} margin={{ top: 8, left: 0, right: 8 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} reversed tick={{ fontSize: 10 }} />
              <YAxis tickLine={false} axisLine={false} width={28} allowDecimals={false} tickFormatter={(v) => faNum(Number(v))} />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    labelFormatter={(l) => String(l)}
                    formatter={(v) => [`${faNum(Number(v))} نوبت`, "تعداد"]}
                  />
                }
              />
              <Bar dataKey="count" fill="var(--color-count)" radius={6} />
            </BarChart>
          </ChartCard>
        </div>
      </section>

      {/* latest reviews */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageSquareQuote className="size-4 text-primary" aria-hidden />
            آخرین نظرات
          </CardTitle>
          <CardDescription className="text-xs">۵ نظر اخیر ثبت‌شده برای این پزشک</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-16 w-full animate-pulse rounded-xl bg-muted" />
              ))}
            </div>
          ) : latestReviews.length ? (
            <ul className="space-y-3">
              {latestReviews.map((r) => (
                <li key={r.id} className="rounded-xl border p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <RatingStars value={r.rating} />
                      <span className="text-xs text-muted-foreground">{panel.patientMap.get(r.patientId)?.name ?? "کاربر"}</span>
                    </div>
                    <span className="text-[11px] text-muted-foreground">{faDateShort(r.createdAtISO.split("T")[0])}</span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{r.comment}</p>
                  {r.reply && (
                    <p className="mt-2 rounded-lg bg-muted/60 p-2 text-xs text-muted-foreground">
                      <span className="font-medium">پاسخ پزشک: </span>
                      {r.reply}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState icon={MessageSquareQuote} title="نظری ثبت نشده است" description="برای این پزشک هنوز نظری ثبت نشده است." className="py-8" />
          )}
        </CardContent>
      </Card>

      <RejectVerificationDialog doctor={doctor ?? null} open={rejectOpen} onOpenChange={setRejectOpen} actorName={panel.actorName} />
      <CommissionDialog doctor={doctor ?? null} open={commissionOpen} onOpenChange={setCommissionOpen} actorName={panel.actorName} />
      <SuspendDoctorDialog doctor={doctor ?? null} open={suspendOpen} onOpenChange={setSuspendOpen} actorName={panel.actorName} />
    </div>
  );
}

function InfoList({ icon: Icon, title, items }: { icon: LucideIcon; title: string; items: string[] }) {
  return (
    <div>
      <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
        <Icon className="size-4" aria-hidden />
        {title}
      </p>
      <ul className="space-y-1 text-sm">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-1.5">
            <span className="mt-2 size-1 shrink-0 rounded-full bg-muted-foreground/60" aria-hidden />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

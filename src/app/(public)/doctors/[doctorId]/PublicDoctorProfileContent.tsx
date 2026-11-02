"use client";

/**
 * /doctors/[doctorId] — پروفایل عمومی پزشک: معرفی، تعرفه‌ها، نظرات و CTA رزرو.
 */

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo } from "react";
import {
  ArrowRight,
  BadgeCheck,
  CalendarClock,
  GraduationCap,
  Languages,
  MapPin,
  MessageCircle,
  Phone,
  SearchX,
  ShieldCheck,
  Video,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useDemoLoading, useStoreHydrated } from "@/components/shared/hydration-gate";
import { EmptyState } from "@/components/shared/empty-state";
import { RatingStars } from "@/components/shared/rating-stars";
import { UserAvatar } from "@/components/shared/user-avatar";
import { useAppStore } from "@/store/app-store";
import { faNum, toman } from "@/lib/fa";
import { addDaysISO, faDateShort, faFromNow, todayISO, JALALI_WEEKDAYS_SHORT } from "@/lib/jalali";
import { nextAvailableDate, workingDates } from "@/lib/schedule";
import {
  INSURERS,
  SPECIALTY_LABELS,
  VISIT_TYPE_LABELS,
} from "@/lib/constants";

export function PublicDoctorProfileContent() {
  const params = useParams<{ doctorId: string }>();
  const doctorId = Array.isArray(params.doctorId) ? params.doctorId[0] : params.doctorId;
  const hydrated = useStoreHydrated();
  const loading = useDemoLoading();
  const doctor = useAppStore((s) => s.doctors.find((d) => d.id === doctorId));
  const appointments = useAppStore((s) => s.appointments);
  const reviews = useAppStore((s) => s.reviews);
  const patients = useAppStore((s) => s.patients);

  const doctorReviews = useMemo(
    () =>
      reviews
        .filter((r) => r.doctorId === doctorId && r.status === "published")
        .sort((a, b) => b.createdAtISO.localeCompare(a.createdAtISO))
        .slice(0, 8),
    [reviews, doctorId],
  );

  const patientName = (pid: string) => patients.find((p) => p.id === pid)?.name ?? "کاربر دکترها";

  const nextAvail = useMemo(
    () => (doctor ? nextAvailableDate(doctor, appointments, 21) : null),
    [doctor, appointments],
  );

  const workingDaysCount = useMemo(() => {
    if (!doctor) return 0;
    return Object.values(doctor.weeklySchedule).filter((d) => d.active).length;
  }, [doctor]);

  const nextWeekWorkingDays = useMemo(() => {
    if (!doctor) return [] as string[];
    const today = todayISO();
    return workingDates(doctor, addDaysISO(today, 1), addDaysISO(today, 7));
  }, [doctor]);

  const fees = doctor
    ? [
        { key: "in-person", label: VISIT_TYPE_LABELS["in-person"], fee: doctor.visitFee, icon: CalendarClock },
        { key: "phone", label: VISIT_TYPE_LABELS.phone, fee: doctor.phoneFee, icon: Phone },
        { key: "text", label: VISIT_TYPE_LABELS.text, fee: doctor.textFee, icon: MessageCircle },
        { key: "video", label: VISIT_TYPE_LABELS.video, fee: doctor.videoFee, icon: Video },
      ]
    : [];

  if (!loading && hydrated && !doctor) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-16">
        <EmptyState
          icon={SearchX}
          title="پزشک یافت نشد"
          description="این صفحه وجود ندارد یا پزشک حذف شده است."
          action={
            <Button asChild size="sm">
              <Link href="/doctors">بازگشت به جستجو</Link>
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-10">
      <Button asChild variant="ghost" size="sm">
        <Link href="/doctors">
          <ArrowRight className="size-4" aria-hidden />
          بازگشت به فهرست پزشکان
        </Link>
      </Button>

      {loading || !hydrated || !doctor ? (
        <div className="space-y-4">
          <Skeleton className="h-44 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      ) : (
        <>
          {/* header card */}
          <Card className="overflow-hidden">
            <div
              aria-hidden
              className="h-20 bg-gradient-to-l from-primary/30 via-primary/15 to-transparent"
              style={{ background: `linear-gradient(to left, hsl(${doctor.avatarHue} 60% 45% / 0.35), transparent)` }}
            />
            <CardContent className="-mt-12 space-y-4 pb-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
                <div className="rounded-full border-4 border-card">
                  <UserAvatar name={doctor.name} hue={doctor.avatarHue} size="xl" />
                </div>
                <div className="flex-1 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-2xl font-extrabold">{doctor.name}</h1>
                    {doctor.verification === "verified" && (
                      <Badge className="gap-1 bg-emerald-600 hover:bg-emerald-600">
                        <ShieldCheck className="size-3" aria-hidden />
                        تأییدشده
                      </Badge>
                    )}
                  </div>
                  <p className="text-muted-foreground">
                    {SPECIALTY_LABELS[doctor.specialtyId]} • {faNum(doctor.experienceYears)} سال تجربه
                  </p>
                  <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <MapPin className="size-4" aria-hidden />
                      {doctor.city}
                    </span>
                    <RatingStars value={doctor.rating} count={doctor.reviewCount} size={15} />
                  </div>
                </div>
                <div className="flex flex-col gap-2 sm:items-end">
                  <Button asChild size="lg">
                    <Link href={`/patient/book/${doctor.id}`}>
                      <CalendarClock className="size-4.5" aria-hidden />
                      رزرو نوبت
                    </Link>
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    {nextAvail
                      ? `نزدیک‌ترین نوبت آزاد: ${faDateShort(nextAvail.dateISO)}`
                      : "در ۳ هفته آینده نوبت آزادی ثبت نشده"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-3">
            {/* main column */}
            <div className="space-y-6 lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">درباره پزشک</CardTitle>
                </CardHeader>
                <CardContent className="leading-relaxed text-muted-foreground">
                  {doctor.bio}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">تحصیلات و مدارک</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    {doctor.education.map((edu) => (
                      <p key={edu} className="flex items-start gap-2 text-sm">
                        <GraduationCap className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                        {edu}
                      </p>
                    ))}
                  </div>
                  <Separator />
                  <div className="flex flex-wrap gap-2">
                    {doctor.certificates.map((cert) => (
                      <Badge key={cert} variant="secondary">
                        <BadgeCheck className="me-1 size-3" aria-hidden />
                        {cert}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between text-lg">
                    نظرات کاربران
                    <span className="text-sm font-normal text-muted-foreground">
                      ({faNum(doctor.reviewCount)} نظر)
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {doctorReviews.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      هنوز نظری برای این پزشک ثبت نشده است.
                    </p>
                  ) : (
                    doctorReviews.map((review) => (
                      <div key={review.id} className="space-y-1.5 rounded-2xl border p-4">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-bold">{patientName(review.patientId)}</p>
                          <span className="text-xs text-muted-foreground">
                            {faFromNow(review.createdAtISO)}
                          </span>
                        </div>
                        <RatingStars value={review.rating} size={14} />
                        <p className="text-sm leading-relaxed text-muted-foreground">
                          {review.comment}
                        </p>
                        {review.reply && (
                          <div className="rounded-xl bg-muted p-3 text-sm">
                            <p className="mb-1 font-medium text-primary">پاسخ پزشک:</p>
                            <p className="leading-relaxed text-muted-foreground">{review.reply}</p>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>

            {/* sidebar */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">تعرفه‌ها</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {fees.map((f) => (
                    <div key={f.key} className="flex items-center justify-between rounded-xl border p-3">
                      <span className="flex items-center gap-2 text-sm">
                        <f.icon className="size-4 text-primary" aria-hidden />
                        {f.label}
                      </span>
                      <span className="font-bold">{toman(f.fee)}</span>
                    </div>
                  ))}
                  <p className="text-xs text-muted-foreground">
                    پرداخت آنلاین هنگام رزرو انجام می‌شود.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">برنامه درمانی</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <p className="flex items-center justify-between">
                    <span className="text-muted-foreground">روزهای کاری در هفته</span>
                    <span className="font-bold">{faNum(workingDaysCount)} روز</span>
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {(Object.keys(doctor.weeklySchedule)
                      .map(Number)
                      .sort((a, b) => a - b)
                    ).map((dayIndex) => {
                      const active = doctor.weeklySchedule[dayIndex].active;
                      return (
                        <span
                          key={dayIndex}
                          className={
                            active
                              ? "rounded-lg bg-primary/10 px-2 py-1 font-medium text-primary"
                              : "rounded-lg bg-muted px-2 py-1 text-muted-foreground line-through"
                          }
                        >
                          {JALALI_WEEKDAYS_SHORT[dayIndex]}
                        </span>
                      );
                    })}
                  </div>
                  <Separator />
                  <p className="text-muted-foreground">نوبت‌های آزاد هفته آینده:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {nextWeekWorkingDays.length === 0 ? (
                      <span className="text-muted-foreground">نوبت آزادی موجود نیست</span>
                    ) : (
                      nextWeekWorkingDays.map((d) => (
                        <Badge key={d} variant="outline">
                          {faDateShort(d)}
                        </Badge>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">اطلاعات تکمیلی</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                  <div>
                    <p className="mb-2 flex items-center gap-1.5 font-medium">
                      <Languages className="size-4 text-primary" aria-hidden />
                      زبان‌های گفتگو
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {doctor.languages.map((lang) => (
                        <Badge key={lang} variant="secondary">
                          {lang}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="mb-2 font-medium">بیمه‌های همکار</p>
                    <div className="flex flex-wrap gap-1.5">
                      {doctor.insurers.map((ins) => (
                        <Badge key={ins} variant="outline">
                          {ins}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <Separator />
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    نشانی مطب: {doctor.address}
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
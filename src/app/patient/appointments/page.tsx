"use client";

/**
 * نوبت‌های من — دو سربرگ «آینده» و «گذشته» با کارت‌های نوبت.
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { CalendarCheck, CalendarClock, ChevronLeft, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { useDemoLoading } from "@/components/shared/hydration-gate";
import { useAppStore } from "@/store/app-store";
import { faNum } from "@/lib/fa";
import { todayISO } from "@/lib/jalali";
import { AppointmentCard } from "@/features/patient/appointments/appointment-card";
import { useCurrentPatient } from "@/features/patient/helpers";

export default function MyAppointmentsPage() {
  const loading = useDemoLoading();
  const patient = useCurrentPatient();
  const appointments = useAppStore((s) => s.appointments);
  const doctors = useAppStore((s) => s.doctors);
  const reviews = useAppStore((s) => s.reviews);
  const [tab, setTab] = useState("upcoming");

  const today = todayISO();

  const mine = useMemo(() => appointments.filter((a) => a.patientId === patient?.id), [appointments, patient?.id]);

  const { upcoming, past } = useMemo(() => {
    const up = mine
      .filter((a) => (a.status === "pending" || a.status === "confirmed") && a.date >= today)
      .sort((a, b) => (a.date === b.date ? a.time.localeCompare(b.time) : a.date.localeCompare(b.date)));
    const ps = mine
      .filter((a) => !((a.status === "pending" || a.status === "confirmed") && a.date >= today))
      .sort((a, b) => (a.date === b.date ? b.time.localeCompare(a.time) : b.date.localeCompare(a.date)));
    return { upcoming: up, past: ps };
  }, [mine, today]);

  const reviewedIds = useMemo(() => new Set(reviews.filter((r) => r.appointmentId).map((r) => r.appointmentId!)), [reviews]);

  const renderList = (list: typeof upcoming) => {
    if (loading) {
      return (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
      );
    }
    if (!list.length) {
      return (
        <EmptyState
          icon={CalendarClock}
          title="نوبتی برای نمایش نیست"
          description="با جستجوی پزشکان، در چند کلیک نوبت جدید رزرو کنید."
          action={
            <Button asChild size="sm">
              <Link href="/patient/find-doctor">
                <Plus className="size-4" aria-hidden />
                رزرو نوبت جدید
              </Link>
            </Button>
          }
        />
      );
    }
    return (
      <div className="space-y-3">
        {list.map((a) => {
          const doctor = doctors.find((d) => d.id === a.doctorId);
          if (!doctor || !patient) return null;
          return (
            <AppointmentCard key={a.id} appointment={a} doctor={doctor} patient={patient} reviewed={reviewedIds.has(a.id)} />
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="نوبت‌های من"
        description="مدیریت نوبت‌های آینده و سابقه ویزیت‌های شما."
        loading={loading}
        actions={
          <Button size="sm" asChild>
            <Link href="/patient/find-doctor">
              <Plus className="size-4" aria-hidden />
              رزرو نوبت جدید
            </Link>
          </Button>
        }
      />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="upcoming" className="gap-1.5">
            <CalendarClock className="size-4" aria-hidden />
            آینده
            <span className="text-xs text-muted-foreground">({faNum(upcoming.length)})</span>
          </TabsTrigger>
          <TabsTrigger value="past" className="gap-1.5">
            <CalendarCheck className="size-4" aria-hidden />
            گذشته
            <span className="text-xs text-muted-foreground">({faNum(past.length)})</span>
          </TabsTrigger>
        </TabsList>
        <TabsContent value="upcoming" className="mt-4">
          {renderList(upcoming)}
        </TabsContent>
        <TabsContent value="past" className="mt-4">
          {renderList(past)}
        </TabsContent>
      </Tabs>

      <p className="flex items-center gap-1 text-xs text-muted-foreground">
        <ChevronLeft className="size-3.5" aria-hidden />
        لغو نوبت تا ۱۲ ساعت قبل از زمان ویزیت امکان‌پذیر است؛ وجه پرداختی تا ۷۲ ساعت بازگردانده می‌شود.
      </p>
    </div>
  );
}

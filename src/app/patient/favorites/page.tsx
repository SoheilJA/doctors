"use client";

/**
 * علاقه‌مندی‌ها — پزشکان نشان‌شده با امکان حذف و رزرو.
 */

import { useMemo } from "react";
import Link from "next/link";
import { Heart, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { faNum } from "@/lib/fa";
import { nextAvailableDate, type GeneratedSlot } from "@/lib/schedule";
import type { Appointment } from "@/types";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { useDemoLoading } from "@/components/shared/hydration-gate";
import { useAppStore } from "@/store/app-store";
import { DoctorCard } from "@/features/patient/doctor-card";
import { useCurrentPatient } from "@/features/patient/helpers";

export default function FavoritesPage() {
  const loading = useDemoLoading();
  const patient = useCurrentPatient();
  const favorites = useAppStore((s) => s.favorites);
  const doctors = useAppStore((s) => s.doctors);
  const appointments = useAppStore((s) => s.appointments);
  const toggleFavorite = useAppStore((s) => s.toggleFavorite);

  const favDoctors = useMemo(() => {
    if (!patient) return [];
    const ids = new Set(favorites.filter((f) => f.patientId === patient.id).map((f) => f.doctorId));
    return doctors.filter((d) => ids.has(d.id) && d.accountStatus === "active");
  }, [patient, favorites, doctors]);

  const nextAvailMap = useMemo(() => {
    const map = new Map<string, { dateISO: string; slot: GeneratedSlot } | null>();
    for (const doc of favDoctors) {
      const docAppointments = appointments.filter((a) => a.doctorId === doc.id);
      map.set(doc.id, nextAvailableDate(doc, docAppointments, 14));
    }
    return map;
  }, [favDoctors, appointments]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="علاقه‌مندی‌ها"
        description={`${faNum(favDoctors.length)} پزشک در فهرست علاقه‌مندی‌های شماست.`}
        loading={loading}
      />

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-72 rounded-2xl" />
          ))}
        </div>
      ) : favDoctors.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {favDoctors.map((doc) => (
            <DoctorCard
              key={doc.id}
              doctor={doc}
              nextAvail={nextAvailMap.get(doc.id) ?? null}
              isFavorite
              onToggleFavorite={() => {
                if (!patient) return;
                toggleFavorite(patient.id, doc.id);
                toast.success("از علاقه‌مندی‌ها حذف شد");
              }}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Heart}
          title="هنوز پزشکی به علاقه‌مندی‌ها اضافه نکرده‌اید"
          description="در جستجوی پزشکان، با زدن آیکون قلب، پزشک موردنظر را برای دسترسی سریع ذخیره کنید."
          action={
            <Button asChild size="sm">
              <Link href="/patient/find-doctor">
                <Search className="size-4" aria-hidden />
                پیدا کردن پزشک
              </Link>
            </Button>
          }
        />
      )}
    </div>
  );
}

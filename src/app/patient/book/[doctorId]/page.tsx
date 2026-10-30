"use client";

/**
 * رزرو نوبت — ویزارد ۶ مرحله‌ای برای پزشک انتخاب‌شده.
 */

import { useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useDemoLoading, useStoreHydrated } from "@/components/shared/hydration-gate";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { useAppStore } from "@/store/app-store";
import { BookingWizard } from "@/features/patient/booking/booking-wizard";
import { SearchX } from "lucide-react";

export default function BookDoctorPage() {
  const params = useParams<{ doctorId: string }>();
  const doctorId = Array.isArray(params.doctorId) ? params.doctorId[0] : params.doctorId;
  const router = useRouter();
  const hydrated = useStoreHydrated();
  const loading = useDemoLoading();
  const doctor = useAppStore((s) => s.doctors.find((d) => d.id === doctorId));

  useEffect(() => {
    if (hydrated && doctorId && !loading && (!doctor || doctor.accountStatus !== "active")) {
      router.replace("/patient/find-doctor");
    }
  }, [hydrated, doctorId, doctor, loading, router]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="رزرو نوبت"
        description="در ۴ گام ساده نوبت خود را رزرو و پرداخت کنید."
        loading={loading}
        actions={
          <Button variant="ghost" size="sm" asChild>
            <Link href="/patient/find-doctor">
              <ChevronRight className="size-4" aria-hidden />
              بازگشت به جستجو
            </Link>
          </Button>
        }
      />

      {loading || !hydrated ? (
        <div className="space-y-4">
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-12 rounded-2xl" />
          <Skeleton className="h-96 rounded-2xl" />
        </div>
      ) : doctor ? (
        <BookingWizard doctor={doctor} />
      ) : (
        <EmptyState
          icon={SearchX}
          title="پزشک یافت نشد"
          description="این پزشک وجود ندارد یا فعال نیست؛ پزشک دیگری را انتخاب کنید."
          action={
            <Button asChild size="sm">
              <Link href="/patient/find-doctor">پیدا کردن پزشک</Link>
            </Button>
          }
        />
      )}
    </div>
  );
}

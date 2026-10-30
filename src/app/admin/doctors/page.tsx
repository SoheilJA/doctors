"use client";

import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminDoctorsList } from "@/features/admin/doctors/list";

export default function AdminDoctorsPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      }
    >
      <AdminDoctorsList />
    </Suspense>
  );
}

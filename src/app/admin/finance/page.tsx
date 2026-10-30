"use client";

import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminFinanceManager } from "@/features/admin/finance/manager";

export default function AdminFinancePage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      }
    >
      <AdminFinanceManager />
    </Suspense>
  );
}

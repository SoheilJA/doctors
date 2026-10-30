"use client";

import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { SupportTicketsInbox } from "@/features/support/tickets/inbox";

export default function SupportTicketsPage() {
  return (
    <Suspense
      fallback={
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      }
    >
      <SupportTicketsInbox />
    </Suspense>
  );
}

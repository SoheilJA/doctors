"use client";

/** Page header with title, description and an optional actions slot. */

import type { ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  loading?: boolean;
}

export function PageHeader({ title, description, actions, loading }: PageHeaderProps) {
  if (loading) {
    return (
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
        {actions !== null && <Skeleton className="h-9 w-32" />}
      </div>
    );
  }
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-xl font-bold md:text-2xl">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

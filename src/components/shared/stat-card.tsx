"use client";

/** KPI stat card used on all dashboards. */

import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface StatCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  hint?: string;
  trend?: { value: string; positive?: boolean };
  tone?: "primary" | "sky" | "amber" | "emerald" | "rose" | "violet";
  loading?: boolean;
  onClick?: () => void;
}

const TONES: Record<string, string> = {
  primary: "bg-teal-500/12 text-teal-600 dark:text-teal-400",
  sky: "bg-sky-500/12 text-sky-600 dark:text-sky-400",
  amber: "bg-amber-500/12 text-amber-600 dark:text-amber-400",
  emerald: "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400",
  rose: "bg-rose-500/12 text-rose-600 dark:text-rose-400",
  violet: "bg-violet-500/12 text-violet-600 dark:text-violet-400",
};

export function StatCard({ title, value, icon: Icon, hint, trend, tone = "primary", loading, onClick }: StatCardProps) {
  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-start justify-between gap-3 p-4">
          <div className="space-y-2.5">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-7 w-32" />
          </div>
          <Skeleton className="size-11 rounded-xl" />
        </CardContent>
      </Card>
    );
  }
  return (
    <Card className={cn("group transition-all", onClick && "cursor-pointer hover:-translate-y-0.5 hover:shadow-md")}>
      <CardContent className="flex items-start justify-between gap-3 p-4" onClick={onClick}>
        <div className="min-w-0 space-y-1">
          <p className="truncate text-sm text-muted-foreground">{title}</p>
          <p className="truncate text-2xl font-bold tabular-nums">{value}</p>
          {hint && <p className="truncate text-xs text-muted-foreground">{hint}</p>}
          {trend && (
            <p className={cn("text-xs font-medium", trend.positive === false ? "text-rose-500" : "text-emerald-500")}>
              {trend.value}
            </p>
          )}
        </div>
        <div className={cn("rounded-xl p-2.5 shrink-0", TONES[tone])}>
          <Icon className="size-5" aria-hidden />
        </div>
      </CardContent>
    </Card>
  );
}

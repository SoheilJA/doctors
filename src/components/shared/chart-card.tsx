"use client";

/**
 * ChartCard: card wrapper around the shadcn ChartContainer (Recharts).
 * Charts keep an LTR internal direction (see globals.css) with Persian labels.
 */

import type { ReactElement, ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ChartContainer, type ChartConfig } from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface ChartCardProps {
  title: string;
  description?: string;
  config: ChartConfig;
  children: ReactElement; // the <BarChart>/<AreaChart> etc.
  className?: string;
  action?: ReactNode; // e.g. period selector
  loading?: boolean;
  legend?: ReactNode;
  height?: string;
}

export function ChartCard({
  title,
  description,
  config,
  children,
  className,
  action,
  loading,
  legend,
  height = "h-64",
}: ChartCardProps) {
  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="flex flex-row items-start justify-between gap-2 pb-0">
        <div className="space-y-1">
          <CardTitle className="text-base">{title}</CardTitle>
          {description && <CardDescription className="text-xs">{description}</CardDescription>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </CardHeader>
      <CardContent className="pt-2">
        {loading ? (
          <Skeleton className={cn("w-full rounded-xl", height)} />
        ) : (
          <>
            <ChartContainer config={config} className={cn("w-full", height)}>
              {children}
            </ChartContainer>
            {legend}
          </>
        )}
      </CardContent>
    </Card>
  );
}

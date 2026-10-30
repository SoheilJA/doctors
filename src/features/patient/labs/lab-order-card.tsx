"use client";

/**
 * LabOrderCard — کارت سفارش آزمایش با استپر عمودی مراحل، پرداخت و شبیه‌سازی پیشرفت.
 */

import { useMemo, useState } from "react";
import { CreditCard, Eye, FlaskConical, Play, Wallet } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { faNum, toFa, toman } from "@/lib/fa";
import { faDateTimeShort } from "@/lib/jalali";
import { LAB_ORDER_STATUS_LABELS, LAB_ORDER_STEPS, PAYMENT_STATUS_LABELS } from "@/lib/constants";
import type { LabOrder, MedicalCenter } from "@/types";
import { StatusBadge } from "@/components/shared/status-badge";
import { useAppStore } from "@/store/app-store";
import { LabResultDialog } from "./lab-result-dialog";

interface LabOrderCardProps {
  order: LabOrder;
  lab: MedicalCenter | undefined;
}

export function LabOrderCard({ order, lab }: LabOrderCardProps) {
  const payLabOrder = useAppStore((s) => s.payLabOrder);
  const setLabOrderStatus = useAppStore((s) => s.setLabOrderStatus);
  const [resultOpen, setResultOpen] = useState(false);

  const currentIdx = LAB_ORDER_STEPS.indexOf(order.status);

  const nextStep = useMemo(() => {
    const idx = LAB_ORDER_STEPS.indexOf(order.status);
    if (idx < 0 || idx >= LAB_ORDER_STEPS.length - 1) return null;
    return LAB_ORDER_STEPS[idx + 1];
  }, [order.status]);

  const simulateNext = () => {
    if (!nextStep) return;
    setLabOrderStatus(order.id, nextStep);
    toast.info("مرحله سفارش پیش رفت (شبیه‌سازی آزمایشگاه)", {
      description: `وضعیت جدید: «${LAB_ORDER_STATUS_LABELS[nextStep]}»`,
    });
  };

  const pay = () => {
    payLabOrder(order.id);
    toast.success("پرداخت آزمایش انجام شد", { description: `${toFa(order.code)} — ${toman(order.totalFee)}` });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2 pb-2">
        <div className="min-w-0 space-y-1">
          <CardTitle className="flex flex-wrap items-center gap-2 text-base">
            <FlaskConical className="size-4.5 text-violet-500" aria-hidden />
            {lab?.name ?? "آزمایشگاه"}
            <Badge variant="outline" className="text-xs tabular-nums">
              {toFa(order.code)}
            </Badge>
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            {faNum(order.tests.length)} آزمایش • ثبت {faDateTimeShort(order.createdAtISO)}
            {order.homeSampling && " • نمونه‌گیری در منزل"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <StatusBadge status={order.status} label={LAB_ORDER_STATUS_LABELS[order.status]} />
          <StatusBadge status={order.paymentStatus} label={PAYMENT_STATUS_LABELS[order.paymentStatus]} />
          <Badge variant="outline" className="font-bold tabular-nums">{toman(order.totalFee)}</Badge>
        </div>
      </CardHeader>

      <CardContent className="grid gap-4 md:grid-cols-[1fr_auto]">
        {/* tests + actions */}
        <div className="space-y-3">
          <div className="flex flex-wrap gap-1.5">
            {order.tests.map((t) => (
              <Badge key={t.id} variant="secondary" className="max-w-full truncate text-xs">
                {t.name}
              </Badge>
            ))}
          </div>

          {order.status === "review" && (
            <p className="rounded-xl bg-amber-500/10 px-3 py-2 text-xs font-medium text-amber-700 dark:text-amber-400">
              در انتظار تأیید آزمایشگاه؛ پس از تأیید، امکان پرداخت وجود دارد.
            </p>
          )}

          <div className="flex flex-wrap items-center gap-2">
            {order.paymentStatus === "unpaid" && order.status !== "review" && (
              <Button size="sm" className="gap-1.5" onClick={pay}>
                <CreditCard className="size-4" aria-hidden />
                پرداخت {toman(order.totalFee)}
              </Button>
            )}
            {order.status === "received" && (
              <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setResultOpen(true)}>
                <Eye className="size-4" aria-hidden />
                مشاهده جواب
              </Button>
            )}
            {nextStep && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="sm" variant="secondary" className="gap-1.5 text-muted-foreground" onClick={simulateNext}>
                    <Play className="size-3.5" aria-hidden />
                    شبیه‌سازی پیشرفت مرحله
                  </Button>
                </TooltipTrigger>
                <TooltipContent>نسخه نمایشی</TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>

        {/* vertical stepper */}
        <ol className="relative ms-3 space-y-3 border-s-2 ps-4 md:max-w-56" aria-label="مراحل سفارش">
          {LAB_ORDER_STEPS.map((step, idx) => {
            const entry = order.history.find((h) => h.status === step);
            const done = idx < currentIdx;
            const current = idx === currentIdx;
            return (
              <li key={step} className="relative">
                <span
                  className={cn(
                    "absolute -start-[21px] top-1 size-2.5 rounded-full",
                    done && "bg-emerald-500",
                    current && "animate-pulse bg-primary ring-4 ring-primary/20",
                    !done && !current && "bg-muted-foreground/25"
                  )}
                  aria-hidden
                />
                <p className={cn("text-xs font-semibold", !done && !current && "text-muted-foreground/60", current && "text-primary")}>
                  {LAB_ORDER_STATUS_LABELS[step]}
                </p>
                <p className="text-[11px] text-muted-foreground tabular-nums">
                  {entry ? faDateTimeShort(entry.atISO) : "—"}
                </p>
              </li>
            );
          })}
        </ol>
      </CardContent>

      <LabResultDialog open={resultOpen} onOpenChange={setResultOpen} order={order} labName={lab?.name ?? ""} />
    </Card>
  );
}

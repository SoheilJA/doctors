"use client";

/**
 * LabResultDialog — نمایش جواب آزمایش (نسخه PDF نمونه + یادداشت نتیجه).
 */

import { Download, FileText, FlaskConical } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toFa, toman } from "@/lib/fa";
import { faDateTimeShort } from "@/lib/jalali";
import { LAB_ORDER_STATUS_LABELS } from "@/lib/constants";
import type { LabOrder } from "@/types";
import { StatusBadge } from "@/components/shared/status-badge";

interface LabResultDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  order: LabOrder;
  labName: string;
}

export function LabResultDialog({ open, onOpenChange, order, labName }: LabResultDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FlaskConical className="size-5 text-violet-500" aria-hidden />
            جواب آزمایش {toFa(order.code)}
          </DialogTitle>
          <DialogDescription>
            {labName} — {faDateTimeShort(order.createdAtISO)}
          </DialogDescription>
        </DialogHeader>

        {/* PDF placeholder */}
        <div className="rounded-2xl border bg-white p-5 text-slate-800 shadow-inner dark:text-slate-800">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div className="flex items-center gap-2">
              <FileText className="size-5 text-violet-600" aria-hidden />
              <div>
                <p className="text-sm font-bold">{labName}</p>
                <p className="text-[11px] text-slate-500">گزارش آزمایش پزشکی — نسخه PDF جواب آزمایش — نمونه</p>
              </div>
            </div>
            <Badge className="bg-emerald-600 text-white">{LAB_ORDER_STATUS_LABELS[order.status]}</Badge>
          </div>
          <div className="mt-3 space-y-2 text-xs" aria-label="خلاصه آزمایش‌ها">
            {order.tests.map((t, i) => (
              <div key={t.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
                <span className="font-medium">
                  {toFa(i + 1)}. {t.name}
                </span>
                <span className="font-bold text-emerald-700">در محدوده نرمال</span>
              </div>
            ))}
          </div>
          <p className="mt-3 border-t border-slate-200 pt-3 text-xs leading-relaxed text-slate-600">
            {order.resultNote ?? "همه مقادیر در محدوده نرمال هستند؛ نتیجه تفصیلی در فایل PDF پیوست است."}
          </p>
          <p className="mt-2 text-[10px] text-slate-400">
            این صفحه صرفاً نمونه نمایشی است و داده‌های واقعی آزمایشگاهی ندارد. مبلغ سفارش: {toman(order.totalFee)}
          </p>
        </div>

        <DialogFooter className="flex-row-reverse sm:justify-between">
          <StatusBadge status={order.status} label={LAB_ORDER_STATUS_LABELS[order.status]} />
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            onClick={() => toast.success("دانلود شبیه‌سازی شد", { description: `فایل جواب ${toFa(order.code)}.pdf` })}
          >
            <Download className="size-4" aria-hidden />
            دانلود PDF جواب
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

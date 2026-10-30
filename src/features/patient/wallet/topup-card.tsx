"use client";

/**
 * TopupCard — شارژ کیف پول: مبالغ آماده، مبلغ دلخواه، کد تخفیف و شبیه‌سازی درگاه.
 */

import { useState } from "react";
import { BadgePercent, Landmark, Wallet } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { faNum, toman } from "@/lib/fa";
import { todayISO } from "@/lib/jalali";
import { useAppStore } from "@/store/app-store";
import { useCurrentPatient, validateDiscount, type DiscountResult } from "@/features/patient/helpers";

const PRESETS = [200_000, 500_000, 1_000_000] as const;
const PRESET_LABELS = ["۲۰۰ هزار", "۵۰۰ هزار", "۱ میلیون"] as const;

interface TopupCardProps {
  balance: number;
}

export function TopupCard({ balance }: TopupCardProps) {
  const patient = useCurrentPatient();
  const discountCodes = useAppStore((s) => s.discountCodes);
  const topupWallet = useAppStore((s) => s.topupWallet);

  const [amount, setAmount] = useState<number>(PRESETS[1]);
  const [customAmount, setCustomAmount] = useState("");
  const [codeInput, setCodeInput] = useState("");
  const [discount, setDiscount] = useState<DiscountResult | null>(null);
  const [paying, setPaying] = useState(false);

  const effectiveAmount = customAmount.trim() ? parseAmount(customAmount) : amount;

  const applyCode = () => {
    const result = validateDiscount(codeInput, effectiveAmount, discountCodes, todayISO());
    if (!result.ok) {
      setDiscount(null);
      toast.error(result.message);
      return;
    }
    setDiscount(result);
    toast.success(result.message, {
      description: "مبلغ هدیه به‌علاوه شارژ شما، پس از پرداخت به کیف پول اضافه می‌شود.",
    });
  };

  const topup = () => {
    if (!patient) return;
    if (!effectiveAmount || effectiveAmount < 10_000) {
      toast.error("حداقل مبلغ شارژ ۱۰ هزار تومان است");
      return;
    }
    setPaying(true);
    // شبیه‌سازی درگاه (۶۰۰ms)
    setTimeout(() => {
      const bonus = discount?.ok ? Math.round((effectiveAmount * (discount.percent ?? 0)) / 100) : 0;
      topupWallet(patient.id, effectiveAmount + bonus, discount?.ok ? codeInput.trim().toUpperCase() : undefined);
      setPaying(false);
      setCustomAmount("");
      setDiscount(null);
      setCodeInput("");
      toast.success("کیف پول با موفقیت شارژ شد", {
        description: bonus
          ? `شارژ ${toman(effectiveAmount)} + هدیه ${toman(bonus)} به کیف پول شما اضافه شد.`
          : `${toman(effectiveAmount)} به کیف پول شما اضافه شد.`,
      });
    }, 600);
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Landmark className="size-4.5 text-primary" aria-hidden />
          شارژ کیف پول
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* presets */}
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p, i) => (
            <button
              key={p}
              type="button"
              onClick={() => {
                setAmount(p);
                setCustomAmount("");
                setDiscount(null);
              }}
              className={cn(
                "rounded-xl border px-4 py-2 text-sm font-semibold transition-colors",
                !customAmount.trim() && amount === p
                  ? "border-primary bg-primary/10 text-primary"
                  : "hover:border-primary/40"
              )}
            >
              {PRESET_LABELS[i]}
              <span className="ms-1 text-[11px] font-normal text-muted-foreground">تومان</span>
            </button>
          ))}
        </div>

        {/* custom amount */}
        <div className="space-y-1.5">
          <Label htmlFor="custom-amount">مبلغ دلخواه (تومان)</Label>
          <Input
            id="custom-amount"
            value={customAmount}
            onChange={(e) => {
              setCustomAmount(e.target.value);
              setDiscount(null);
            }}
            inputMode="numeric"
            placeholder="مثلاً ۲۵۰٬۰۰۰"
            dir="ltr"
            className="text-start tabular-nums"
          />
          {customAmount.trim() && (
            <p className="text-xs text-muted-foreground tabular-nums">
              مبلغ انتخابی: {toman(effectiveAmount || 0)}
            </p>
          )}
        </div>

        {/* discount code */}
        <div className="space-y-1.5">
          <Label htmlFor="topup-code" className="flex items-center gap-1.5">
            <BadgePercent className="size-3.5" aria-hidden />
            کد تخفیف (اختیاری)
          </Label>
          <div className="flex gap-2">
            <Input
              id="topup-code"
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value)}
              placeholder="مثلاً WELCOME15"
              dir="ltr"
              className="text-start"
            />
            <Button type="button" variant="secondary" onClick={applyCode}>
              اعمال تخفیف
            </Button>
          </div>
          {discount?.ok && (
            <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
              {discount.message} — هدیه: {toman(Math.round((effectiveAmount * (discount.percent ?? 0)) / 100))}
            </Badge>
          )}
        </div>

        <div className="flex items-center justify-between rounded-xl border bg-muted/50 px-3 py-2.5 text-sm">
          <span className="text-muted-foreground">موجودی فعلی</span>
          <span className="font-bold tabular-nums">{toman(balance)}</span>
        </div>

        <Button className="w-full gap-2" size="lg" disabled={paying || !patient} onClick={topup}>
          <Wallet className="size-4.5" aria-hidden />
          {paying ? "اتصال به درگاه پرداخت…" : "شارژ کیف پول"}
        </Button>
        <p className="text-center text-[11px] text-muted-foreground">
          در نسخه نمایشی، پرداخت بانکی شبیه‌سازی می‌شود ({faNum(1)} ثانیه) و وجه بلافاصله اضافه می‌شود.
        </p>
      </CardContent>
    </Card>
  );
}

function parseAmount(input: string): number {
  const normalized = input.replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)));
  const digits = normalized.replace(/[^\d]/g, "");
  const n = Number(digits);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

"use client";

/**
 * /doctor/reviews — rating summary, distribution bars (۵→۱) and the full
 * review list with inline doctor replies (replyToReview).
 */

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { MessageSquareReply, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { RatingStars } from "@/components/shared/rating-stars";
import { useDemoLoading } from "@/components/shared/hydration-gate";
import { useAppStore } from "@/store/app-store";
import { faFromNow } from "@/lib/jalali";
import { faPercent, faNum, toFa } from "@/lib/fa";
import { useDoctorPanel } from "@/features/doctor/shared";

const STAR_LABELS: Record<number, string> = {
  5: "عالی",
  4: "خوب",
  3: "متوسط",
  2: "ضعیف",
  1: "بسیار ضعیف",
};

export function ReviewsContent() {
  const loading = useDemoLoading();
  const { doctor, reviews, patientMap } = useDoctorPanel();
  const replyToReview = useAppStore((s) => s.replyToReview);
  const [replyingFor, setReplyingFor] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");

  const sorted = useMemo(() => [...reviews].sort((a, b) => b.createdAtISO.localeCompare(a.createdAtISO)), [reviews]);

  const distribution = useMemo(() => {
    const counts = new Map<number, number>();
    for (const r of reviews) counts.set(r.rating, (counts.get(r.rating) ?? 0) + 1);
    return [5, 4, 3, 2, 1].map((star) => ({
      star,
      count: counts.get(star) ?? 0,
      percent: reviews.length ? ((counts.get(star) ?? 0) / reviews.length) * 100 : 0,
    }));
  }, [reviews]);

  const sendReply = (reviewId: string) => {
    if (!replyText.trim()) {
      toast.error("متن پاسخ خالی است");
      return;
    }
    replyToReview(reviewId, replyText.trim());
    setReplyingFor(null);
    setReplyText("");
    toast.success("پاسخ شما ثبت شد");
  };

  const avg = doctor?.rating ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader title="نظرات" description="بازخوردهای بیماران درباره شما" loading={loading} />

      {/* summary + distribution */}
      <section className="grid gap-4 lg:grid-cols-3" aria-label="خلاصه نظرات">
        <Card className="flex flex-col items-center justify-center gap-2 p-6 text-center">
          <RatingStars value={avg} size={28} />
          <p className="text-4xl font-extrabold tabular-nums">{toFa(avg.toFixed(1))}</p>
          <p className="text-sm text-muted-foreground">میانگین از ۵ — بر اساس {toFa(doctor?.reviewCount ?? reviews.length)} نظر</p>
          <p className="text-xs text-muted-foreground">
            {faPercent(distribution.find((d) => d.star === 5)!.percent)} از بیماران امتیاز «عالی» داده‌اند
          </p>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">توزیع امتیازها</CardTitle>
            <CardDescription className="text-xs">سهم هر امتیاز از کل نظرات</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {distribution.map((d) => (
              <div key={d.star} className="flex items-center gap-3 text-sm">
                <span className="flex w-24 shrink-0 items-center gap-1 font-medium">
                  <Star className="size-4 fill-amber-400 text-amber-400" aria-hidden />
                  {toFa(d.star)} — {STAR_LABELS[d.star]}
                </span>
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${d.percent}%` }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    className="h-full rounded-full bg-amber-400"
                  />
                </div>
                <span className="w-20 shrink-0 text-end text-xs text-muted-foreground tabular-nums">
                  {faNum(d.count)} ({faPercent(d.percent)})
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>

      {/* list */}
      <section aria-label="فهرست نظرات">
        {loading ? (
          <div className="grid gap-4 md:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-40 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        ) : sorted.length === 0 ? (
          <EmptyState icon={Star} title="هنوز نظری ثبت نشده است" description="پس از انجام ویزیت‌ها، بیماران می‌توانند نظر بدهند." />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {sorted.map((r) => {
              const patient = patientMap.get(r.patientId);
              return (
                <motion.div
                  key={r.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                  whileHover={{ y: -2 }}
                >
                  <Card className="h-full">
                    <CardContent className="space-y-3 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div>
                            <p className="text-sm font-semibold">{patient?.name ?? "بیمار"}</p>
                            <p className="text-[11px] text-muted-foreground">{faFromNow(r.createdAtISO.split("T")[0])}</p>
                          </div>
                        </div>
                        <RatingStars value={r.rating} />
                      </div>
                      <p className="text-sm leading-relaxed text-muted-foreground">{r.comment}</p>

                      {r.reply ? (
                        <div className="rounded-xl bg-muted/60 p-3 text-sm">
                          <p className="mb-1 text-[11px] font-semibold text-muted-foreground">پاسخ شما</p>
                          <p className="leading-relaxed">{r.reply}</p>
                        </div>
                      ) : replyingFor === r.id ? (
                        <div className="space-y-2">
                          <Textarea
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            placeholder="پاسخ خود را بنویسید…"
                            className="min-h-20 text-sm"
                            aria-label="متن پاسخ"
                          />
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => sendReply(r.id)}>
                              ارسال پاسخ
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => { setReplyingFor(null); setReplyText(""); }}>
                              انصراف
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <Button size="sm" variant="outline" className="h-8" onClick={() => setReplyingFor(r.id)}>
                          <MessageSquareReply className="size-3.5" aria-hidden />
                          پاسخ دادن
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

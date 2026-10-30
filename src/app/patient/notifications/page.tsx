"use client";

/**
 * اعلان‌ها — فهرست کامل اعلان‌های بیمار با خوانده‌شده/نخوانده و حرکت به لینک.
 */

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { CheckCheck, Inbox } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { faNum } from "@/lib/fa";
import { faFromNow } from "@/lib/jalali";
import type { AppNotification } from "@/types";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { useDemoLoading } from "@/components/shared/hydration-gate";
import { useAppStore } from "@/store/app-store";
import { useAuthStore } from "@/store/auth-store";

export default function PatientNotificationsPage() {
  const loading = useDemoLoading();
  const router = useRouter();
  const session = useAuthStore((s) => s.session);
  const notifications = useAppStore((s) => s.notifications);
  const markNotificationRead = useAppStore((s) => s.markNotificationRead);
  const markAllNotificationsRead = useAppStore((s) => s.markAllNotificationsRead);

  /** اعلان‌های نقش بیمار: شخصی (userId من) یا عمومی نقش (بدون userId) */
  const mine = useMemo(
    () =>
      notifications
        .filter((n) => n.role === "patient" && (!n.userId || n.userId === session?.patientId))
        .sort((a, b) => b.createdAtISO.localeCompare(a.createdAtISO)),
    [notifications, session?.patientId]
  );

  const unread = mine.filter((n) => !n.read).length;

  const open = (n: AppNotification) => {
    markNotificationRead(n.id);
    if (n.link) router.push(n.link);
  };

  const markAll = () => {
    if (!session?.patientId) return;
    markAllNotificationsRead("patient", session.patientId);
    toast.success("همه اعلان‌ها خوانده شد");
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="اعلان‌ها"
        description={`${faNum(unread)} اعلان خوانده‌نشده از ${faNum(mine.length)} اعلان.`}
        loading={loading}
        actions={
          <Button size="sm" variant="outline" disabled={!unread} onClick={markAll}>
            <CheckCheck className="size-4" aria-hidden />
            علامت‌گذاری همه به‌عنوان خوانده‌شده
          </Button>
        }
      />

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-2xl" />
          ))}
        </div>
      ) : mine.length ? (
        <ol className="space-y-2">
          {mine.map((n) => (
            <li key={n.id}>
              <Card
                role="button"
                tabIndex={0}
                aria-label={n.title}
                className={cn(
                  "cursor-pointer transition-colors hover:border-primary/40 hover:shadow-sm",
                  !n.read && "border-primary/25 bg-primary/5"
                )}
                onClick={() => open(n)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") open(n);
                }}
              >
                <div className="flex items-start gap-3 p-4">
                  <span
                    className={cn("mt-1.5 size-2.5 shrink-0 rounded-full", n.read ? "bg-muted-foreground/30" : "bg-primary")}
                    aria-hidden
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className={cn("text-sm", n.read ? "font-semibold" : "font-extrabold")}>{n.title}</p>
                      <span className="text-[11px] text-muted-foreground tabular-nums">{faFromNow(n.createdAtISO)}</span>
                    </div>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{n.body}</p>
                    {n.link && (
                      <p className="mt-1.5 flex items-center gap-1 text-xs font-medium text-primary">
                        مشاهده در پنل
                        <span aria-hidden>‹</span>
                      </p>
                    )}
                  </div>
                </div>
              </Card>
            </li>
          ))}
        </ol>
      ) : (
        <EmptyState
          icon={Inbox}
          title="اعلانی برای نمایش نیست"
          description="اعلان‌های مربوط به نوبت‌ها، آزمایش‌ها و پاسخ پشتیبانی اینجا نمایش داده می‌شوند."
        />
      )}
    </div>
  );
}

"use client";

/**
 * /admin/reviews — مدیریت نظرات: تب‌های وضعیت با شمارنده، جستجوی پزشک/بیمار/متن،
 * نمودار توزیع امتیاز (۵ تا ۱) و عملیات تأیید/مخفی‌سازی/حذف (با تأیید).
 * حذف فیزیکی در فروشگاه وجود ندارد؛ «حذف» نظر را پنهان می‌کند (صادقانه در توست اعلام می‌شود).
 */

import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  BadgeCheck,
  CheckCircle2,
  EyeOff,
  MoreHorizontal,
  Search,
  Star,
  Trash2,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChartConfig, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { DataTable } from "@/components/shared/data-table";
import { ChartCard } from "@/components/shared/chart-card";
import { PageHeader } from "@/components/shared/page-header";
import { RatingStars } from "@/components/shared/rating-stars";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { useDemoLoading } from "@/components/shared/hydration-gate";
import { useAdminPanel, faRating } from "@/features/admin/shared";
import { useAppStore } from "@/store/app-store";
import { MODERATION_STATUS_LABELS, type ModerationStatus } from "@/lib/constants";
import { faNum } from "@/lib/fa";
import { faFromNow } from "@/lib/jalali";
import type { Review } from "@/types";

type TabKey = "all" | ModerationStatus;

const TABS: { key: TabKey; label: string }[] = [
  { key: "all", label: "همه" },
  { key: "pending", label: "در انتظار تأیید" },
  { key: "published", label: "منتشرشده" },
  { key: "hidden", label: "مخفی‌شده" },
];

export function AdminReviewsManager() {
  const loading = useDemoLoading();
  const panel = useAdminPanel();
  const setReviewStatus = useAppStore((s) => s.setReviewStatus);
  const addAuditLog = useAppStore((s) => s.addAuditLog);

  const [tab, setTab] = useState<TabKey>("all");
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Review | null>(null);

  const counts = useMemo(
    () => ({
      all: panel.reviews.length,
      pending: panel.reviews.filter((r) => r.status === "pending").length,
      published: panel.reviews.filter((r) => r.status === "published").length,
      hidden: panel.reviews.filter((r) => r.status === "hidden").length,
    }),
    [panel.reviews]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return panel.reviews.filter((r) => {
      if (tab !== "all" && r.status !== tab) return false;
      if (q) {
        const doctor = panel.doctorMap.get(r.doctorId)?.name ?? "";
        const patient = panel.patientMap.get(r.patientId)?.name ?? "";
        const haystack = `${doctor} ${patient} ${r.comment}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [panel.reviews, panel.doctorMap, panel.patientMap, tab, search]);

  /** توزیع امتیاز از «همه» نظرات (نه فقط تب فعال) */
  const ratingDistribution = useMemo(() => {
    const buckets = [5, 4, 3, 2, 1].map((star) => ({
      star,
      label: `${faNum(star)} ستاره`,
      count: panel.reviews.filter((r) => r.rating === star).length,
    }));
    return buckets;
  }, [panel.reviews]);

  const avgRating = useMemo(
    () =>
      panel.reviews.length
        ? panel.reviews.reduce((sum, r) => sum + r.rating, 0) / panel.reviews.length
        : 0,
    [panel.reviews]
  );

  const reviewTarget = (r: Review): string => {
    const doctor = panel.doctorMap.get(r.doctorId)?.name ?? "پزشک حذف‌شده";
    return `نظر ${faNum(r.rating)} ستاره برای ${doctor}`;
  };

  const moderate = (r: Review, status: ModerationStatus) => {
    setReviewStatus(r.id, status);
    const doctor = panel.doctorMap.get(r.doctorId)?.name ?? "";
    const action =
      status === "published" ? "تأیید نظر" : status === "hidden" ? "مخفی‌سازی نظر" : "بررسی نظر";
    addAuditLog({ actorName: panel.actorName, actorRole: "admin", action, target: reviewTarget(r) });
    toast.success(
      status === "published" ? "نظر تأیید و منتشر شد" : "نظر پنهان شد",
      { description: doctor ? `${doctor} — امتیاز ${faNum(r.rating)} از ۵` : undefined }
    );
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    // در نسخه نمایشی حذف فیزیکی وجود ندارد؛ نظر پنهان می‌شود.
    setReviewStatus(deleteTarget.id, "hidden");
    addAuditLog({
      actorName: panel.actorName,
      actorRole: "admin",
      action: "حذف نظر (پنهان‌سازی)",
      target: reviewTarget(deleteTarget),
    });
    toast.success("نظر حذف شد", {
      description: "در نسخه نمایشی، حذف به‌صورت پنهان‌سازی ثبت می‌شود.",
    });
    setDeleteTarget(null);
  };

  const columns: ColumnDef<Review>[] = [
    {
      id: "doctor",
      header: "پزشک",
      cell: ({ row }) => (
        <span className="text-sm font-medium">
          {panel.doctorMap.get(row.original.doctorId)?.name ?? "—"}
        </span>
      ),
    },
    {
      id: "patient",
      header: "بیمار",
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {panel.patientMap.get(row.original.patientId)?.name ?? "—"}
        </span>
      ),
    },
    {
      accessorKey: "rating",
      header: "امتیاز",
      cell: ({ row }) => <RatingStars value={row.original.rating} />,
    },
    {
      accessorKey: "comment",
      header: "متن نظر",
      cell: ({ row }) => (
        <p className="max-w-72 text-sm leading-relaxed text-muted-foreground line-clamp-2" title={row.original.comment}>
          {row.original.comment}
        </p>
      ),
    },
    {
      accessorKey: "createdAtISO",
      header: "تاریخ",
      cell: ({ row }) => (
        <span className="whitespace-nowrap text-sm text-muted-foreground">{faFromNow(row.original.createdAtISO)}</span>
      ),
    },
    {
      accessorKey: "status",
      header: "وضعیت",
      cell: ({ row }) => (
        <StatusBadge status={row.original.status} label={MODERATION_STATUS_LABELS[row.original.status]} />
      ),
    },
    {
      id: "actions",
      header: "عملیات",
      cell: ({ row }) => {
        const r = row.original;
        return (
          <div className="flex justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="size-8" aria-label={`عملیات نظر ${r.id}`}>
                  <MoreHorizontal className="size-4" aria-hidden />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>عملیات نظر</DropdownMenuLabel>
                {r.status !== "published" && (
                  <DropdownMenuItem onClick={() => moderate(r, "published")}>
                    <CheckCircle2 className="size-4 text-emerald-500" aria-hidden />
                    تأیید و انتشار
                  </DropdownMenuItem>
                )}
                {r.status !== "hidden" && (
                  <DropdownMenuItem onClick={() => moderate(r, "hidden")}>
                    <EyeOff className="size-4 text-amber-500" aria-hidden />
                    مخفی کردن
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onClick={() => setDeleteTarget(r)}>
                  <Trash2 className="size-4" aria-hidden />
                  حذف
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ];

  const chartConfig = { count: { label: "تعداد نظر", color: "var(--chart-1)" } } satisfies ChartConfig;

  return (
    <div className="space-y-6">
      <PageHeader
        title="مدیریت نظرات"
        description={`${faNum(counts.all)} نظر ثبت‌شده — ${faNum(counts.pending)} در انتظار تأیید، ${faNum(counts.hidden)} مخفی‌شده`}
        loading={loading}
      />

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3" aria-label="آمار نظرات">
        <StatCard
          title="در انتظار تأیید"
          value={faNum(counts.pending)}
          hint="نیازمند بررسی مدیر"
          icon={BadgeCheck}
          tone="amber"
          loading={loading}
          onClick={() => setTab("pending")}
        />
        <StatCard
          title="منتشرشده"
          value={faNum(counts.published)}
          hint="نمایش در پروفایل پزشک"
          icon={CheckCircle2}
          tone="emerald"
          loading={loading}
          onClick={() => setTab("published")}
        />
        <StatCard
          title="میانگین امتیاز"
          value={`${faRating(avgRating)} از ۵`}
          hint="میانگین همه نظرات"
          icon={Star}
          tone="violet"
          loading={loading}
        />
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        <DataTable
          className="lg:col-span-2"
          columns={columns}
          data={filtered}
          loading={loading}
          searchable={false}
          emptyTitle="نظری با این فیلترها یافت نشد"
          emptyDescription="تب یا عبارت جستجو را تغییر دهید."
          emptyIcon={Star}
          exportCsvName="نظرات"
          csvRows={(r) => ({
            "پزشک": panel.doctorMap.get(r.doctorId)?.name ?? "",
            "بیمار": panel.patientMap.get(r.patientId)?.name ?? "",
            "امتیاز": r.rating,
            "متن": r.comment,
            "تاریخ": r.createdAtISO,
            "وضعیت": MODERATION_STATUS_LABELS[r.status],
          })}
          toolbar={
            <div className="flex w-full flex-wrap items-center gap-2">
              <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)}>
                <TabsList className="h-9 flex-wrap">
                  {TABS.map((t) => (
                    <TabsTrigger key={t.key} value={t.key} className="text-xs">
                      {t.label}
                      <span className="ms-1 text-[10px] text-muted-foreground">
                        ({faNum(counts[t.key])})
                      </span>
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
              <div className="relative min-w-44 flex-1 sm:max-w-60">
                <Search className="absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="جستجوی پزشک، بیمار یا متن…"
                  className="h-9 ps-8 text-sm"
                  aria-label="جستجوی نظر"
                />
              </div>
            </div>
          }
          mobileCard={(r) => (
            <div className="space-y-2 rounded-xl border p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{panel.doctorMap.get(r.doctorId)?.name ?? "—"}</p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {panel.patientMap.get(r.patientId)?.name ?? "—"} • {faFromNow(r.createdAtISO)}
                  </p>
                </div>
                <StatusBadge status={r.status} label={MODERATION_STATUS_LABELS[r.status]} />
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground line-clamp-2">{r.comment}</p>
              <div className="flex items-center justify-between gap-2">
                <RatingStars value={r.rating} />
                {r.status !== "published" && (
                  <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => moderate(r, "published")}>
                    تأیید
                  </Button>
                )}
              </div>
            </div>
          )}
        />

        <ChartCard
          title="توزیع امتیاز نظرات"
          description="تعداد نظرات هر امتیاز از ۱ تا ۵ — همه نظرات"
          config={chartConfig}
          loading={loading}
          height="h-72"
        >
          <BarChart data={ratingDistribution} margin={{ top: 8, left: 0, right: 8 }}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} reversed tick={{ fontSize: 11 }} />
            <YAxis tickLine={false} axisLine={false} width={32} allowDecimals={false} tickFormatter={(v) => faNum(Number(v))} />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  labelFormatter={(l) => String(l)}
                  formatter={(v) => [`${faNum(Number(v))} نظر`, "تعداد"]}
                />
              }
            />
            <Bar dataKey="count" fill="var(--color-count)" radius={6} maxBarSize={40} />
          </BarChart>
        </ChartCard>
      </div>

      <AlertDialog open={deleteTarget !== null} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="size-5 text-rose-500" aria-hidden />
              حذف نظر
            </AlertDialogTitle>
            <AlertDialogDescription>
              این نظر حذف شود؟ در نسخه نمایشی، حذف به‌صورت «پنهان‌سازی» ثبت می‌شود و نظر از پروفایل پزشک برداشته
              می‌شود.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>انصراف</AlertDialogCancel>
            <AlertDialogAction className="bg-rose-600 text-white hover:bg-rose-700" onClick={confirmDelete}>
              بله، حذف شود
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

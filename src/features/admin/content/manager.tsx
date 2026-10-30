"use client";

/**
 * /admin/content — مجله سلامت: فهرست مقالات با جستجو و فیلتر وضعیت، آمار،
 * دیالوگ افزودن/ویرایش (RHF + zod، شمارنده نویسه متن، پالت رنگ جلد) و
 * پیش‌نمایش مقاله در Sheet (پاراگراف‌ها با تفکیک خط خالی).
 */

import { useEffect, useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { z } from "zod";
import {
  BookOpen,
  CalendarDays,
  Clock3,
  Eye,
  MoreHorizontal,
  Newspaper,
  Pencil,
  Plus,
  Trash2,
  UserRound,
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { DataTable } from "@/components/shared/data-table";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { useDemoLoading } from "@/components/shared/hydration-gate";
import { useAdminPanel } from "@/features/admin/shared";
import { useAppStore } from "@/store/app-store";
import { PUBLISH_STATUS_LABELS, type PublishStatus } from "@/lib/constants";
import { faNum, toFa } from "@/lib/fa";
import { faDateShort, nowISODateTime } from "@/lib/jalali";
import type { Article } from "@/types";

const ALL = "all";
type StatusFilter = PublishStatus | typeof ALL;

/** دسته‌های مجله — مطابق داده‌های اولیه فروشگاه */
const ARTICLE_CATEGORIES = [
  "پوست و مو",
  "تغذیه",
  "سلامت قلب",
  "سلامت روان",
  "کودکان",
  "چشم",
  "دندان",
  "سلامت عمومی",
] as const;

/** پالت ۸ رنگ جلد (نمایشی — بدون آپلود تصویر) */
const HUE_PALETTE = [173, 220, 32, 280, 340, 258, 100, 200] as const;

function hueGradient(hue: number): string {
  return `linear-gradient(135deg, hsl(${hue} 70% 45%), hsl(${(hue + 45) % 360} 65% 55%))`;
}

/* ------------------------------- فرم مقاله ------------------------------- */

const articleSchema = z.object({
  title: z.string().trim().min(5, "عنوان مقاله الزامی است"),
  slug: z
    .string()
    .trim()
    .min(3, "نامک (slug) معتبر نیست")
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "نامک (slug) معتبر نیست — فقط حرف کوچک، رقم و خط تیره"),
  category: z.string().min(1, "دسته مقاله را انتخاب کنید"),
  authorName: z.string().trim().min(2, "نام نویسنده را وارد کنید"),
  excerpt: z.string().trim().min(20, "خلاصه حداقل ۲۰ حرف باشد"),
  body: z.string().trim().min(50, "متن مقاله را کامل کنید"),
  status: z.enum(["published", "draft"]),
  tags: z.string().trim(),
  coverHue: z.number().int().min(0).max(359),
});
type ArticleValues = z.infer<typeof articleSchema>;

const EMPTY_FORM: ArticleValues = {
  title: "",
  slug: "",
  category: "سلامت عمومی",
  authorName: "تحریریه دکترها",
  excerpt: "",
  body: "",
  status: "draft",
  tags: "",
  coverHue: 173,
};

interface ArticleDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: Article | null;
  actorName: string;
}

export function ArticleDialog({ open, onOpenChange, editing, actorName }: ArticleDialogProps) {
  const upsertArticle = useAppStore((s) => s.upsertArticle);
  const addAuditLog = useAppStore((s) => s.addAuditLog);
  const form = useForm<ArticleValues>({
    resolver: zodResolver(articleSchema),
    defaultValues: EMPTY_FORM,
  });

  useEffect(() => {
    if (open) {
      form.reset(
        editing
          ? {
              title: editing.title,
              slug: editing.slug,
              category: editing.category,
              authorName: editing.authorName,
              excerpt: editing.excerpt,
              body: editing.body,
              status: editing.status,
              tags: editing.tags.join("، "),
              coverHue: editing.coverHue,
            }
          : EMPTY_FORM
      );
    }
  }, [open, editing, form]);

  /* شمارنده زنده نویسه‌های متن */
  const bodyText = useWatch({ control: form.control, name: "body" }) ?? "";

  const submit = form.handleSubmit((values) => {
    const id = editing?.id ?? `art-${Date.now()}`;
    const publishedAtISO =
      editing?.status === "published" || editing?.publishedAtISO
        ? editing.publishedAtISO
        : values.status === "published"
          ? nowISODateTime()
          : nowISODateTime();
    const words = values.body.trim().split(/\s+/).length;
    upsertArticle({
      id,
      title: values.title,
      slug: values.slug,
      category: values.category,
      excerpt: values.excerpt,
      body: values.body,
      authorName: values.authorName,
      doctorId: editing?.doctorId,
      coverHue: values.coverHue,
      status: values.status,
      publishedAtISO,
      readMinutes: Math.max(1, Math.ceil(words / 180)),
      views: editing?.views ?? 0,
      tags: values.tags
        .split(/[،,]/)
        .map((t) => t.trim())
        .filter(Boolean),
    });
    addAuditLog({
      actorName,
      actorRole: "admin",
      action: editing ? "ویرایش مقاله" : "ایجاد مقاله",
      target: values.title,
    });
    toast.success(editing ? "مقاله ویرایش شد" : "مقاله جدید ثبت شد", {
      description: `${values.title} — ${PUBLISH_STATUS_LABELS[values.status]}`,
    });
    onOpenChange(false);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Newspaper className="size-5 text-primary" aria-hidden />
            {editing ? "ویرایش مقاله" : "مقاله جدید"}
          </DialogTitle>
          <DialogDescription>
            متن مقاله را با پاراگراف‌های جدا (خط خالی بین پاراگراف‌ها) بنویسید؛ خلاصه در کارت‌های مجله نمایش داده
            می‌شود.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={submit} className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>عنوان</FormLabel>
                    <FormControl>
                      <Input placeholder="مثلاً: راهنمای مراقبت از پوست در فصل سرد" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="slug"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>نامک (slug)</FormLabel>
                    <FormControl>
                      <Input dir="ltr" placeholder="مثلاً: skin-care-winter" className="text-start font-mono" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>دسته</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="w-full" aria-label="دسته مقاله">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {ARTICLE_CATEGORIES.map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="authorName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>نویسنده</FormLabel>
                    <FormControl>
                      <Input placeholder="مثلاً: تحریریه دکترها" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>وضعیت</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="w-full" aria-label="وضعیت انتشار">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="published">{PUBLISH_STATUS_LABELS.published}</SelectItem>
                        <SelectItem value="draft">{PUBLISH_STATUS_LABELS.draft}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="excerpt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>خلاصه</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={2}
                      placeholder="یک تا دو جمله برای نمایش در فهرست مقالات…"
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="body"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <FormLabel>متن مقاله</FormLabel>
                    <span className="text-[11px] text-muted-foreground tabular-nums">
                      {faNum(bodyText.length)} نویسه (حداقل {toFa("50")})
                    </span>
                  </div>
                  <FormControl>
                    <Textarea
                      rows={8}
                      placeholder="متن کامل مقاله… بین پاراگراف‌ها یک خط خالی بگذارید."
                      className="min-h-40 leading-relaxed"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription className="text-[11px]">
                    مدت مطالعه به‌صورت خودکار از طول متن محاسبه می‌شود.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="tags"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>برچسب‌ها</FormLabel>
                    <FormControl>
                      <Input placeholder="مثلاً: پوست، مراقبت، زمستان" {...field} />
                    </FormControl>
                    <FormDescription className="text-[11px]">برچسب‌ها را با «،» جدا کنید.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="coverHue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>رنگ جلد</FormLabel>
                    <div className="flex flex-wrap items-center gap-2 pt-1" role="radiogroup" aria-label="انتخاب رنگ جلد">
                      {HUE_PALETTE.map((hue) => (
                        <button
                          key={hue}
                          type="button"
                          role="radio"
                          aria-checked={field.value === hue}
                          aria-label={`رنگ جلد ${faNum(hue)}`}
                          className={`size-8 rounded-lg transition-all ${
                            field.value === hue
                              ? "ring-2 ring-primary ring-offset-2 ring-offset-background"
                              : "hover:scale-110"
                          }`}
                          style={{ background: hueGradient(hue) }}
                          onClick={() => field.onChange(hue)}
                        />
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                انصراف
              </Button>
              <Button type="submit">{editing ? "ذخیره تغییرات" : "ثبت مقاله"}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------ پیش‌نمایش مقاله ------------------------------ */

interface ArticlePreviewSheetProps {
  article: Article | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

function ArticlePreviewSheet({ article, open, onOpenChange }: ArticlePreviewSheetProps) {
  if (!article) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full gap-0 overflow-y-auto p-0 sm:max-w-xl lg:max-w-2xl">
          <SheetHeader className="border-b bg-muted/40 px-4 py-3">
            <SheetTitle className="text-sm">مقاله یافت نشد</SheetTitle>
            <SheetDescription className="sr-only">پیش‌نمایش مقاله</SheetDescription>
          </SheetHeader>
        </SheetContent>
      </Sheet>
    );
  }

  const paragraphs = article.body.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full gap-0 overflow-y-auto p-0 sm:max-w-xl lg:max-w-2xl">
        <SheetHeader className="space-y-3 border-b p-0">
          <div className="p-6 pb-5 text-white" style={{ background: hueGradient(article.coverHue) }}>
            <div className="mb-3 flex flex-wrap items-center gap-1.5">
              <Badge className="border-white/30 bg-white/20 text-white">{article.category}</Badge>
              <StatusBadge
                status={article.status}
                label={PUBLISH_STATUS_LABELS[article.status]}
                className="border-white/30 bg-white/20 text-white [&>span]:bg-white/70"
              />
            </div>
            <SheetTitle className="text-start text-lg leading-snug font-bold text-white">
              {article.title}
            </SheetTitle>
            {article.excerpt && <p className="mt-2 text-start text-sm text-white/85">{article.excerpt}</p>}
          </div>
          <SheetDescription className="sr-only">پیش‌نمایش مقاله مجله سلامت</SheetDescription>
        </SheetHeader>

        <div className="space-y-5 p-4">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <UserRound className="size-3.5" aria-hidden />
              {article.authorName}
            </span>
            <span className="flex items-center gap-1">
              <CalendarDays className="size-3.5" aria-hidden />
              {faDateShort(article.publishedAtISO)}
            </span>
            <span className="flex items-center gap-1">
              <Clock3 className="size-3.5" aria-hidden />
              {faNum(article.readMinutes)} دقیقه مطالعه
            </span>
            <span className="flex items-center gap-1">
              <Eye className="size-3.5" aria-hidden />
              {faNum(article.views)} بازدید
            </span>
            <span className="font-mono text-[10px]" dir="ltr">
              /mag/{article.slug}
            </span>
          </div>

          {article.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {article.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          )}

          <article className="space-y-4 text-sm leading-8" aria-label="متن کامل مقاله">
            {paragraphs.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </article>
        </div>
      </SheetContent>
    </Sheet>
  );
}

/* -------------------------------- صفحه اصلی -------------------------------- */

export function AdminContentManager() {
  const loading = useDemoLoading();
  const { actorName } = useAdminPanel();
  const articles = useAppStore((s) => s.articles);
  const deleteArticle = useAppStore((s) => s.deleteArticle);
  const addAuditLog = useAppStore((s) => s.addAuditLog);

  const [statusFilter, setStatusFilter] = useState<StatusFilter>(ALL);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Article | null>(null);
  const [preview, setPreview] = useState<Article | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Article | null>(null);

  const filtered = useMemo(
    () => articles.filter((a) => statusFilter === ALL || a.status === statusFilter),
    [articles, statusFilter]
  );

  const stats = useMemo(
    () => ({
      total: articles.length,
      published: articles.filter((a) => a.status === "published").length,
      views: articles.reduce((sum, a) => sum + a.views, 0),
    }),
    [articles]
  );

  const confirmDelete = () => {
    if (!deleteTarget) return;
    deleteArticle(deleteTarget.id);
    addAuditLog({
      actorName,
      actorRole: "admin",
      action: "حذف مقاله",
      target: deleteTarget.title,
    });
    toast.success(`مقاله «${deleteTarget.title}» حذف شد`);
    setDeleteTarget(null);
  };

  const columns: ColumnDef<Article>[] = [
    {
      accessorKey: "title",
      header: "عنوان",
      cell: ({ row }) => (
        <div className="flex items-center gap-2.5">
          <span
            className="size-8 shrink-0 rounded-lg"
            style={{ background: hueGradient(row.original.coverHue) }}
            aria-hidden
          />
          <div className="min-w-0">
            <p className="max-w-56 truncate text-sm font-medium">{row.original.title}</p>
            <p className="truncate text-[11px] text-muted-foreground" dir="ltr">
              /mag/{row.original.slug}
            </p>
          </div>
        </div>
      ),
    },
    {
      accessorKey: "category",
      header: "دسته",
      cell: ({ row }) => <Badge variant="outline" className="text-xs">{row.original.category}</Badge>,
    },
    {
      accessorKey: "authorName",
      header: "نویسنده",
      cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.authorName}</span>,
    },
    {
      accessorKey: "status",
      header: "وضعیت",
      cell: ({ row }) => (
        <StatusBadge status={row.original.status} label={PUBLISH_STATUS_LABELS[row.original.status]} />
      ),
    },
    {
      accessorKey: "publishedAtISO",
      header: "تاریخ انتشار",
      cell: ({ row }) => (
        <span className="whitespace-nowrap text-sm text-muted-foreground">{faDateShort(row.original.publishedAtISO)}</span>
      ),
    },
    {
      accessorKey: "views",
      header: "بازدید",
      cell: ({ row }) => <span className="text-sm tabular-nums">{faNum(row.original.views)}</span>,
    },
    {
      accessorKey: "readMinutes",
      header: "مدت مطالعه",
      cell: ({ row }) => (
        <span className="whitespace-nowrap text-sm tabular-nums text-muted-foreground">
          {faNum(row.original.readMinutes)} دقیقه
        </span>
      ),
    },
    {
      id: "actions",
      header: "عملیات",
      cell: ({ row }) => {
        const a = row.original;
        return (
          <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="size-8" aria-label={`عملیات مقاله ${a.title}`}>
                  <MoreHorizontal className="size-4" aria-hidden />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>عملیات مقاله</DropdownMenuLabel>
                <DropdownMenuItem onClick={() => setPreview(a)}>
                  <Eye className="size-4" aria-hidden />
                  پیش‌نمایش
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    setEditing(a);
                    setDialogOpen(true);
                  }}
                >
                  <Pencil className="size-4" aria-hidden />
                  ویرایش
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onClick={() => setDeleteTarget(a)}>
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="مجله سلامت"
        description={`${faNum(stats.total)} مقاله — ${faNum(stats.published)} منتشرشده و ${faNum(stats.total - stats.published)} پیش‌نویس`}
        loading={loading}
        actions={
          <Button
            onClick={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="size-4" aria-hidden />
            مقاله جدید
          </Button>
        }
      />

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3" aria-label="آمار مجله">
        <StatCard title="کل مقالات" value={faNum(stats.total)} icon={Newspaper} tone="primary" loading={loading} />
        <StatCard
          title="منتشرشده"
          value={faNum(stats.published)}
          hint={`${faNum(stats.total - stats.published)} پیش‌نویس`}
          icon={BookOpen}
          tone="emerald"
          loading={loading}
        />
        <StatCard
          title="مجموع بازدید"
          value={faNum(stats.views)}
          hint="بازدید همه مقالات"
          icon={Eye}
          tone="sky"
          loading={loading}
        />
      </section>

      <DataTable
        columns={columns}
        data={filtered}
        loading={loading}
        searchPlaceholder="جستجوی عنوان، نویسنده یا دسته…"
        emptyTitle="مقاله‌ای یافت نشد"
        emptyDescription="فیلتر وضعیت را تغییر دهید یا مقاله جدیدی بنویسید."
        emptyIcon={Newspaper}
        onRowClick={(a) => setPreview(a)}
        exportCsvName="مقالات"
        csvRows={(a) => ({
          "عنوان": a.title,
          "دسته": a.category,
          "نویسنده": a.authorName,
          "وضعیت": PUBLISH_STATUS_LABELS[a.status],
          "تاریخ انتشار": faDateShort(a.publishedAtISO),
          "بازدید": a.views,
          "مدت مطالعه (دقیقه)": a.readMinutes,
          "برچسب‌ها": a.tags.join("، "),
        })}
        toolbar={
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
            <SelectTrigger className="h-9 w-36" aria-label="فیلتر وضعیت انتشار">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>همه وضعیت‌ها</SelectItem>
              <SelectItem value="published">{PUBLISH_STATUS_LABELS.published}</SelectItem>
              <SelectItem value="draft">{PUBLISH_STATUS_LABELS.draft}</SelectItem>
            </SelectContent>
          </Select>
        }
        mobileCard={(a) => (
          <div className="space-y-2 rounded-xl border p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="size-9 shrink-0 rounded-lg" style={{ background: hueGradient(a.coverHue) }} aria-hidden />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{a.title}</p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {a.category} • {a.authorName}
                  </p>
                </div>
              </div>
              <StatusBadge status={a.status} label={PUBLISH_STATUS_LABELS[a.status]} />
            </div>
            <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
              <span className="tabular-nums">
                {faNum(a.views)} بازدید • {faNum(a.readMinutes)} دقیقه • {faDateShort(a.publishedAtISO)}
              </span>
              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setPreview(a)}>
                پیش‌نمایش
              </Button>
            </div>
          </div>
        )}
      />

      <ArticleDialog open={dialogOpen} onOpenChange={setDialogOpen} editing={editing} actorName={actorName} />
      <ArticlePreviewSheet article={preview} open={preview !== null} onOpenChange={(v) => !v && setPreview(null)} />

      <AlertDialog open={deleteTarget !== null} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="size-5 text-rose-500" aria-hidden />
              حذف مقاله
            </AlertDialogTitle>
            <AlertDialogDescription>
              مقاله «{deleteTarget?.title}» برای همیشه حذف شود؟ این اقدام قابل بازگشت نیست.
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

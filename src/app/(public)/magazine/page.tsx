"use client";

/**
 * /magazine — مجله سلامت: فهرست مقالات منتشرشده با فیلتر دسته.
 */

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowLeft, Eye, Newspaper, PenLine } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useDemoLoading, useStoreHydrated } from "@/components/shared/hydration-gate";
import { useAppStore } from "@/store/app-store";
import { faNum } from "@/lib/fa";
import { faDateShort } from "@/lib/jalali";

const ALL = "__all__";

export default function MagazinePage() {
  const hydrated = useStoreHydrated();
  const loading = useDemoLoading();
  const articles = useAppStore((s) => s.articles);
  const [category, setCategory] = useState(ALL);

  const categories = useMemo(
    () => [...new Set(articles.filter((a) => a.status === "published").map((a) => a.category))],
    [articles],
  );

  const published = useMemo(() => {
    const list = articles
      .filter((a) => a.status === "published")
      .sort((a, b) => b.publishedAtISO.localeCompare(a.publishedAtISO));
    return category === ALL ? list : list.filter((a) => a.category === category);
  }, [articles, category]);

  const [featured, ...rest] = published;

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-10">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-extrabold">
            <Newspaper className="size-7 text-primary" aria-hidden />
            مجله سلامت
          </h1>
          <p className="mt-2 text-muted-foreground">
            مطالب آموزشی و تخصصی از قلم پزشکان — {faNum(published.length)} مقاله منتشرشده
          </p>
        </div>
        {categories.length > 1 && (
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-48" aria-label="فیلتر دسته مقاله">
              <SelectValue placeholder="همه دسته‌ها" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>همه دسته‌ها</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {loading || !hydrated ? (
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-72 rounded-2xl" />
          ))}
        </div>
      ) : published.length === 0 ? (
        <p className="py-16 text-center text-muted-foreground">مقاله‌ای برای این دسته یافت نشد.</p>
      ) : (
        <>
          {/* featured */}
          <Link href={`/magazine/${featured.slug}`} className="group block">
            <Card className="overflow-hidden transition-all group-hover:shadow-lg md:grid md:grid-cols-2">
              <div
                aria-hidden
                className="min-h-56"
                style={{ background: `linear-gradient(135deg, hsl(${featured.coverHue} 65% 45%), hsl(${featured.coverHue} 65% 25%))` }}
              />
              <CardContent className="flex flex-col gap-3 p-7">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge>مقاله برگزیده</Badge>
                  <Badge variant="secondary">{featured.category}</Badge>
                </div>
                <h2 className="text-2xl font-extrabold leading-9 group-hover:text-primary">
                  {featured.title}
                </h2>
                <p className="line-clamp-3 leading-relaxed text-muted-foreground">
                  {featured.excerpt}
                </p>
                <div className="mt-auto flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <PenLine className="size-4" aria-hidden />
                    {featured.authorName}
                  </span>
                  <span>{faDateShort(featured.publishedAtISO)}</span>
                  <span>{faNum(featured.readMinutes)} دقیقه مطالعه</span>
                  <span className="flex items-center gap-1">
                    <Eye className="size-4" aria-hidden />
                    {faNum(featured.views)}
                  </span>
                </div>
                <span className="inline-flex items-center gap-1 font-medium text-primary">
                  خواندن مقاله
                  <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-0.5" aria-hidden />
                </span>
              </CardContent>
            </Card>
          </Link>

          {/* grid */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {rest.map((article) => (
              <Link key={article.id} href={`/magazine/${article.slug}`} className="group">
                <Card className="h-full overflow-hidden transition-all group-hover:-translate-y-1 group-hover:shadow-md">
                  <div
                    aria-hidden
                    className="h-32"
                    style={{ background: `linear-gradient(135deg, hsl(${article.coverHue} 65% 45%), hsl(${article.coverHue} 65% 25%))` }}
                  />
                  <CardContent className="flex h-[calc(100%-8rem)] flex-col gap-2 p-5">
                    <Badge variant="secondary" className="w-fit">
                      {article.category}
                    </Badge>
                    <p className="line-clamp-2 font-bold leading-6 group-hover:text-primary">
                      {article.title}
                    </p>
                    <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
                      {article.excerpt}
                    </p>
                    <p className="mt-auto text-xs text-muted-foreground">
                      {article.authorName} • {faDateShort(article.publishedAtISO)} •{" "}
                      {faNum(article.readMinutes)} دقیقه
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

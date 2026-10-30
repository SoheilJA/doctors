"use client";

/**
 * /magazine/[slug] — صفحه مقاله: متن کامل، برچسب‌ها و مقالات مرتبط.
 */

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo } from "react";
import { ArrowRight, CalendarDays, Eye, PenLine, SearchX, Timer } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useDemoLoading, useStoreHydrated } from "@/components/shared/hydration-gate";
import { EmptyState } from "@/components/shared/empty-state";
import { useAppStore } from "@/store/app-store";
import { faNum } from "@/lib/fa";
import { faDate } from "@/lib/jalali";

export default function ArticlePage() {
  const params = useParams<{ slug: string }>();
  const slug = Array.isArray(params.slug) ? params.slug[0] : params.slug;
  const hydrated = useStoreHydrated();
  const loading = useDemoLoading();
  const articles = useAppStore((s) => s.articles);

  const article = useMemo(
    () => articles.find((a) => a.slug === slug && a.status === "published"),
    [articles, slug],
  );

  const related = useMemo(
    () =>
      article
        ? articles
            .filter((a) => a.status === "published" && a.id !== article.id && a.category === article.category)
            .slice(0, 3)
        : [],
    [articles, article],
  );

  if (!loading && hydrated && !article) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <EmptyState
          icon={SearchX}
          title="مقاله یافت نشد"
          description="این مقاله وجود ندارد یا منتشر نشده است."
          action={
            <Button asChild size="sm">
              <Link href="/magazine">همه مقالات</Link>
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-10">
      <Button asChild variant="ghost" size="sm">
        <Link href="/magazine">
          <ArrowRight className="size-4" aria-hidden />
          بازگشت به مجله
        </Link>
      </Button>

      {loading || !hydrated || !article ? (
        <div className="space-y-4">
          <Skeleton className="h-10 w-3/4" />
          <Skeleton className="h-52 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      ) : (
        <article>
          <header className="space-y-4">
            <Badge variant="secondary">{article.category}</Badge>
            <h1 className="text-balance text-3xl font-extrabold leading-snug md:text-4xl">
              {article.title}
            </h1>
            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <PenLine className="size-4" aria-hidden />
                {article.authorName}
              </span>
              <span className="flex items-center gap-1.5">
                <CalendarDays className="size-4" aria-hidden />
                {faDate(article.publishedAtISO)}
              </span>
              <span className="flex items-center gap-1.5">
                <Timer className="size-4" aria-hidden />
                {faNum(article.readMinutes)} دقیقه مطالعه
              </span>
              <span className="flex items-center gap-1.5">
                <Eye className="size-4" aria-hidden />
                {faNum(article.views)} بازدید
              </span>
            </div>
          </header>

          <div
            aria-hidden
            className="mt-6 h-52 rounded-3xl md:h-64"
            style={{ background: `linear-gradient(135deg, hsl(${article.coverHue} 65% 45%), hsl(${article.coverHue} 65% 25%))` }}
          />

          <p className="mt-6 rounded-2xl bg-muted/60 p-5 font-medium leading-8">
            {article.excerpt}
          </p>

          <div className="mt-6 space-y-5">
            {article.body
              .split(/\n{2,}/)
              .filter(Boolean)
              .map((para, i) => (
                <p key={i} className="text-justify leading-9 text-foreground/90">
                  {para}
                </p>
              ))}
          </div>

          {article.tags.length > 0 && (
            <div className="mt-8 flex flex-wrap gap-2">
              {article.tags.map((tag) => (
                <Badge key={tag} variant="outline">
                  #{tag}
                </Badge>
              ))}
            </div>
          )}
        </article>
      )}

      {related.length > 0 && (
        <section className="border-t pt-8">
          <h2 className="mb-4 text-xl font-extrabold">مقالات مرتبط</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {related.map((rel) => (
              <Link key={rel.id} href={`/magazine/${rel.slug}`} className="group">
                <Card className="h-full transition-all group-hover:-translate-y-1 group-hover:shadow-md">
                  <CardContent className="space-y-2 p-4">
                    <Badge variant="secondary" className="text-[11px]">
                      {rel.category}
                    </Badge>
                    <p className="line-clamp-2 font-bold leading-6 group-hover:text-primary">
                      {rel.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {faNum(rel.readMinutes)} دقیقه مطالعه
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

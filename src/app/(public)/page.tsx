"use client";

/**
 * Landing page — صفحه اصلی عمومی: هیرو با جستجوی یکپارچه، خدمات،
 * آمار، پزشکان برتر، مجله، سوالات متداول و CTA.
 */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  BadgeCheck,
  CalendarCheck,
  CreditCard,
  FlaskConical,
  MapPin,
  MessageCircle,
  Search,
  Sparkles,
  Stethoscope,
  Users,
  Video,
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
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
import { useStoreHydrated } from "@/components/shared/hydration-gate";
import { UserAvatar } from "@/components/shared/user-avatar";
import { RatingStars } from "@/components/shared/rating-stars";
import { useAppStore } from "@/store/app-store";
import { faNum, toman } from "@/lib/fa";
import { faDateShort } from "@/lib/jalali";
import { CITIES, SPECIALTIES, SPECIALTY_LABELS } from "@/lib/constants";
import { APP_NAME } from "@/lib/constants";

const ALL = "__all__";

const SERVICES = [
  {
    icon: Stethoscope,
    title: "نوبت حضوری",
    desc: "رزرو نوبت ویزیت حضوری از بهترین متخصصان شهر شما",
    href: "/doctors",
  },
  {
    icon: Video,
    title: "مشاوره آنلاین",
    desc: "گفتگوی متنی، تماس تلفنی یا ویدیوکنفرانس با پزشک",
    href: "/doctors",
  },
  {
    icon: FlaskConical,
    title: "آزمایش در منزل",
    desc: "ثبت سفارش آزمایش با نمونه‌گیری در منزل و جواب آنلاین",
    href: "/login",
  },
  {
    icon: Sparkles,
    title: "مجله سلامت",
    desc: "مطالب آموزشی معتبر درباره سلامتی نوشته پزشکان",
    href: "/magazine",
  },
] as const;

const STEPS = [
  { icon: Search, title: "جستجوی پزشک", desc: "بر اساس تخصص، شهر و نوع خدمات فیلتر کنید" },
  { icon: CalendarCheck, title: "انتخاب زمان", desc: "از تقویم آنلاین پزشک، ساعت خالی را رزرو کنید" },
  { icon: CreditCard, title: "پرداخت و تأیید", desc: "پرداخت آنلاین و دریافت کد پیگیری نوبت" },
] as const;

export default function LandingPage() {
  const router = useRouter();
  const hydrated = useStoreHydrated();
  const doctors = useAppStore((s) => s.doctors);
  const patients = useAppStore((s) => s.patients);
  const appointments = useAppStore((s) => s.appointments);
  const articles = useAppStore((s) => s.articles);
  const faqs = useAppStore((s) => s.faqs);

  const [specialty, setSpecialty] = useState(ALL);
  const [city, setCity] = useState(ALL);

  const activeDoctors = useMemo(
    () => doctors.filter((d) => d.accountStatus === "active" && d.verification === "verified"),
    [doctors],
  );

  const topDoctors = useMemo(
    () =>
      [...activeDoctors]
        .sort((a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount)
        .slice(0, 8),
    [activeDoctors],
  );

  const latestArticles = useMemo(
    () =>
      articles
        .filter((a) => a.status === "published")
        .sort((a, b) => b.publishedAtISO.localeCompare(a.publishedAtISO))
        .slice(0, 3),
    [articles],
  );

  const publishedFaqs = useMemo(() => faqs.filter((f) => f.published).slice(0, 6), [faqs]);

  const stats = [
    { icon: Stethoscope, value: faNum(activeDoctors.length), label: "پزشک متخصص" },
    { icon: Users, value: faNum(patients.length), label: "کاربر فعال" },
    { icon: CalendarCheck, value: faNum(appointments.length), label: "نوبت ثبت‌شده" },
    { icon: MessageCircle, value: "۲۴/۷", label: "پشتیبانی آنلاین" },
  ];

  const search = () => {
    const params = new URLSearchParams();
    if (specialty !== ALL) params.set("specialty", specialty);
    if (city !== ALL) params.set("city", city);
    router.push(`/doctors${params.size ? `?${params.toString()}` : ""}`);
  };

  return (
    <div>
      {/* ------------------------------- hero ------------------------------- */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-32 start-1/2 size-[36rem] -translate-x-1/2 rounded-full bg-primary/15 blur-3xl"
        />
        <div className="relative mx-auto max-w-6xl px-4 pb-16 pt-14 text-center md:pt-20">
          <Badge variant="secondary" className="mb-4 gap-1.5 rounded-full px-4 py-1.5">
            <Sparkles className="size-3.5" aria-hidden />
            بزرگ‌ترین شبکه نوبت‌دهی آنلاین پزشکان
          </Badge>
          <h1 className="mx-auto max-w-3xl text-balance text-4xl font-extrabold leading-tight md:text-5xl">
            رزرو نوبت پزشک، <span className="text-primary">آسان‌تر از همیشه</span>
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-balance leading-relaxed text-muted-foreground">
            هزاران پزشک متخصص در سراسر ایران؛ نوبت حضوری، مشاوره تلفنی و ویدیویی و آزمایش در
            منزل — همه در یک سامانه.
          </p>

          {/* unified search */}
          <Card className="mx-auto mt-8 max-w-2xl shadow-lg">
            <CardContent className="flex flex-col gap-3 p-4 sm:flex-row">
              <Select value={specialty} onValueChange={setSpecialty}>
                <SelectTrigger className="sm:flex-1" aria-label="انتخاب تخصص">
                  <SelectValue placeholder="همه تخصص‌ها" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>همه تخصص‌ها</SelectItem>
                  {SPECIALTIES.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={city} onValueChange={setCity}>
                <SelectTrigger className="sm:w-44" aria-label="انتخاب شهر">
                  <SelectValue placeholder="همه شهرها" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>همه شهرها</SelectItem>
                  {CITIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button size="lg" className="sm:px-8" onClick={search}>
                <Search className="size-4.5" aria-hidden />
                جستجو
              </Button>
            </CardContent>
          </Card>

          {/* stats */}
          <div className="mx-auto mt-10 grid max-w-3xl grid-cols-2 gap-3 sm:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label} className="rounded-2xl border bg-card/70 p-4 backdrop-blur">
                <s.icon className="mx-auto size-5 text-primary" aria-hidden />
                {!hydrated ? (
                  <Skeleton className="mx-auto mt-2 h-6 w-14" />
                ) : (
                  <p className="mt-1 text-2xl font-extrabold">{s.value}</p>
                )}
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ----------------------------- services ----------------------------- */}
      <section className="mx-auto max-w-6xl px-4 py-14">
        <h2 className="text-center text-2xl font-extrabold md:text-3xl">خدمات ما</h2>
        <p className="mt-2 text-center text-muted-foreground">
            هر آنچه برای سلامتی خود و خانواده نیاز دارید
        </p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {SERVICES.map((service) => (
            <Link key={service.title} href={service.href} className="group">
              <Card className="h-full transition-all group-hover:-translate-y-1 group-hover:shadow-md">
                <CardContent className="flex h-full flex-col gap-3 p-6">
                  <span className="grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary">
                    <service.icon className="size-6" aria-hidden />
                  </span>
                  <p className="text-lg font-bold">{service.title}</p>
                  <p className="text-sm leading-relaxed text-muted-foreground">{service.desc}</p>
                  <span className="mt-auto inline-flex items-center gap-1 text-sm font-medium text-primary">
                    مشاهده
                    <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-0.5" aria-hidden />
                  </span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </section>

      {/* ---------------------------- how it works --------------------------- */}
      <section className="border-y bg-muted/30 py-14">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="text-center text-2xl font-extrabold md:text-3xl">
            در ۳ گام ساده نوبت بگیرید
          </h2>
          <div className="mt-10 grid gap-8 md:grid-cols-3">
            {STEPS.map((step, i) => (
              <div key={step.title} className="relative text-center">
                {i < STEPS.length - 1 && (
                  <span
                    aria-hidden
                    className="absolute top-8 end-[-10%] hidden h-0.5 w-1/2 bg-border md:block"
                  />
                )}
                <span className="relative mx-auto grid size-16 place-items-center rounded-full border-2 border-primary/20 bg-background text-primary shadow-sm">
                  <step.icon className="size-7" aria-hidden />
                  <span className="absolute -top-2 start-1/2 grid size-6 -translate-x-1/2 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                    {faNum(i + 1)}
                  </span>
                </span>
                <p className="mt-4 text-lg font-bold">{step.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------------------- top doctors ---------------------------- */}
      <section className="mx-auto max-w-6xl px-4 py-14">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-extrabold md:text-3xl">پزشکان برتر</h2>
            <p className="mt-1 text-muted-foreground">منتخب کاربران {APP_NAME}</p>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/doctors">
              مشاهده همه
              <ArrowLeft className="size-4" aria-hidden />
            </Link>
          </Button>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {!hydrated
            ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-56 rounded-2xl" />)
            : topDoctors.map((doctor) => (
                <Link key={doctor.id} href={`/doctors/${doctor.id}`} className="group">
                  <Card className="h-full transition-all group-hover:-translate-y-1 group-hover:shadow-md">
                    <CardContent className="flex h-full flex-col gap-3 p-5">
                      <div className="flex items-center gap-3">
                        <UserAvatar name={doctor.name} hue={doctor.avatarHue} size="lg" />
                        <div className="min-w-0">
                          <p className="truncate font-bold">{doctor.name}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {SPECIALTY_LABELS[doctor.specialtyId]}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <MapPin className="size-3.5" aria-hidden />
                          {doctor.city}
                        </span>
                        <span className="flex items-center gap-1 text-muted-foreground">
                          <BadgeCheck className="size-3.5 text-emerald-600" aria-hidden />
                          {faNum(doctor.experienceYears)} سال تجربه
                        </span>
                      </div>
                      <div className="mt-auto flex items-center justify-between border-t pt-3">
                        <RatingStars value={doctor.rating} count={doctor.reviewCount} size={14} />
                        <span className="text-sm font-bold text-primary">
                          {toman(doctor.visitFee)}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
        </div>
      </section>

      {/* --------------------------- magazine preview ------------------------ */}
      {latestArticles.length > 0 && (
        <section className="border-y bg-muted/30 py-14">
          <div className="mx-auto max-w-6xl px-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-extrabold md:text-3xl">مجله سلامت</h2>
                <p className="mt-1 text-muted-foreground">مطالب آموزشی از قلم پزشکان</p>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link href="/magazine">
                  همه مقالات
                  <ArrowLeft className="size-4" aria-hidden />
                </Link>
              </Button>
            </div>
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {latestArticles.map((article) => (
                <Link key={article.id} href={`/magazine/${article.slug}`} className="group">
                  <Card className="h-full overflow-hidden transition-all group-hover:-translate-y-1 group-hover:shadow-md">
                    <div
                      aria-hidden
                      className="h-32 bg-gradient-to-br from-primary/70 to-primary/20"
                      style={{ background: `hsl(${article.coverHue} 65% 45% / 0.85)` }}
                    />
                    <CardContent className="space-y-2 p-5">
                      <Badge variant="secondary">{article.category}</Badge>
                      <p className="line-clamp-2 font-bold leading-6 group-hover:text-primary">
                        {article.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {article.authorName} • {faDateShort(article.publishedAtISO)} •{" "}
                        {faNum(article.readMinutes)} دقیقه مطالعه
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* --------------------------------- FAQ ------------------------------- */}
      {publishedFaqs.length > 0 && (
        <section className="mx-auto max-w-3xl px-4 py-14">
          <h2 className="text-center text-2xl font-extrabold md:text-3xl">
            سوالات متداول
          </h2>
          <Accordion type="single" collapsible className="mt-8">
            {publishedFaqs.map((faq) => (
              <AccordionItem key={faq.id} value={faq.id}>
                <AccordionTrigger className="text-start font-bold">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="leading-relaxed text-muted-foreground">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>
      )}

      {/* --------------------------------- CTA ------------------------------- */}
      <section className="mx-auto max-w-6xl px-4 pb-16">
        <div className="relative overflow-hidden rounded-3xl bg-primary px-6 py-14 text-center text-primary-foreground shadow-xl">
          <div
            aria-hidden
            className="pointer-events-none absolute -top-24 start-1/2 size-96 -translate-x-1/2 rounded-full bg-white/10 blur-3xl"
          />
          <h2 className="relative text-2xl font-extrabold md:text-3xl">
            همین حالا سلامتی خود را جدی بگیرید
          </h2>
          <p className="relative mx-auto mt-3 max-w-xl text-balance leading-relaxed text-primary-foreground/85">
            ثبت‌نام کمتر از یک دقیقه طول می‌کشد؛ اولین نوبت خود را همین امروز رزرو کنید.
          </p>
          <div className="relative mt-6 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg" variant="secondary">
              <Link href="/login">
                شروع کنید
                <ArrowLeft className="size-4.5" aria-hidden />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="border-primary-foreground/40 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
            >
              <Link href="/doctors">مشاهده پزشکان</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}

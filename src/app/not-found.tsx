import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FileQuestion, Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-5 p-6 text-center">
      <div className="rounded-2xl bg-muted p-5">
        <FileQuestion className="size-12 text-muted-foreground" aria-hidden />
      </div>
      <h1 className="text-3xl font-extrabold">صفحه پیدا نشد (۴۰۴)</h1>
      <p className="max-w-md text-muted-foreground">
        متأسفیم، صفحه‌ای که دنبال آن بودید وجود ندارد یا به آدرس دیگری منتقل شده است.
      </p>
      <div className="flex gap-2">
        <Button asChild>
          <Link href="/">
            <Home className="size-4" aria-hidden />
            بازگشت به صفحه اصلی
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/login">ورود به پنل‌ها</Link>
        </Button>
      </div>
    </div>
  );
}

"use client";

/**
 * /admin/staff — کارکنان و نقش‌ها: فهرست کارکنان با کلید وضعیت فعال (غیرفعال‌سازی با تأیید)،
 * افزودن کارمند (مجوزهای پیش‌فرض بر اساس نقش) و ماتریس نقش‌ها و دسترسی‌ها
 * (۱۵ دسترسی × کارکنان) با ذخیرهسازی در فروشگاه و ثبت حسابرسی.
 */

import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { z } from "zod";
import { Info, KeyRound, Mail, ShieldCheck, UserRoundPlus } from "lucide-react";
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
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
import { Switch } from "@/components/ui/switch";
import { DataTable } from "@/components/shared/data-table";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { UserAvatar } from "@/components/shared/user-avatar";
import { useDemoLoading } from "@/components/shared/hydration-gate";
import { useAdminPanel } from "@/features/admin/shared";
import { useAuthStore } from "@/store/auth-store";
import { useAppStore } from "@/store/app-store";
import { faNum, toFa } from "@/lib/fa";
import type { StaffUser } from "@/types";

/** ۱۵ کلید دسترسی — مطابق کلیدهای فروشگاه */
const PERMISSIONS: { key: string; label: string }[] = [
  { key: "dashboard", label: "داشبورد" },
  { key: "doctors", label: "پزشکان" },
  { key: "patients", label: "کاربران" },
  { key: "appointments", label: "نوبت‌ها" },
  { key: "centers", label: "مراکز درمانی" },
  { key: "services", label: "خدمات" },
  { key: "finance", label: "امور مالی" },
  { key: "discounts", label: "تخفیف‌ها" },
  { key: "reviews", label: "نظرات" },
  { key: "content", label: "مجله" },
  { key: "banners", label: "بنرها" },
  { key: "support", label: "پشتیبانی" },
  { key: "staff", label: "کارکنان" },
  { key: "audit", label: "حسابرسی" },
  { key: "settings", label: "تنظیمات" },
];

const STAFF_ROLE_LABELS: Record<StaffUser["role"], string> = {
  admin: "مدیر",
  support: "پشتیبان",
};

/** مجوزهای پیش‌فرض بر اساس نقش */
function defaultPermissions(role: StaffUser["role"]): Record<string, boolean> {
  return Object.fromEntries(
    PERMISSIONS.map((p) => [p.key, role === "admin" ? true : p.key === "support" || p.key === "dashboard"])
  );
}

/* ------------------------------ فرم افزودن کارمند ------------------------------ */

const staffSchema = z.object({
  name: z.string().trim().min(3, "نام و نام خانوادگی را وارد کنید"),
  email: z.string().trim().email("ایمیل معتبر نیست"),
  role: z.enum(["admin", "support"], { message: "نقش را انتخاب کنید" }),
});
type StaffValues = z.infer<typeof staffSchema>;

interface StaffDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  actorName: string;
}

function StaffDialog({ open, onOpenChange, actorName }: StaffDialogProps) {
  const upsertStaffUser = useAppStore((s) => s.upsertStaffUser);
  const addAuditLog = useAppStore((s) => s.addAuditLog);
  const form = useForm<StaffValues>({
    resolver: zodResolver(staffSchema),
    defaultValues: { name: "", email: "", role: "support" },
  });

  const submit = form.handleSubmit((values) => {
    const id = `stf-${Date.now()}`;
    upsertStaffUser({
      id,
      name: values.name,
      email: values.email,
      role: values.role,
      avatarHue: Math.floor(Math.random() * 360),
      active: true,
      permissions: defaultPermissions(values.role),
    });
    addAuditLog({
      actorName,
      actorRole: "admin",
      action: "ایجاد کارمند",
      target: `${values.name} — ${STAFF_ROLE_LABELS[values.role]}`,
    });
    toast.success("کارمند جدید اضافه شد", {
      description: `${values.name} (${STAFF_ROLE_LABELS[values.role]}) با مجوزهای پیش‌فرض نقش`,
    });
    form.reset({ name: "", email: "", role: "support" });
    onOpenChange(false);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserRoundPlus className="size-5 text-primary" aria-hidden />
            افزودن کارمند
          </DialogTitle>
          <DialogDescription>
            مجوزهای اولیه به‌صورت خودکار بر اساس نقش تنظیم می‌شود (مدیر: همه دسترسی‌ها، پشتیبان: داشبورد و
            پشتیبانی) و بعداً از ماتریس قابل تغییر است.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={submit} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>نام و نام خانوادگی</FormLabel>
                  <FormControl>
                    <Input placeholder="مثلاً: سارا احمدی" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>ایمیل</FormLabel>
                  <FormControl>
                    <Input dir="ltr" type="email" placeholder="name@doktorha.ir" className="text-start" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>نقش</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger className="w-full" aria-label="انتخاب نقش">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="admin">{STAFF_ROLE_LABELS.admin}</SelectItem>
                      <SelectItem value="support">{STAFF_ROLE_LABELS.support}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                انصراف
              </Button>
              <Button type="submit">ثبت کارمند</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

/* -------------------------------- صفحه اصلی -------------------------------- */

export function AdminStaffManager() {
  const loading = useDemoLoading();
  const { actorName } = useAdminPanel();
  const staff = useAppStore((s) => s.staff);
  const toggleStaffActive = useAppStore((s) => s.toggleStaffActive);
  const updateStaffPermissions = useAppStore((s) => s.updateStaffPermissions);
  const addAuditLog = useAppStore((s) => s.addAuditLog);
  const session = useAuthStore((s) => s.session);
  const currentUserId = session?.userId ?? "stf-0001";

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deactivateTarget, setDeactivateTarget] = useState<StaffUser | null>(null);

  const stats = useMemo(
    () => ({
      total: staff.length,
      admins: staff.filter((s) => s.role === "admin").length,
      active: staff.filter((s) => s.active).length,
    }),
    [staff]
  );

  const permCount = (s: StaffUser): number => PERMISSIONS.filter((p) => s.permissions[p.key]).length;

  const confirmDeactivate = () => {
    if (!deactivateTarget) return;
    // toggleStaffActive خودش رویداد حسابرسی را ثبت می‌کند.
    toggleStaffActive(deactivateTarget.id, actorName);
    toast.success(`${deactivateTarget.name} غیرفعال شد`, { description: "دسترسی او به پنل قطع می‌شود." });
    setDeactivateTarget(null);
  };

  const handleActivate = (s: StaffUser) => {
    toggleStaffActive(s.id, actorName);
    toast.success(`${s.name} فعال شد`);
  };

  const togglePermission = (user: StaffUser, perm: { key: string; label: string }, checked: boolean) => {
    updateStaffPermissions(user.id, { ...user.permissions, [perm.key]: checked });
    addAuditLog({
      actorName,
      actorRole: "admin",
      action: checked ? "اعطای دسترسی" : "سلب دسترسی",
      target: `${user.name} — ${perm.label}`,
    });
    toast.success(
      checked ? `دسترسی «${perm.label}» به ${user.name} داده شد` : `دسترسی «${perm.label}» از ${user.name} گرفته شد`
    );
  };

  const columns: ColumnDef<StaffUser>[] = [
    {
      accessorKey: "name",
      header: "کارمند",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <UserAvatar name={row.original.name} hue={row.original.avatarHue} size="sm" />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">
              {row.original.name}
              {row.original.id === currentUserId && (
                <span className="ms-1.5 text-[10px] font-normal text-primary">(شما)</span>
              )}
            </p>
          </div>
        </div>
      ),
    },
    {
      accessorKey: "role",
      header: "نقش",
      cell: ({ row }) => (
        <Badge
          variant="outline"
          className={
            row.original.role === "admin"
              ? "border-emerald-500/25 bg-emerald-500/12 text-emerald-700 dark:text-emerald-400"
              : "border-sky-500/25 bg-sky-500/12 text-sky-700 dark:text-sky-400"
          }
        >
          {STAFF_ROLE_LABELS[row.original.role]}
        </Badge>
      ),
    },
    {
      accessorKey: "email",
      header: "ایمیل",
      cell: ({ row }) => (
        <span dir="ltr" className="font-mono text-xs text-muted-foreground">
          {row.original.email}
        </span>
      ),
    },
    {
      accessorKey: "active",
      header: "وضعیت",
      cell: ({ row }) =>
        row.original.id === currentUserId ? (
          <span className="flex items-center gap-2">
            <Switch checked disabled aria-label="حساب خودتان همیشه فعال است" />
            <span className="text-xs text-muted-foreground">حساب شما</span>
          </span>
        ) : (
          <Switch
            checked={row.original.active}
            onCheckedChange={() =>
              row.original.active ? setDeactivateTarget(row.original) : handleActivate(row.original)
            }
            aria-label={`${row.original.active ? "غیرفعال‌سازی" : "فعال‌سازی"} ${row.original.name}`}
          />
        ),
    },
    {
      id: "permissions",
      header: "دسترسی‌ها",
      cell: ({ row }) => (
        <span className="text-sm tabular-nums text-muted-foreground">
          {toFa(permCount(row.original))} از {toFa(PERMISSIONS.length)}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="کارکنان و نقش‌ها"
        description={`${faNum(stats.total)} کارمند — ${faNum(stats.admins)} مدیر و ${faNum(stats.total - stats.admins)} پشتیبان، ${faNum(stats.active)} فعال`}
        loading={loading}
        actions={
          <Button onClick={() => setDialogOpen(true)}>
            <UserRoundPlus className="size-4" aria-hidden />
            افزودن کارمند
          </Button>
        }
      />

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3" aria-label="آمار کارکنان">
        <StatCard title="کل کارکنان" value={faNum(stats.total)} icon={ShieldCheck} tone="primary" loading={loading} />
        <StatCard
          title="فعال"
          value={faNum(stats.active)}
          hint={`${faNum(stats.total - stats.active)} غیرفعال`}
          icon={KeyRound}
          tone="emerald"
          loading={loading}
        />
        <StatCard
          title="مدیران"
          value={faNum(stats.admins)}
          hint="با دسترسی کامل"
          icon={Mail}
          tone="violet"
          loading={loading}
        />
      </section>

      <DataTable
        columns={columns}
        data={staff}
        loading={loading}
        searchPlaceholder="جستجوی نام یا ایمیل…"
        emptyTitle="کارمندی یافت نشد"
        emptyDescription="کارمند جدیدی اضافه کنید."
        emptyIcon={ShieldCheck}
        exportCsvName="کارکنان"
        csvRows={(s) => ({
          "نام": s.name,
          "نقش": STAFF_ROLE_LABELS[s.role],
          "ایمیل": s.email,
          "وضعیت": s.active ? "فعال" : "غیرفعال",
          "دسترسی‌ها": `${permCount(s)} از ${PERMISSIONS.length}`,
        })}
        mobileCard={(s) => (
          <div className="space-y-2 rounded-xl border p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <UserAvatar name={s.name} hue={s.avatarHue} size="sm" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{s.name}</p>
                  <p dir="ltr" className="truncate font-mono text-[11px] text-muted-foreground">
                    {s.email}
                  </p>
                </div>
              </div>
              {s.id === currentUserId ? (
                <Badge variant="outline" className="text-[10px]">شما</Badge>
              ) : (
                <Switch
                  checked={s.active}
                  onCheckedChange={() => (s.active ? setDeactivateTarget(s) : handleActivate(s))}
                  aria-label={`${s.active ? "غیرفعال‌سازی" : "فعال‌سازی"} ${s.name}`}
                />
              )}
            </div>
            <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
              <Badge
                variant="outline"
                className={
                  s.role === "admin"
                    ? "border-emerald-500/25 bg-emerald-500/12 text-emerald-700 dark:text-emerald-400"
                    : "border-sky-500/25 bg-sky-500/12 text-sky-700 dark:text-sky-400"
                }
              >
                {STAFF_ROLE_LABELS[s.role]}
              </Badge>
              <span className="tabular-nums">
                {toFa(permCount(s))} از {toFa(PERMISSIONS.length)} دسترسی
              </span>
            </div>
          </div>
        )}
      />

      {/* ماتریس نقش‌ها و دسترسی‌ها */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">ماتریس نقش‌ها و دسترسی‌ها</CardTitle>
          <CardDescription>
            {toFa(PERMISSIONS.length)} دسترسی برای {faNum(staff.length)} کارمند — با علامت‌زدن یا برداشتن هر خانه،
            دسترسی ذخیره و در گزارش حسابرسی ثبت می‌شود.
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm" aria-label="ماتریس دسترسی‌ها">
            <thead>
              <tr className="border-b bg-muted/40">
                <th scope="col" className="px-3 py-2.5 text-start font-semibold">
                  دسترسی
                </th>
                {staff.map((s) => (
                  <th
                    key={s.id}
                    scope="col"
                    className={`px-2 py-2.5 text-center font-semibold ${s.id === currentUserId ? "bg-primary/5" : ""}`}
                  >
                    <div className="flex flex-col items-center gap-1">
                      <UserAvatar name={s.name} hue={s.avatarHue} size="sm" />
                      <span className="whitespace-nowrap text-xs">{s.name}</span>
                      <Badge variant="outline" className="text-[9px]">
                        {STAFF_ROLE_LABELS[s.role]}
                      </Badge>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PERMISSIONS.map((p) => (
                <tr key={p.key} className="border-t transition-colors hover:bg-muted/30">
                  <th scope="row" className="px-3 py-2 text-start font-medium">
                    {p.label}
                  </th>
                  {staff.map((s) => (
                    <td key={s.id} className={`px-2 py-2 text-center ${s.id === currentUserId ? "bg-primary/5" : ""}`}>
                      <Checkbox
                        checked={Boolean(s.permissions[p.key])}
                        onCheckedChange={(checked) => togglePermission(s, p, checked === true)}
                        aria-label={`دسترسی ${p.label} برای ${s.name}`}
                      />
                    </td>
                  ))}
                </tr>
              ))}
              <tr className="border-t bg-muted/30">
                <th scope="row" className="px-3 py-2 text-start font-semibold">
                  مجموع دسترسی‌ها
                </th>
                {staff.map((s) => (
                  <td key={s.id} className={`px-2 py-2 text-center text-xs tabular-nums ${s.id === currentUserId ? "bg-primary/5" : ""}`}>
                    {toFa(permCount(s))} از {toFa(PERMISSIONS.length)}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Alert>
        <Info className="size-4" aria-hidden />
        <AlertTitle>نکته نسخه نمایشی</AlertTitle>
        <AlertDescription>
          ماتریس دسترسی‌ها نسخه نمایشی است و بر مسیریابی واقعی اثر ندارد؛ تغییرات فقط در فروشگاه نمایشی ذخیره
          می‌شود.
        </AlertDescription>
      </Alert>

      <StaffDialog open={dialogOpen} onOpenChange={setDialogOpen} actorName={actorName} />

      <AlertDialog open={deactivateTarget !== null} onOpenChange={(v) => !v && setDeactivateTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>غیرفعال‌سازی کارمند</AlertDialogTitle>
            <AlertDialogDescription>
              حساب {deactivateTarget?.name} غیرفعال شود؟ او دیگر نمی‌تواند وارد پنل شود. این اقدام قابل بازگشت
              است.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>انصراف</AlertDialogCancel>
            <AlertDialogAction className="bg-rose-600 text-white hover:bg-rose-700" onClick={confirmDeactivate}>
              بله، غیرفعال شود
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

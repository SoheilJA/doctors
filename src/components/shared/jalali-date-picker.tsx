"use client";

/**
 * JalaliDatePicker — react-day-picker v9 with the built-in Persian (Jalali)
 * locale: fa-IR labels, RTL, week starting شنبه, Persian digits.
 */

import { CalendarIcon } from "lucide-react";
import { DayPicker } from "react-day-picker/persian";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { faDateMedium } from "@/lib/jalali";

type DayPickerProps = Parameters<typeof DayPicker>[0];

interface JalaliDatePickerProps {
  value?: string; // ISO yyyy-mm-dd
  onChange: (iso: string | undefined) => void;
  disabled?: (date: Date) => boolean;
  placeholder?: string;
  className?: string;
  disabledInput?: boolean;
  dir?: "rtl" | "ltr";
  id?: string;
  "aria-label"?: string;
}

function isoFromDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function dateFromIso(iso?: string): Date | undefined {
  if (!iso) return undefined;
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d, 12);
}

export function JalaliDatePicker({
  value,
  onChange,
  disabled,
  placeholder = "انتخاب تاریخ",
  className,
  disabledInput,
  id,
  ...ariaProps
}: JalaliDatePickerProps) {
  const selected = dateFromIso(value);
  const dayPickerProps: DayPickerProps = {
    mode: "single",
    selected,
    onSelect: (d) => onChange(d ? isoFromDate(d) : undefined),
    ...(disabled ? { disabled } : {}),
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          disabled={disabledInput}
          className={cn(
            "h-9 w-full justify-start gap-2 text-start font-normal",
            !value && "text-muted-foreground",
            className
          )}
          {...ariaProps}
        >
          <CalendarIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          {value ? faDateMedium(value) : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <DayPicker
          {...dayPickerProps}
          className="rounded-xl border bg-background p-3 text-sm [--rdp-cell-size:36px]"
          showOutsideDays
          formatters={{
            formatWeekdayName: (date) =>
              ["ش", "ی", "د", "س", "چ", "پ", "ج"][(date.getDay() + 1) % 7],
          }}
        />
        {value && (
          <div className="flex items-center justify-between border-t px-3 py-2 text-xs text-muted-foreground">
            <span>تاریخ انتخابی: {faDateMedium(value)}</span>
            <button type="button" className="text-rose-500 hover:underline" onClick={() => onChange(undefined)}>
              پاک کردن
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

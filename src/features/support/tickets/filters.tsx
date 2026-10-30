"use client";

/**
 * Filters toolbar for the ticket inbox — shared by the table and kanban views.
 */

import { FilterX, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { JalaliDatePicker } from "@/components/shared/jalali-date-picker";
import {
  TICKET_CATEGORY_LABELS,
  TICKET_PRIORITY_LABELS,
  TICKET_STATUS_LABELS,
  TICKET_STATUS_ORDER,
  type TicketCategory,
  type TicketPriority,
  type TicketStatus,
} from "@/lib/constants";
import { faNum } from "@/lib/fa";
import type { StaffUser } from "@/types";

export interface TicketFilters {
  search: string;
  status: string;
  priority: string;
  category: string;
  creatorRole: string;
  agent: string;
  fromISO: string;
  toISO: string;
}

export const EMPTY_TICKET_FILTERS: TicketFilters = {
  search: "",
  status: "all",
  priority: "all",
  category: "all",
  creatorRole: "all",
  agent: "all",
  fromISO: "",
  toISO: "",
};

export function countActiveFilters(f: TicketFilters): number {
  let n = 0;
  if (f.search.trim()) n++;
  if (f.status !== "all") n++;
  if (f.priority !== "all") n++;
  if (f.category !== "all") n++;
  if (f.creatorRole !== "all") n++;
  if (f.agent !== "all") n++;
  if (f.fromISO) n++;
  if (f.toISO) n++;
  return n;
}

interface TicketFiltersBarProps {
  filters: TicketFilters;
  onChange: (patch: Partial<TicketFilters>) => void;
  onReset: () => void;
  activeCount: number;
  /** active support agents for the assignee filter */
  agents: StaffUser[];
}

export function TicketFiltersBar({ filters, onChange, onReset, activeCount, agents }: TicketFiltersBarProps) {
  return (
    <div className="space-y-3 rounded-xl border p-3" role="search" aria-label="فیلترهای تیکت‌ها">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-44 flex-1 sm:max-w-72">
          <Search className="absolute start-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            value={filters.search}
            onChange={(e) => onChange({ search: e.target.value })}
            placeholder="جستجوی موضوع، کد یا درخواست‌کننده…"
            className="h-9 ps-8 text-sm"
            aria-label="جستجو در تیکت‌ها"
          />
        </div>
        {activeCount > 0 && (
          <Badge variant="secondary" className="tabular-nums">
            {faNum(activeCount)} فیلتر فعال
          </Badge>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Select value={filters.status} onValueChange={(v) => onChange({ status: v })}>
          <SelectTrigger size="sm" className="w-36" aria-label="فیلتر وضعیت">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">همه وضعیت‌ها</SelectItem>
            {TICKET_STATUS_ORDER.map((s: TicketStatus) => (
              <SelectItem key={s} value={s}>
                {TICKET_STATUS_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filters.priority} onValueChange={(v) => onChange({ priority: v })}>
          <SelectTrigger size="sm" className="w-32" aria-label="فیلتر اولویت">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">همه اولویت‌ها</SelectItem>
            {(Object.keys(TICKET_PRIORITY_LABELS) as TicketPriority[]).map((p) => (
              <SelectItem key={p} value={p}>
                {TICKET_PRIORITY_LABELS[p]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filters.category} onValueChange={(v) => onChange({ category: v })}>
          <SelectTrigger size="sm" className="w-36" aria-label="فیلتر دسته‌بندی">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">همه دسته‌ها</SelectItem>
            {(Object.keys(TICKET_CATEGORY_LABELS) as TicketCategory[]).map((c) => (
              <SelectItem key={c} value={c}>
                {TICKET_CATEGORY_LABELS[c]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filters.creatorRole} onValueChange={(v) => onChange({ creatorRole: v })}>
          <SelectTrigger size="sm" className="w-32" aria-label="فیلتر نقش درخواست‌کننده">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">همه نقش‌ها</SelectItem>
            <SelectItem value="patient">بیمار</SelectItem>
            <SelectItem value="doctor">پزشک</SelectItem>
          </SelectContent>
        </Select>

        <Select value={filters.agent} onValueChange={(v) => onChange({ agent: v })}>
          <SelectTrigger size="sm" className="w-40" aria-label="فیلتر عامل مسئول">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">همه عامل‌ها</SelectItem>
            <SelectItem value="unassigned">اختصاص‌نیافته</SelectItem>
            {agents.map((a) => (
              <SelectItem key={a.id} value={a.id}>
                {a.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="w-full sm:w-48">
          <JalaliDatePicker
            value={filters.fromISO || undefined}
            onChange={(iso) => onChange({ fromISO: iso ?? "" })}
            placeholder="از تاریخ ایجاد"
            className="h-9"
            aria-label="از تاریخ"
          />
        </div>
        <div className="w-full sm:w-48">
          <JalaliDatePicker
            value={filters.toISO || undefined}
            onChange={(iso) => onChange({ toISO: iso ?? "" })}
            placeholder="تا تاریخ ایجاد"
            className="h-9"
            aria-label="تا تاریخ"
          />
        </div>
        <Button
          size="sm"
          variant="outline"
          className="h-9"
          onClick={onReset}
          disabled={activeCount === 0}
        >
          <FilterX className="size-4" aria-hidden />
          حذف فیلترها
        </Button>
      </div>
    </div>
  );
}

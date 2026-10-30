"use client";

/** Initials avatar with a deterministic hue background — no external images, never broken. */

import { cn } from "@/lib/utils";

function initials(name: string): string {
  return name
    .replace(/^(دکتر|سرکار)\s+/u, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("");
}

interface UserAvatarProps {
  name: string;
  hue?: number;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const SIZES: Record<string, string> = {
  sm: "size-8 text-xs",
  md: "size-10 text-sm",
  lg: "size-14 text-lg",
  xl: "size-20 text-2xl",
};

export function UserAvatar({ name, hue = 200, size = "md", className }: UserAvatarProps) {
  return (
    <div
      aria-hidden
      className={cn(
        "inline-flex shrink-0 select-none items-center justify-center rounded-full font-bold text-white ring-2 ring-background",
        SIZES[size],
        className
      )}
      style={{ backgroundColor: `hsl(${hue} 45% 45%)` }}
    >
      {initials(name)}
    </div>
  );
}

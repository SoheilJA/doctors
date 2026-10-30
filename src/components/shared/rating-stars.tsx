"use client";

/** Star rating display + interactive input. */

import { Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { toFa } from "@/lib/fa";

interface RatingStarsProps {
  value: number;
  count?: number;
  size?: number;
  interactive?: boolean;
  onChange?: (value: number) => void;
  className?: string;
}

export function RatingStars({ value, count, size = 16, interactive, onChange, className }: RatingStarsProps) {
  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <div className="flex items-center" role={interactive ? "radiogroup" : undefined} aria-label={interactive ? "انتخاب امتیاز" : undefined}>
        {[1, 2, 3, 4, 5].map((i) => {
          const filled = i <= Math.round(value);
          return interactive ? (
            <button
              key={i}
              type="button"
              role="radio"
              aria-checked={i === value}
              aria-label={`${toFa(i)} ستاره`}
              className="rounded p-0.5 transition-transform hover:scale-125 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              onClick={() => onChange?.(i)}
            >
              <Star
                className={filled ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40"}
                style={{ width: size, height: size }}
                aria-hidden
              />
            </button>
          ) : (
            <Star
              key={i}
              className={filled ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40"}
              style={{ width: size, height: size }}
              aria-hidden
            />
          );
        })}
      </div>
      {typeof value === "number" && (
        <span className="text-xs font-semibold tabular-nums text-muted-foreground">{toFa(value.toFixed(1))}</span>
      )}
      {typeof count === "number" && (
        <span className="text-xs text-muted-foreground">({toFa(count)} نظر)</span>
      )}
    </div>
  );
}

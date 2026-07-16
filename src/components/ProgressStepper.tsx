import { Circle, CircleDot, RefreshCw, CheckCheck, type LucideIcon } from "lucide-react";
import { clsx } from "clsx";
import { EVENT_STATUSES, STATUS_LABEL, STATUS_STYLE, statusIndex, type EventStatus } from "@/lib/status";

const ICONS: Record<string, LucideIcon> = {
  Circle,
  CircleDot,
  RefreshCw,
  CheckCheck,
};

/**
 * 4-stage progress indicator. Horizontal on desktop (>= sm), vertical on mobile.
 * Stages are distinguished by grayscale intensity + icon, never hue — see DESIGN.md §7.
 */
export function ProgressStepper({ status }: { status: EventStatus }) {
  const activeIndex = statusIndex(status);

  return (
    <div aria-label="Psychotest stages">
      {/* Desktop: horizontal, line runs through each dot's row */}
      <ol className="hidden sm:flex">
        {EVENT_STATUSES.map((s, i) => {
          const style = STATUS_STYLE[s];
          const Icon = ICONS[style.icon];
          const passed = i <= activeIndex;
          const isActive = i === activeIndex;
          const isFirst = i === 0;
          const isLast = i === EVENT_STATUSES.length - 1;

          return (
            <li key={s} className="flex flex-1 flex-col items-center">
              <div className="flex w-full items-center">
                <div
                  className={clsx(
                    "h-0.5 flex-1",
                    isFirst ? "bg-transparent" : i - 1 < activeIndex ? "bg-zinc-900" : "bg-zinc-200",
                  )}
                />
                <span
                  className={clsx(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                    passed ? style.fill : "bg-zinc-100",
                    passed ? style.text : "text-zinc-400",
                    isActive && "ring-2 ring-zinc-900 ring-offset-2",
                  )}
                >
                  <Icon aria-hidden="true" size={16} />
                </span>
                <div
                  className={clsx(
                    "h-0.5 flex-1",
                    isLast ? "bg-transparent" : i < activeIndex ? "bg-zinc-900" : "bg-zinc-200",
                  )}
                />
              </div>
              <span
                className={clsx(
                  "mt-2 text-center text-xs font-medium",
                  passed ? "text-zinc-900" : "text-zinc-400",
                )}
              >
                {STATUS_LABEL[s]}
              </span>
            </li>
          );
        })}
      </ol>

      {/* Mobile: vertical, connector anchored to the left rail */}
      <ol className="flex flex-col sm:hidden">
        {EVENT_STATUSES.map((s, i) => {
          const style = STATUS_STYLE[s];
          const Icon = ICONS[style.icon];
          const passed = i <= activeIndex;
          const isActive = i === activeIndex;
          const isLast = i === EVENT_STATUSES.length - 1;

          return (
            <li key={s} className={clsx("relative flex gap-3", !isLast && "pb-8")}>
              <div className="flex flex-col items-center">
                <span
                  className={clsx(
                    "z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                    passed ? style.fill : "bg-zinc-100",
                    passed ? style.text : "text-zinc-400",
                    isActive && "ring-2 ring-zinc-900 ring-offset-2",
                  )}
                >
                  <Icon aria-hidden="true" size={16} />
                </span>
                {!isLast && (
                  <div
                    className={clsx(
                      "absolute top-9 bottom-0 left-[17px] w-0.5",
                      i < activeIndex ? "bg-zinc-900" : "bg-zinc-200",
                    )}
                  />
                )}
              </div>
              <span
                className={clsx(
                  "pt-1.5 text-sm font-medium",
                  passed ? "text-zinc-900" : "text-zinc-400",
                )}
              >
                {STATUS_LABEL[s]}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

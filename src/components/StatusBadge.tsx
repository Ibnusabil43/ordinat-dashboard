import { Circle, CircleDot, RefreshCw, CheckCheck, type LucideIcon } from "lucide-react";
import { clsx } from "clsx";
import { STATUS_LABEL, STATUS_STYLE, type EventStatus } from "@/lib/status";

/** Maps the icon name stored in STATUS_STYLE to the actual lucide component. */
const ICONS: Record<string, LucideIcon> = {
  Circle,
  CircleDot,
  RefreshCw,
  CheckCheck,
};

interface StatusBadgeProps {
  status: EventStatus;
  /** "lg" for prominent placements (e.g. school detail header). Default "sm" for table/card use. */
  size?: "sm" | "lg";
  className?: string;
}

export function StatusBadge({ status, size = "sm", className }: StatusBadgeProps) {
  const style = STATUS_STYLE[status];
  const Icon = ICONS[style.icon];

  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-full font-medium",
        size === "sm" ? "px-2.5 py-1 text-xs" : "px-3 py-1.5 text-sm",
        style.fill,
        style.text,
        className,
      )}
    >
      <Icon
        aria-hidden="true"
        size={size === "sm" ? 14 : 16}
        className={status === "ONGOING" ? "animate-pulse" : undefined}
      />
      {STATUS_LABEL[status]}
    </span>
  );
}

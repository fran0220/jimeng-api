import { cn } from "@/lib/utils"

interface StatusBadgeProps {
  status: "active" | "inactive" | "error" | "disabled"
  label?: string
}

const statusConfig = {
  active: { color: "bg-emerald-400/10 text-emerald-400 border-emerald-400/20", dot: "bg-emerald-400" },
  inactive: { color: "bg-zinc-400/10 text-zinc-400 border-zinc-400/20", dot: "bg-zinc-400" },
  error: { color: "bg-red-400/10 text-red-400 border-red-400/20", dot: "bg-red-400" },
  disabled: { color: "bg-amber-400/10 text-amber-400 border-amber-400/20", dot: "bg-amber-400" },
}

export function StatusBadge({ status, label }: StatusBadgeProps) {
  const config = statusConfig[status]
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium", config.color)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", config.dot)} />
      {label ?? status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  )
}

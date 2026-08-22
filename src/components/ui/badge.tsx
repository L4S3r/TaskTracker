import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?:
    | "default"
    | "secondary"
    | "outline"
    | "destructive"
    | "urgent"
    | "high"
    | "medium"
    | "low"
    | "superadmin"
    | "admin"
    | "developer"
    | "dev"
    | "editor"
    | "viewer"
    | "info"
    | "warning"
    | "critical";
}

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  const variants = {
    default: "border-transparent bg-primary text-primary-foreground shadow-xs",
    secondary: "border-border/60 bg-secondary text-secondary-foreground",
    outline: "border-border text-foreground bg-card/40",
    destructive: "border-transparent bg-destructive text-destructive-foreground",
    urgent: "border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400 font-semibold",
    high: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400 font-semibold",
    medium: "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-400 font-medium",
    low: "border-slate-500/30 bg-slate-500/10 text-slate-600 dark:text-slate-400 font-medium",
    superadmin: "border-rose-500/40 bg-gradient-to-r from-rose-500/20 to-purple-500/20 text-rose-600 dark:text-rose-300 font-extrabold shadow-xs",
    admin: "border-purple-500/30 bg-purple-500/10 text-purple-700 dark:text-purple-300 font-bold",
    developer: "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300 font-semibold",
    dev: "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300 font-semibold",
    editor: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-medium",
    viewer: "border-zinc-500/30 bg-zinc-500/10 text-zinc-700 dark:text-zinc-400 font-medium",
    info: "border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400 font-medium",
    warning: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400 font-semibold",
    critical: "border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400 font-bold",
  };

  return (
    <div
      data-slot="badge"
      className={cn(
        "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-medium transition-colors select-none",
        variants[variant] || variants.default,
        className
      )}
      {...props}
    />
  );
}

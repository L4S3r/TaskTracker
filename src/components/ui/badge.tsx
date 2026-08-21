import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "outline" | "destructive" | "urgent" | "high" | "medium" | "low" | "admin" | "editor" | "viewer";
}

export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  const variants = {
    default: "border-transparent bg-primary text-primary-foreground",
    secondary: "border-transparent bg-secondary text-secondary-foreground",
    outline: "border-border text-foreground",
    destructive: "border-transparent bg-destructive text-destructive-foreground",
    urgent: "border-red-500/20 bg-red-500/10 text-red-500 font-semibold",
    high: "border-amber-500/20 bg-amber-500/10 text-amber-500 font-semibold",
    medium: "border-blue-500/20 bg-blue-500/10 text-blue-500",
    low: "border-slate-500/20 bg-slate-500/10 text-slate-500",
    admin: "border-purple-500/20 bg-purple-500/10 text-purple-400 font-bold",
    editor: "border-blue-500/20 bg-blue-500/10 text-blue-400",
    viewer: "border-slate-500/20 bg-slate-500/10 text-slate-400",
  };

  return (
    <div
      data-slot="badge"
      className={cn(
        "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        variants[variant],
        className
      )}
      {...props}
    />
  );
}

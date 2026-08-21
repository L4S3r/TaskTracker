import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "secondary" | "outline" | "ghost" | "destructive" | "link";
  size?: "default" | "sm" | "lg" | "icon";
  isLoading?: boolean;
}

export function Button({
  className,
  variant = "default",
  size = "default",
  isLoading = false,
  disabled,
  children,
  ...props
}: ButtonProps) {
  const baseStyles =
    "inline-flex items-center justify-center font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-50 disabled:pointer-events-none disabled:cursor-not-allowed rounded-lg select-none cursor-pointer active:scale-[0.98]";

  const variants = {
    default: "bg-primary text-primary-foreground hover:bg-primary-hover shadow-sm hover:shadow active:shadow-none",
    secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border/40",
    outline: "border border-border bg-card/60 hover:bg-muted text-foreground hover:border-border/80 shadow-xs",
    ghost: "hover:bg-muted/70 text-foreground",
    destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm active:shadow-none",
    link: "text-primary underline-offset-4 hover:underline p-0 min-h-0 min-w-0 active:scale-100",
  };

  const sizes = {
    default: "h-10 px-4 py-2 text-sm min-h-[40px] sm:min-h-[40px]",
    sm: "h-8 px-3 text-xs rounded-md min-h-[34px]",
    lg: "h-11 px-6 text-sm font-semibold rounded-xl min-h-[44px]",
    icon: "h-10 w-10 p-0 min-h-[40px] min-w-[40px]",
  };

  return (
    <button
      data-slot="button"
      className={cn(baseStyles, variants[variant], sizes[size], className)}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <span className="inline-flex items-center gap-2">
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          <span>Loading...</span>
        </span>
      ) : (
        children
      )}
    </button>
  );
}

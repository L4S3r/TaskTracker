import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  label?: string;
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
}

export function Input({
  className,
  type = "text",
  error,
  label,
  id,
  startIcon,
  endIcon,
  ...props
}: InputProps) {
  const generatedId = React.useId();
  const inputId = id || generatedId;

  return (
    <div className="w-full space-y-1.5" data-slot="input-container">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-xs font-semibold text-foreground/80 tracking-wide uppercase"
        >
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        {startIcon && (
          <div className="absolute left-3 flex items-center pointer-events-none text-muted-foreground">
            {startIcon}
          </div>
        )}
        <input
          type={type}
          id={inputId}
          data-slot="input"
          className={cn(
            "flex h-10 w-full rounded-lg border border-input bg-card/60 px-3.5 py-2 text-sm text-foreground placeholder:text-muted-foreground/70 transition-all duration-150",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary",
            "disabled:cursor-not-allowed disabled:opacity-50",
            startIcon && "pl-9",
            endIcon && "pr-9",
            error && "border-destructive focus-visible:ring-destructive/30 focus-visible:border-destructive",
            className
          )}
          {...props}
        />
        {endIcon && (
          <div className="absolute right-3 flex items-center text-muted-foreground">
            {endIcon}
          </div>
        )}
      </div>
      {error && <p className="text-xs text-destructive mt-1 font-medium">{error}</p>}
    </div>
  );
}

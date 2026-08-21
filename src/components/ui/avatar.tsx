import * as React from "react";
import { cn } from "@/lib/utils";

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string;
  name?: string;
  size?: "sm" | "md" | "lg";
}

export function Avatar({ src, name, size = "md", className, ...props }: AvatarProps) {
  const getInitials = (text?: string) => {
    if (!text) return "U";
    const parts = text.trim().split(" ");
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return text.substring(0, 2).toUpperCase();
  };

  const sizes = {
    sm: "h-8 w-8 text-xs",
    md: "h-10 w-10 text-sm",
    lg: "h-14 w-14 text-base",
  };

  return (
    <div
      data-slot="avatar"
      className={cn(
        "relative inline-flex items-center justify-center rounded-full bg-secondary font-semibold text-secondary-foreground overflow-hidden select-none border border-border",
        sizes[size],
        className
      )}
      {...props}
    >
      {src ? (
        <img src={src} alt={name || "User Avatar"} className="h-full w-full object-cover" />
      ) : (
        <span>{getInitials(name)}</span>
      )}
    </div>
  );
}

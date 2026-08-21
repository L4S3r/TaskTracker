import * as React from "react";
import { cn } from "@/lib/utils";

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string;
  name?: string;
  size?: "sm" | "md" | "lg";
}

const GRADIENTS = [
  "from-blue-500 to-indigo-600 text-white",
  "from-violet-500 to-purple-600 text-white",
  "from-emerald-500 to-teal-600 text-white",
  "from-amber-500 to-orange-600 text-white",
  "from-rose-500 to-pink-600 text-white",
  "from-cyan-500 to-blue-600 text-white",
  "from-indigo-500 to-sky-600 text-white",
];

function getGradientForName(name?: string) {
  if (!name) return GRADIENTS[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return GRADIENTS[Math.abs(hash) % GRADIENTS.length];
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
    sm: "h-7 w-7 text-[10px]",
    md: "h-9 w-9 text-xs",
    lg: "h-12 w-12 text-sm",
  };

  const gradientClass = getGradientForName(name);

  return (
    <div
      data-slot="avatar"
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center rounded-full font-semibold overflow-hidden select-none border border-border/60 shadow-xs",
        sizes[size],
        !src && `bg-gradient-to-br ${gradientClass}`,
        className
      )}
      {...props}
    >
      {src ? (
        <img src={src} alt={name || "User Avatar"} className="h-full w-full object-cover" />
      ) : (
        <span className="leading-none">{getInitials(name)}</span>
      )}
    </div>
  );
}

"use client";

import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/lib/auth-context";

export function UserNav() {
  const { user } = useAuth();

  const displayName = user?.name || user?.metadata?.name || user?.username || "User";
  const avatarUrl = user?.avatar_url || user?.metadata?.avatar_url;
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex items-center gap-3">
      <Avatar className="h-9 w-9">
        <AvatarImage src={avatarUrl} alt={displayName} />
        <AvatarFallback>{initials}</AvatarFallback>
      </Avatar>

      <div className="flex flex-col text-left">
        <span className="text-sm font-semibold leading-none text-foreground">{displayName}</span>
        <span className="text-xs text-muted-foreground mt-0.5">
          @{user?.username}
        </span>
      </div>
    </div>
  );
}

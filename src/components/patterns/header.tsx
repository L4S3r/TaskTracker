"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { CheckSquare, Users, Shield, LogOut } from "lucide-react";

export function Header() {
  const { user, isAdmin, logout } = useAuth();
  const [showMenu, setShowMenu] = useState(false);

  const displayName = user?.metadata?.name || user?.username || user?.email?.split("@")[0] || "User";
  const avatarUrl = user?.metadata?.avatar_url;


  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-card/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand */}
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2.5 font-bold tracking-tight text-foreground text-lg">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
              <CheckSquare className="h-5 w-5" />
            </div>
            <span>TaskTracker</span>
          </Link>

          {user && (
            <nav className="hidden md:flex items-center gap-1">
              <Link href="/">
                <Button variant="ghost" size="sm" className="gap-2 text-foreground/80 hover:text-foreground">
                  <CheckSquare className="h-4 w-4" />
                  <span>Tasks</span>
                </Button>
              </Link>
              <Link href="/team">
                <Button variant="ghost" size="sm" className="gap-2 text-foreground/80 hover:text-foreground">
                  <Users className="h-4 w-4" />
                  <span>Team</span>
                </Button>
              </Link>
              <Link href="/settings">
                <Button variant="ghost" size="sm" className="gap-2 text-foreground/80 hover:text-foreground">
                  <Shield className="h-4 w-4" />
                  <span>Security & MFA</span>
                </Button>
              </Link>
            </nav>
          )}
        </div>

        {/* User profile / Actions */}
        <div className="flex items-center gap-3">
          {user ? (
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="flex items-center gap-3 rounded-full p-1 hover:bg-muted transition-colors min-h-[44px] min-w-[44px]"
                aria-label="User navigation menu"
              >
                <Avatar name={displayName} src={avatarUrl} size="sm" />
                <div className="hidden sm:flex flex-col text-left">
                  <span className="text-xs font-semibold text-foreground leading-none">{displayName}</span>
                  <span className="text-[10px] text-muted-foreground mt-0.5">{user.email}</span>
                </div>
              </button>

              {showMenu && (
                <div
                  className="absolute right-0 mt-2 w-64 rounded-xl border border-border bg-card p-2 shadow-xl z-50 animate-in fade-in-50"
                  onClick={() => setShowMenu(false)}
                >
                  <div className="px-3 py-2 border-b border-border mb-1">
                    <p className="text-xs font-bold text-foreground">{displayName}</p>
                    <p className="text-[11px] text-muted-foreground">{user.email}</p>
                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                      {(Array.isArray(user.roles)
                        ? user.roles
                        : typeof user.roles === "string"
                        ? [user.roles]
                        : []
                      ).map((r) => (
                        <Badge key={r} variant={r === "admin" ? "admin" : "secondary"}>
                          {r}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <Link href="/team" className="block w-full">
                    <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-foreground hover:bg-muted text-left min-h-[40px]">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span>Manage Team</span>
                    </button>
                  </Link>

                  <Link href="/settings" className="block w-full">
                    <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-foreground hover:bg-muted text-left min-h-[40px]">
                      <Shield className="h-4 w-4 text-muted-foreground" />
                      <span>Security & MFA</span>
                    </button>
                  </Link>

                  <div className="border-t border-border mt-1 pt-1">
                    <button
                      onClick={() => logout(false)}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-destructive hover:bg-destructive/10 text-left min-h-[40px]"
                    >
                      <LogOut className="h-4 w-4" />
                      <span>Log Out</span>
                    </button>
                    <button
                      onClick={() => logout(true)}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-[11px] text-muted-foreground hover:text-destructive hover:bg-destructive/10 text-left"
                    >
                      <span>Log out everywhere (All devices)</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/login">
                <Button variant="ghost" size="sm">
                  Sign In
                </Button>
              </Link>
              <Link href="/register">
                <Button size="sm">Get Started</Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

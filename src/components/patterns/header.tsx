"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { CheckSquare, Users, Shield, LogOut, Menu, X, ChevronDown } from "lucide-react";

export function Header() {
  const { user, isAdmin, logout } = useAuth();
  const pathname = usePathname();
  const [showMenu, setShowMenu] = useState(false);
  const [showMobileNav, setShowMobileNav] = useState(false);

  const menuRef = useRef<HTMLDivElement>(null);

  const displayName = user?.metadata?.name || user?.username || user?.email?.split("@")[0] || "User";
  const avatarUrl = user?.metadata?.avatar_url;

  // Handle click outside dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    }
    if (showMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showMenu]);

  // Close mobile nav on route change
  useEffect(() => {
    setShowMobileNav(false);
    setShowMenu(false);
  }, [pathname]);

  const navLinks = [
    { href: "/", label: "Tasks", icon: CheckSquare },
    { href: "/team", label: "Team", icon: Users },
    { href: "/settings", label: "Security & MFA", icon: Shield },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-card/80 backdrop-blur-md transition-all">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand & Desktop Navigation */}
        <div className="flex items-center gap-6">
          <Link
            href="/"
            className="flex items-center gap-2.5 font-bold tracking-tight text-foreground text-lg group select-none"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-blue-700 text-primary-foreground shadow-sm group-hover:shadow-md transition-all">
              <CheckSquare className="h-5 w-5" />
            </div>
            <span className="bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text">
              TaskTracker
            </span>
          </Link>

          {user && (
            <nav className="hidden md:flex items-center gap-1.5" aria-label="Main Navigation">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const isActive = pathname === link.href;
                return (
                  <Link key={link.href} href={link.href}>
                    <Button
                      variant={isActive ? "secondary" : "ghost"}
                      size="sm"
                      className={`gap-2 transition-all ${
                        isActive
                          ? "bg-primary/10 text-primary hover:bg-primary/15 font-semibold"
                          : "text-foreground/75 hover:text-foreground hover:bg-muted/70"
                      }`}
                    >
                      <Icon className={`h-4 w-4 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                      <span>{link.label}</span>
                    </Button>
                  </Link>
                );
              })}
            </nav>
          )}
        </div>

        {/* User profile / Auth Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {user ? (
            <>
              {/* Profile Dropdown Container */}
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="flex items-center gap-2.5 rounded-full py-1 px-2 hover:bg-muted/70 transition-colors cursor-pointer border border-transparent hover:border-border/60"
                  aria-label="User navigation menu"
                  aria-expanded={showMenu}
                >
                  <Avatar name={displayName} src={avatarUrl} size="sm" />
                  <div className="hidden sm:flex flex-col text-left">
                    <span className="text-xs font-semibold text-foreground leading-none">{displayName}</span>
                    <span className="text-[10px] text-muted-foreground mt-0.5 max-w-[120px] truncate">
                      {user.email}
                    </span>
                  </div>
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground transition-transform hidden sm:block" />
                </button>

                {showMenu && (
                  <div
                    className="absolute right-0 mt-2 w-64 rounded-xl border border-border bg-card p-2 shadow-2xl z-50 animate-in fade-in-50 zoom-in-95 duration-150"
                  >
                    <div className="px-3 py-2.5 border-b border-border mb-1 bg-muted/20 rounded-lg">
                      <p className="text-xs font-bold text-foreground truncate">{displayName}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{user.email}</p>
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
                      <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-foreground hover:bg-muted text-left transition-colors cursor-pointer min-h-[36px]">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span>Manage Team</span>
                      </button>
                    </Link>

                    <Link href="/settings" className="block w-full">
                      <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-foreground hover:bg-muted text-left transition-colors cursor-pointer min-h-[36px]">
                        <Shield className="h-4 w-4 text-muted-foreground" />
                        <span>Security & MFA</span>
                      </button>
                    </Link>

                    <div className="border-t border-border mt-1 pt-1">
                      <button
                        onClick={() => logout(false)}
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-destructive hover:bg-destructive/10 text-left transition-colors cursor-pointer min-h-[36px]"
                      >
                        <LogOut className="h-4 w-4" />
                        <span>Log Out</span>
                      </button>
                      <button
                        onClick={() => logout(true)}
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-[11px] text-muted-foreground hover:text-destructive hover:bg-destructive/10 text-left transition-colors cursor-pointer"
                      >
                        <span>Log out everywhere (All devices)</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Mobile Hamburger Button */}
              <button
                onClick={() => setShowMobileNav(!showMobileNav)}
                className="md:hidden p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors"
                aria-label="Toggle navigation menu"
              >
                {showMobileNav ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </>
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

      {/* Mobile Drawer Navigation */}
      {user && showMobileNav && (
        <div className="md:hidden border-t border-border bg-card p-4 space-y-2 animate-in slide-in-from-top-2 duration-150 shadow-xl">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            return (
              <Link key={link.href} href={link.href} className="block w-full">
                <Button
                  variant={isActive ? "secondary" : "ghost"}
                  size="sm"
                  className={`w-full justify-start gap-2.5 text-xs ${
                    isActive
                      ? "bg-primary/10 text-primary font-semibold"
                      : "text-foreground/80 hover:text-foreground"
                  }`}
                >
                  <Icon className={`h-4 w-4 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                  <span>{link.label}</span>
                </Button>
              </Link>
            );
          })}
        </div>
      )}
    </header>
  );
}

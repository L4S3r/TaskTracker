"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { CreateWorkspaceModal } from "@/components/patterns/create-workspace-modal";
import {
  CheckSquare,
  Users,
  Shield,
  LogOut,
  Menu,
  X,
  ChevronDown,
  Building2,
  Plus,
  Check,
  Activity,
  AlertTriangle,
} from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { NotificationCenter } from "@/components/patterns/notification-center";

export function Header() {
  const {
    user,
    activeWorkspace,
    workspaces,
    userRole,
    isAdmin,
    isSuperAdmin,
    switchWorkspace,
    logout,
    permissionAlert,
    clearPermissionAlert,
  } = useAuth();

  const pathname = usePathname();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showWorkspaceMenu, setShowWorkspaceMenu] = useState(false);
  const [showMobileNav, setShowMobileNav] = useState(false);
  const [isCreateWsOpen, setIsCreateWsOpen] = useState(false);
  const [isSwitchingWs, setIsSwitchingWs] = useState(false);

  const profileMenuRef = useRef<HTMLDivElement>(null);
  const workspaceMenuRef = useRef<HTMLDivElement>(null);

  const displayName = user?.metadata?.name || user?.username || user?.email?.split("@")[0] || "User";
  const avatarUrl = user?.metadata?.avatar_url;

  // Handle click outside dropdowns
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
      if (workspaceMenuRef.current && !workspaceMenuRef.current.contains(event.target as Node)) {
        setShowWorkspaceMenu(false);
      }
    }
    if (showProfileMenu || showWorkspaceMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showProfileMenu, showWorkspaceMenu]);

  // Close mobile nav on route change
  useEffect(() => {
    setShowMobileNav(false);
    setShowProfileMenu(false);
    setShowWorkspaceMenu(false);
  }, [pathname]);

  const handleSelectWorkspace = async (workspaceId: string) => {
    if (activeWorkspace?.id === workspaceId) {
      setShowWorkspaceMenu(false);
      return;
    }
    setIsSwitchingWs(true);
    try {
      await switchWorkspace(workspaceId);
      setShowWorkspaceMenu(false);
    } catch {
      // Handled in context
    } finally {
      setIsSwitchingWs(false);
    }
  };

  const roleLabelMap: Record<string, string> = {
    superadmin: "SUPERADMIN",
    admin: "ADMIN",
    developer: "DEV",
    dev: "DEV",
    editor: "EDITOR",
    viewer: "VIEWER",
  };

  const navLinks = [
    { href: "/", label: "Tasks", icon: CheckSquare },
    { href: "/workspace/members", label: "Team", icon: Users },
    ...(isAdmin ? [{ href: "/workspace/audit-logs", label: "Audit Telemetry", icon: Activity }] : []),
    { href: "/settings", label: "Security & MFA", icon: Shield },
  ];

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-border/80 bg-background/90 backdrop-blur-md transition-colors">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Brand & Workspace Switcher */}
          <div className="flex items-center gap-4 sm:gap-6">
            <Link
              href="/"
              className="flex items-center gap-2.5 font-bold tracking-tight text-foreground text-lg group select-none shrink-0"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-blue-700 text-primary-foreground shadow-sm group-hover:shadow-md transition-all">
                <CheckSquare className="h-5 w-5" />
              </div>
              <span className="bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text hidden sm:inline-block">
                TaskTracker
              </span>
            </Link>

            {/* Workspace Selector Dropdown */}
            {user && (
              <div className="relative" ref={workspaceMenuRef}>
                <button
                  type="button"
                  onClick={() => setShowWorkspaceMenu(!showWorkspaceMenu)}
                  className="flex items-center gap-2 rounded-xl py-1.5 px-3 bg-secondary/50 hover:bg-secondary border border-border/70 text-xs font-semibold text-foreground transition-all cursor-pointer min-h-[40px] shadow-xs"
                  aria-label="Select Workspace"
                  aria-expanded={showWorkspaceMenu}
                >
                  <Building2 className="h-4 w-4 text-primary shrink-0" />
                  <span className="max-w-[110px] sm:max-w-[160px] truncate">
                    {activeWorkspace?.name || (workspaces.length === 0 ? "No Workspace" : "Select Workspace")}
                  </span>
                  {activeWorkspace && (
                    <Badge variant={userRole as any} className="text-[9px] px-1.5 py-0 uppercase">
                      {roleLabelMap[userRole] || userRole.toUpperCase()}
                    </Badge>
                  )}
                  <ChevronDown className="h-3 w-3 text-muted-foreground transition-transform shrink-0" />
                </button>

                {showWorkspaceMenu && (
                  <div className="absolute left-0 mt-2 w-72 rounded-xl border border-border/80 bg-card p-2 shadow-2xl z-50 animate-in fade-in-50 zoom-in-95 duration-150">
                    <div className="px-3 py-2 border-b border-border/60 mb-1 flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Workspaces ({workspaces.length})
                      </span>
                      <span className="text-[10px] font-medium text-primary">
                        Role: {roleLabelMap[userRole] || userRole.toUpperCase()}
                      </span>
                    </div>

                    <div className="max-h-56 overflow-y-auto custom-scrollbar space-y-1 pr-0.5">
                      {workspaces.map((ws) => {
                        const isSelected = activeWorkspace?.id === ws.id;
                        const wsRole = (ws.member_role || ws.role || "viewer").toLowerCase();
                        return (
                          <button
                            key={ws.id}
                            type="button"
                            disabled={isSwitchingWs}
                            onClick={() => handleSelectWorkspace(ws.id)}
                            className={`flex w-full items-center justify-between p-2.5 rounded-lg text-xs transition-all cursor-pointer min-h-[44px] ${
                              isSelected
                                ? "bg-primary/10 text-primary font-semibold border border-primary/30"
                                : "hover:bg-muted/70 text-foreground/80 hover:text-foreground"
                            }`}
                          >
                            <div className="flex items-center gap-2.5 text-left truncate">
                              <Building2 className={`h-4 w-4 shrink-0 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                              <div className="truncate">
                                <p className="font-semibold text-foreground truncate leading-tight">{ws.name}</p>
                                <p className="text-[10px] text-muted-foreground truncate">
                                  {ws.slug || "workspace"} {ws.member_count ? `• ${ws.member_count} members` : ""}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0 ml-2">
                              <Badge variant={wsRole as any} className="text-[9px] px-1.5 py-0 uppercase">
                                {roleLabelMap[wsRole] || wsRole.toUpperCase()}
                              </Badge>
                              {isSelected && <Check className="h-4 w-4 text-primary" />}
                            </div>
                          </button>
                        );
                      })}

                      {workspaces.length === 0 && (
                        <div className="p-3 text-center text-xs text-muted-foreground">
                          No workspaces available.
                        </div>
                      )}
                    </div>

                    <div className="border-t border-border/60 mt-1 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setShowWorkspaceMenu(false);
                          setIsCreateWsOpen(true);
                        }}
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-xs font-semibold text-primary hover:bg-primary/10 transition-colors cursor-pointer min-h-[44px]"
                      >
                        <Plus className="h-4 w-4" />
                        <span>+ Create New Workspace</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Desktop Navigation Links */}
            {user && (
              <nav className="hidden lg:flex items-center gap-1" aria-label="Main Navigation">
                {navLinks.map((link) => {
                  const Icon = link.icon;
                  const isActive = pathname === link.href || (link.href === "/workspace/members" && pathname === "/team");
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

          {/* User profile / Theme / Auth Actions */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            <ThemeToggle />
            {user ? (
              <>
                <NotificationCenter />
                {/* Profile Dropdown Container */}
                <div className="relative" ref={profileMenuRef}>
                  <button
                    onClick={() => setShowProfileMenu(!showProfileMenu)}
                    className="flex items-center gap-2.5 rounded-full py-1 px-2.5 min-h-[44px] hover:bg-muted/70 transition-colors cursor-pointer border border-transparent hover:border-border/60"
                    aria-label="User navigation menu"
                    aria-expanded={showProfileMenu}
                  >
                    <Avatar name={user?.name || user?.metadata?.name || user?.username} size="sm">
                      <AvatarImage src={user?.avatar_url || user?.metadata?.avatar_url} alt={user?.username} />
                      <AvatarFallback>{user?.username?.slice(0, 2).toUpperCase() || "US"}</AvatarFallback>
                    </Avatar>
                    <div className="hidden sm:flex flex-col text-left">
                      <span className="font-medium text-xs text-foreground leading-tight truncate max-w-[130px]">
                        {user?.name || user?.metadata?.name || user?.username}
                      </span>
                      <span className="text-[10px] text-muted-foreground truncate max-w-[130px]">
                        @{user?.username}
                      </span>
                    </div>
                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground transition-transform hidden sm:block" />
                  </button>

                  {showProfileMenu && (
                    <div className="absolute right-0 mt-2 w-64 rounded-xl border border-border/80 bg-card p-2 shadow-2xl z-50 animate-in fade-in-50 zoom-in-95 duration-150">
                      <div className="px-3 py-2.5 border-b border-border/60 mb-1 bg-muted/20 rounded-lg">
                        <div className="flex items-center gap-2.5 mb-2">
                          <Avatar name={user?.name || user?.metadata?.name || user?.username} size="md">
                            <AvatarImage src={user?.avatar_url || user?.metadata?.avatar_url} alt={user?.username} />
                            <AvatarFallback>{user?.username?.slice(0, 2).toUpperCase() || "US"}</AvatarFallback>
                          </Avatar>
                          <div className="flex flex-col overflow-hidden text-left">
                            <span className="font-medium text-sm text-foreground truncate leading-tight">
                              {user?.name || user?.metadata?.name || user?.username}
                            </span>
                            <span className="text-xs text-muted-foreground truncate">
                              @{user?.username}
                            </span>
                            <span className="text-[10px] text-muted-foreground/80 truncate">
                              {user.email}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5 mt-1">
                          <Badge variant={userRole as any}>
                            {roleLabelMap[userRole] || userRole.toUpperCase()}
                          </Badge>
                          {isSuperAdmin && <Badge variant="superadmin">SUPERADMIN</Badge>}
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          setShowProfileMenu(false);
                          setIsCreateWsOpen(true);
                        }}
                        className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-xs font-medium text-foreground hover:bg-muted/70 text-left transition-colors cursor-pointer min-h-[44px]"
                      >
                        <Plus className="h-4 w-4 text-primary" />
                        <span>Create Workspace</span>
                      </button>

                      <Link href="/workspace/members" className="block w-full">
                        <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-xs font-medium text-foreground hover:bg-muted/70 text-left transition-colors cursor-pointer min-h-[44px]">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span>Workspace Team</span>
                        </button>
                      </Link>

                      {isAdmin && (
                        <Link href="/workspace/audit-logs" className="block w-full">
                          <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-xs font-medium text-foreground hover:bg-muted/70 text-left transition-colors cursor-pointer min-h-[44px]">
                            <Activity className="h-4 w-4 text-muted-foreground" />
                            <span>Security Audit Telemetry</span>
                          </button>
                        </Link>
                      )}

                      <Link href="/settings" className="block w-full">
                        <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-xs font-medium text-foreground hover:bg-muted/70 text-left transition-colors cursor-pointer min-h-[44px]">
                          <Shield className="h-4 w-4 text-muted-foreground" />
                          <span>Security & MFA</span>
                        </button>
                      </Link>

                      <div className="border-t border-border/60 mt-1 pt-1 space-y-0.5">
                        <button
                          onClick={() => logout(false)}
                          className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-xs font-medium text-destructive hover:bg-destructive/10 text-left transition-colors cursor-pointer min-h-[44px]"
                        >
                          <LogOut className="h-4 w-4" />
                          <span>Log Out</span>
                        </button>
                        <button
                          onClick={() => logout(true)}
                          className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-[11px] text-muted-foreground hover:text-destructive hover:bg-destructive/10 text-left transition-colors cursor-pointer min-h-[44px]"
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
                  className="lg:hidden p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/70 transition-colors"
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
          <div className="lg:hidden border-t border-border/80 bg-card p-4 space-y-3 animate-in slide-in-from-top-2 duration-150 shadow-xl">
            {/* User Profile Header in Mobile Drawer */}
            <div className="flex items-center gap-3 p-3 border border-border/60 bg-muted/20 rounded-xl mb-1">
              <Avatar name={user?.name || user?.metadata?.name || user?.username} size="md">
                <AvatarImage src={user?.avatar_url || user?.metadata?.avatar_url} alt={user?.username} />
                <AvatarFallback>{user?.username?.slice(0, 2).toUpperCase() || "US"}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col text-left overflow-hidden">
                <span className="font-medium text-sm text-foreground truncate leading-tight">
                  {user?.name || user?.metadata?.name || user?.username}
                </span>
                <span className="text-xs text-muted-foreground truncate">
                  @{user?.username}
                </span>
                <span className="text-[10px] text-muted-foreground/80 truncate">
                  {user.email}
                </span>
              </div>
            </div>

            <div className="space-y-1">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const isActive = pathname === link.href || (link.href === "/workspace/members" && pathname === "/team");
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
          </div>
        )}
      </header>

      {/* Scoped Permission Alert Toast */}
      {permissionAlert && (
        <div className="fixed top-18 right-4 z-50 max-w-md w-full animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-start justify-between gap-3 p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/15 backdrop-blur-md shadow-2xl text-amber-700 dark:text-amber-300 text-xs font-medium">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
              <div className="space-y-0.5">
                <p className="font-bold">Permission Denied</p>
                <p className="leading-relaxed">{permissionAlert}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={clearPermissionAlert}
              className="p-1 text-amber-700/70 hover:text-amber-900 dark:text-amber-300/70 dark:hover:text-amber-100 rounded-lg"
              aria-label="Dismiss alert"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Create Workspace Modal */}
      <CreateWorkspaceModal isOpen={isCreateWsOpen} onClose={() => setIsCreateWsOpen(false)} />
    </>
  );
}

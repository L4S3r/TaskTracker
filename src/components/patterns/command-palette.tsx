"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme-context";
import { useToast } from "@/lib/toast-context";
import { useCommandPalette } from "@/lib/command-palette-context";
import { api } from "@/lib/api";
import { Task, Workspace } from "@/lib/tasks-store";
import {
  Search,
  CheckSquare,
  Users,
  Shield,
  Activity,
  Plus,
  Building2,
  Sun,
  Moon,
  LogOut,
  ArrowRight,
  Sparkles,
  Command,
  X,
  FileText,
} from "lucide-react";

interface PaletteItem {
  id: string;
  category: "Tasks" | "Navigation" | "Workspaces" | "Actions";
  title: string;
  subtitle?: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  badgeVariant?: "default" | "secondary" | "outline" | "destructive" | "success" | "warning";
  action: () => void;
}

interface CommandPaletteProps {
  onOpenNewTask?: () => void;
  onOpenNewWorkspace?: () => void;
}

export function CommandPalette({ onOpenNewTask, onOpenNewWorkspace }: CommandPaletteProps) {
  const { isOpen, close } = useCommandPalette();
  const { user, token, activeWorkspace, workspaces, switchWorkspace, isAdmin, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const router = useRouter();

  const [query, setQuery] = useState("");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Fetch current workspace tasks when palette opens
  useEffect(() => {
    if (isOpen && token && activeWorkspace?.id) {
      api
        .getTasks(token, { workspace_id: activeWorkspace.id })
        .then((res) => setTasks(res.tasks || []))
        .catch(() => setTasks([]));
    }
  }, [isOpen, token, activeWorkspace?.id]);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Compile full command palette items
  const items: PaletteItem[] = [];

  // 1. Navigation Category
  if (user) {
    items.push({
      id: "nav_tasks",
      category: "Navigation",
      title: "Sprint Tasks Board",
      subtitle: "Main Kanban deliverable workflow",
      icon: CheckSquare,
      action: () => {
        close();
        router.push("/");
      },
    });

    items.push({
      id: "nav_team",
      category: "Navigation",
      title: "Team Members & Clearance",
      subtitle: "Roster, invites, and RBAC roles",
      icon: Users,
      action: () => {
        close();
        router.push("/workspace/members");
      },
    });

    items.push({
      id: "nav_security",
      category: "Navigation",
      title: "Security & MFA Settings",
      subtitle: "TOTP authenticators and trusted devices",
      icon: Shield,
      action: () => {
        close();
        router.push("/settings");
      },
    });

    if (isAdmin) {
      items.push({
        id: "nav_audit",
        category: "Navigation",
        title: "Security Audit Telemetry",
        subtitle: "Immutable event logs and access decisions",
        icon: Activity,
        action: () => {
          close();
          router.push("/workspace/audit-logs");
        },
      });
    }
  }

  // 2. Actions Category
  if (user) {
    if (onOpenNewTask) {
      items.push({
        id: "act_new_task",
        category: "Actions",
        title: "Create New Task",
        subtitle: "Add a new sprint deliverable",
        icon: Plus,
        badge: "N",
        action: () => {
          close();
          onOpenNewTask();
        },
      });
    }

    if (onOpenNewWorkspace) {
      items.push({
        id: "act_new_ws",
        category: "Actions",
        title: "Create New Workspace",
        subtitle: "Set up a new organization workspace",
        icon: Building2,
        action: () => {
          close();
          onOpenNewWorkspace();
        },
      });
    }

    items.push({
      id: "act_theme",
      category: "Actions",
      title: theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode",
      subtitle: "Toggle visual color theme",
      icon: theme === "dark" ? Sun : Moon,
      action: () => {
        const nextTheme = theme === "dark" ? "light" : "dark";
        setTheme(nextTheme);
        toast.info("Theme Updated", `Switched to ${nextTheme} mode.`);
        close();
      },
    });

    items.push({
      id: "act_logout",
      category: "Actions",
      title: "Log Out",
      subtitle: "Sign out of your current session",
      icon: LogOut,
      action: () => {
        close();
        logout();
      },
    });
  }

  // 3. Workspaces Category
  if (workspaces.length > 1) {
    workspaces.forEach((ws) => {
      const isCurrent = activeWorkspace?.id === ws.id;
      items.push({
        id: `ws_${ws.id}`,
        category: "Workspaces",
        title: ws.name,
        subtitle: isCurrent ? "Active workspace" : "Switch to this workspace",
        icon: Building2,
        badge: isCurrent ? "Current" : undefined,
        badgeVariant: isCurrent ? "secondary" : undefined,
        action: () => {
          if (!isCurrent) {
            switchWorkspace(ws.id);
            toast.success("Workspace Switched", `Switched to ${ws.name}`);
          }
          close();
        },
      });
    });
  }

  // 4. Tasks Category (Matching active query)
  tasks.forEach((t) => {
    items.push({
      id: `task_${t.id}`,
      category: "Tasks",
      title: t.title,
      subtitle: t.description || `Priority: ${t.priority.toUpperCase()} • Status: ${t.status}`,
      icon: FileText,
      badge: t.priority.toUpperCase(),
      badgeVariant:
        t.priority === "urgent"
          ? "destructive"
          : t.priority === "high"
          ? "warning"
          : t.priority === "medium"
          ? "secondary"
          : "outline",
      action: () => {
        close();
        router.push(`/?task=${t.id}&workspace=${activeWorkspace?.id || ""}`);
      },
    });
  });

  // Filter items by search query
  const filteredItems = items.filter((item) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      item.title.toLowerCase().includes(q) ||
      (item.subtitle && item.subtitle.toLowerCase().includes(q)) ||
      item.category.toLowerCase().includes(q)
    );
  });

  // Group filtered items by category
  const categories = ["Tasks", "Navigation", "Workspaces", "Actions"] as const;

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      close();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < filteredItems.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : filteredItems.length - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filteredItems[selectedIndex]) {
        filteredItems[selectedIndex].action();
      }
    }
  };

  // Scroll active item into view
  useEffect(() => {
    if (listRef.current) {
      const activeEl = listRef.current.querySelector(`[data-index="${selectedIndex}"]`);
      if (activeEl) {
        activeEl.scrollIntoView({ block: "nearest" });
      }
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Command Palette"
      className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh] px-4 bg-background/80 backdrop-blur-md animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div
        className="w-full max-w-xl rounded-2xl border border-border bg-card shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-150"
        onKeyDown={handleKeyDown}
      >
        {/* Search Bar Input */}
        <div className="flex items-center px-4 border-b border-border/80 bg-card">
          <Search className="h-4 w-4 text-muted-foreground shrink-0 mr-3" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a command or search tasks, pages, workspaces..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            className="h-14 w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="text-muted-foreground hover:text-foreground p-1 rounded-md transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          ) : (
            <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono text-muted-foreground bg-muted border border-border/80">
              ESC
            </kbd>
          )}
        </div>

        {/* Results List */}
        <div ref={listRef} className="max-h-[380px] overflow-y-auto custom-scrollbar p-2 space-y-3">
          {filteredItems.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground space-y-1">
              <p className="text-xs font-semibold text-foreground">No matching commands or tasks</p>
              <p className="text-[11px]">Try typing a task title, navigation link, or workspace name.</p>
            </div>
          ) : (
            categories.map((cat) => {
              const catItems = filteredItems.filter((i) => i.category === cat);
              if (catItems.length === 0) return null;

              return (
                <div key={cat} className="space-y-1">
                  <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    {cat}
                  </div>
                  {catItems.map((item) => {
                    const globalIdx = filteredItems.indexOf(item);
                    const isSelected = selectedIndex === globalIdx;
                    const Icon = item.icon;

                    return (
                      <div
                        key={item.id}
                        data-index={globalIdx}
                        onClick={() => item.action()}
                        onMouseEnter={() => setSelectedIndex(globalIdx)}
                        className={`flex items-center justify-between p-2.5 rounded-xl text-xs transition-colors cursor-pointer ${
                          isSelected
                            ? "bg-primary/10 text-primary font-medium"
                            : "hover:bg-muted/70 text-foreground/80"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0 pr-2">
                          <div
                            className={`flex h-8 w-8 items-center justify-center rounded-lg border shrink-0 ${
                              isSelected
                                ? "border-primary/40 bg-primary/20 text-primary"
                                : "border-border/70 bg-secondary/50 text-muted-foreground"
                            }`}
                          >
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="truncate">
                            <p className={`font-semibold truncate leading-tight ${isSelected ? "text-primary" : "text-foreground"}`}>
                              {item.title}
                            </p>
                            {item.subtitle && (
                              <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                                {item.subtitle}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {item.badge && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-muted text-muted-foreground border border-border/70">
                              {item.badge}
                            </span>
                          )}
                          {isSelected && <ArrowRight className="h-3.5 w-3.5 text-primary" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>

        {/* Command Palette Footer Hints */}
        <div className="px-4 py-2.5 border-t border-border/70 bg-secondary/30 flex items-center justify-between text-[11px] text-muted-foreground">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-card border border-border/80">↑</kbd>
              <kbd className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-card border border-border/80">↓</kbd>
              <span>Navigate</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-card border border-border/80">↵</kbd>
              <span>Select</span>
            </span>
          </div>

          <div className="flex items-center gap-1">
            <Command className="h-3 w-3" />
            <span className="font-semibold">TaskTracker Command Palette</span>
          </div>
        </div>
      </div>
    </div>
  );
}

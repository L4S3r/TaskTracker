"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { InAppNotification } from "@/lib/tasks-store";
import { useWorkspaceSocket } from "@/lib/use-workspace-socket";
import { queryClient, queryKeys } from "@/lib/query-client";
import { Button } from "@/components/ui/button";
import {
  Bell,
  CheckCheck,
  CheckSquare,
  Users,
  Shield,
  Clock,
  ExternalLink,
  Sparkles,
} from "lucide-react";

function formatRelativeTime(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHours = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSec < 45) return "just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return "yesterday";
    return `${diffDays}d ago`;
  } catch {
    return dateStr;
  }
}

export function NotificationCenter() {
  const router = useRouter();
  const { token, activeWorkspace, switchWorkspace } = useAuth();
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // TanStack Query for notifications (Conservative caching, Zero HTTP short-polling)
  const { data: notifData, isLoading } = useQuery({
    queryKey: queryKeys.notifications,
    queryFn: async () => {
      const res = await api.getNotifications(token || undefined);
      return {
        unread_count: res.unread_count || 0,
        notifications: res.notifications || [],
      };
    },
    enabled: Boolean(token),
  });

  const notifications: InAppNotification[] = notifData?.notifications || [];
  const unreadCount: number =
    typeof notifData?.unread_count === "number"
      ? notifData.unread_count
      : notifications.filter((n) => !n.is_read || n.is_read === 0).length;

  // Real-time WebSocket hook to capture live incoming notifications
  useWorkspaceSocket(activeWorkspace?.id);

  // Handle click outside to close popover
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleMarkAsRead = async (id: string) => {
    if (!token) return;

    // Optimistically update query cache
    queryClient.setQueryData(queryKeys.notifications, (old: any) => {
      if (!old) return old;
      const list = old.notifications || [];
      return {
        ...old,
        unread_count: Math.max(0, (old.unread_count || 1) - 1),
        notifications: list.map((n: any) => (n.id === id ? { ...n, is_read: 1 } : n)),
      };
    });

    try {
      await api.markNotificationRead(token, id);
    } catch {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications });
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!token) return;

    // Optimistically update query cache
    queryClient.setQueryData(queryKeys.notifications, (old: any) => {
      if (!old) return old;
      const list = old.notifications || [];
      return {
        ...old,
        unread_count: 0,
        notifications: list.map((n: any) => ({ ...n, is_read: 1 })),
      };
    });

    try {
      await api.markAllNotificationsRead(token);
    } catch {
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications });
    }
  };

  const handleNotificationClick = async (notif: InAppNotification, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    handleMarkAsRead(notif.id);
    setIsOpen(false);

    // Deep-linking: Extract workspace and task IDs from notification
    let targetWsId = notif.workspace_id;
    if (notif.link) {
      try {
        const dummy = new URL(notif.link, "http://localhost");
        const wsParam = dummy.searchParams.get("workspace") || dummy.searchParams.get("workspace_id");
        if (wsParam) targetWsId = wsParam;
      } catch {}
    }

    // Step 1 & 2: Verify if target workspace matches active workspace; if different, switch first
    if (targetWsId && activeWorkspace?.id !== targetWsId) {
      try {
        await switchWorkspace(targetWsId);
      } catch {
        // Handled via context 403 interceptor
      }
    }

    // Step 3: Navigate to deep link
    if (notif.link) {
      const cleanLink = notif.link.startsWith("/dashboard")
        ? notif.link.replace(/^\/dashboard/, "") || "/"
        : notif.link;
      router.push(cleanLink);
    } else {
      router.push("/");
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "TASK_ASSIGNED":
        return <CheckSquare className="h-4 w-4 text-blue-500" />;
      case "WORKSPACE_INVITATION":
        return <Users className="h-4 w-4 text-emerald-500" />;
      case "SECURITY_ALERT":
        return <Shield className="h-4 w-4 text-rose-500" />;
      default:
        return <Bell className="h-4 w-4 text-indigo-500" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-border/70 bg-card hover:bg-accent/60 transition-colors shadow-2xs text-muted-foreground hover:text-foreground cursor-pointer"
        title="Notifications"
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground shadow-xs animate-in zoom-in-50 duration-150">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl border border-border bg-card dark:bg-card shadow-2xl z-50 overflow-hidden animate-in fade-in-50 zoom-in-95 duration-150">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-border bg-muted/70">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-foreground">Notifications</h3>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20">
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleMarkAllAsRead}
                className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground px-2 cursor-pointer"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                <span>Mark all read</span>
              </Button>
            )}
          </div>

          {/* Notifications List */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-border/60 bg-card">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 px-4 text-center bg-card">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground mb-3">
                  <Sparkles className="h-6 w-6" />
                </div>
                <p className="text-sm font-semibold text-foreground">All caught up!</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  No new notifications at this time.
                </p>
              </div>
            ) : (
              notifications.map((notif) => {
                const isUnread = !notif.is_read || notif.is_read === 0;
                return (
                  <div
                    key={notif.id}
                    onClick={(e) => handleNotificationClick(notif, e)}
                    className={`flex items-start gap-3 p-3.5 transition-colors cursor-pointer ${
                      isUnread
                        ? "bg-primary/10 hover:bg-primary/15 dark:bg-primary/20 dark:hover:bg-primary/25 border-l-2 border-primary"
                        : "bg-card hover:bg-muted/60"
                    }`}
                  >
                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-muted border border-border/80 shadow-2xs">
                      {getNotificationIcon(notif.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <p className={`text-xs truncate ${isUnread ? "text-foreground font-bold" : "text-foreground font-medium"}`}>
                          {notif.title}
                        </p>
                        <span className="text-[10px] text-muted-foreground shrink-0 flex items-center gap-1">
                          <Clock className="h-2.5 w-2.5" />
                          {formatRelativeTime(notif.created_at)}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5 leading-relaxed">
                        {notif.message}
                      </p>
                      {notif.link && (
                        <button
                          type="button"
                          onClick={(e) => handleNotificationClick(notif, e)}
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline mt-1.5 cursor-pointer"
                        >
                          <span>View Details</span>
                          <ExternalLink className="h-2.5 w-2.5" />
                        </button>
                      )}
                    </div>
                    {isUnread && (
                      <span className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1.5 shadow-xs" />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

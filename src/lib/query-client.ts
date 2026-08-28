import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      gcTime: 10 * 60 * 1000, // 10 minutes
      refetchOnWindowFocus: false, // Stop tab-switch spam
      refetchOnMount: false, // Use existing valid cached data
      refetchOnReconnect: true, // Refresh if connection drops and reconnects
      retry: 1,
    },
  },
});

export const queryKeys = {
  authMe: ["auth", "me"] as const,
  passkeys: ["webauthn", "credentials"] as const,
  trustedDevices: ["auth", "trusted-devices"] as const,
  notifications: ["notifications"] as const,
  workspaces: ["workspaces"] as const,
  tasks: (workspaceId?: string) => ["tasks", workspaceId] as const,
  workspaceMembers: (workspaceId?: string) => ["workspaces", workspaceId, "members"] as const,
  auditLogs: (workspaceId?: string) => ["audit", "logs", workspaceId] as const,
};

/**
 * Reactive WebSocket event handler for real-time in-app notifications
 */
export function handleNotificationSocketEvent(payload: any) {
  if (!payload || !payload.event) return;

  switch (payload.event) {
    case "notification.received":
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications });
      break;

    case "notification.read":
      queryClient.setQueryData(queryKeys.notifications, (old: any) => {
        if (!old) return old;
        const targetId = payload.id || payload.notification_id;
        const notificationsList = Array.isArray(old.notifications)
          ? old.notifications
          : Array.isArray(old)
          ? old
          : [];

        const updated = notificationsList.map((n: any) =>
          n.id === targetId ? { ...n, is_read: 1 } : n
        );

        const currentUnread =
          typeof old.unread_count === "number"
            ? old.unread_count
            : notificationsList.filter((n: any) => !n.is_read || n.is_read === 0).length;

        return {
          ...old,
          unread_count: Math.max(0, currentUnread - 1),
          notifications: updated,
        };
      });
      break;

    case "notification.read_all":
      queryClient.setQueryData(queryKeys.notifications, (old: any) => {
        if (!old) return old;
        const notificationsList = Array.isArray(old.notifications)
          ? old.notifications
          : Array.isArray(old)
          ? old
          : [];

        return {
          ...old,
          unread_count: 0,
          notifications: notificationsList.map((n: any) => ({ ...n, is_read: 1 })),
        };
      });
      break;
  }
}

/**
 * Attaches real-time notification listeners to an active WebSocket connection
 */
export function setupNotificationSocket(ws: WebSocket) {
  const messageListener = (event: MessageEvent) => {
    try {
      const payload = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
      handleNotificationSocketEvent(payload);
    } catch {
      // Non-JSON message (e.g. heartbeat pong)
    }
  };

  ws.addEventListener("message", messageListener);
  return () => {
    ws.removeEventListener("message", messageListener);
  };
}

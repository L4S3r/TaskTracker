"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Task } from "./tasks-store";
import { useAuth } from "./auth-context";

export interface WorkspaceSocketEvent {
  event: "connected" | "task.created" | "task.updated" | "task.deleted" | "notification.received" | "pong";
  workspace_id?: string;
  task?: Task;
  task_id?: string;
  actor?: any;
  notification?: any;
  timestamp?: string;
}

export interface UseWorkspaceSocketOptions {
  onTaskCreated?: (task: Task) => void;
  onTaskUpdated?: (task: Task) => void;
  onTaskDeleted?: (taskId: string) => void;
  onNotification?: (notification: any) => void;
}

export function useWorkspaceSocket(
  workspaceId: string | undefined,
  options: UseWorkspaceSocketOptions = {}
) {
  const { token } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const isUnmountedRef = useRef(false);

  const optionsRef = useRef(options);
  optionsRef.current = options;

  const connect = useCallback(() => {
    if (!workspaceId || isUnmountedRef.current) return;

    // Clean up existing socket safely
    if (socketRef.current) {
      socketRef.current.onopen = null;
      socketRef.current.onclose = null;
      socketRef.current.onerror = null;
      socketRef.current.onmessage = null;
      socketRef.current.close();
      socketRef.current = null;
    }

    const apiBase = process.env.NEXT_PUBLIC_AUTH_API_URL || "http://localhost:8000";
    let wsUrl = apiBase.replace(/^http:\/\//i, "ws://").replace(/^https:\/\//i, "wss://");
    wsUrl = `${wsUrl.replace(/\/+$/, "")}/ws/workspaces/${encodeURIComponent(workspaceId)}`;
    if (token && token !== "cookie_session" && token.includes(".")) {
      wsUrl += `?token=${encodeURIComponent(token)}`;
    }

    try {
      const connectStartTime = Date.now();
      const ws = new WebSocket(wsUrl);
      socketRef.current = ws;

      ws.onopen = () => {
        if (isUnmountedRef.current) {
          ws.close();
          return;
        }
        setIsConnected(true);
        reconnectAttemptsRef.current = 0;

        // Start steady heartbeat ping
        if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            try {
              ws.send(JSON.stringify({ type: "ping" }));
            } catch {
              // Ignore send error
            }
          }
        }, 25000);
      };

      ws.onmessage = (event) => {
        try {
          const data: WorkspaceSocketEvent = JSON.parse(event.data);
          if (data.event === "task.created" && data.task) {
            optionsRef.current.onTaskCreated?.(data.task);
          } else if (data.event === "task.updated" && data.task) {
            optionsRef.current.onTaskUpdated?.(data.task);
          } else if (data.event === "task.deleted" && data.task_id) {
            optionsRef.current.onTaskDeleted?.(data.task_id);
          } else if (data.event === "notification.received" && data.notification) {
            optionsRef.current.onNotification?.(data.notification);
          }
        } catch {
          // Non-JSON message (e.g. "pong")
        }
      };

      ws.onclose = (event) => {
        if (isUnmountedRef.current) return;
        setIsConnected(false);
        if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);

        // Calculate backoff if disconnected abruptly or immediately errored
        const connectionDuration = Date.now() - connectStartTime;
        if (event.code !== 1000 && event.code !== 1008) {
          // If connection dropped in under 2s, don't spin immediately — apply minimum 3s backoff
          const baseDelay = connectionDuration < 2000 ? 3000 : 1500;
          const delay = Math.min(baseDelay * Math.pow(1.5, reconnectAttemptsRef.current), 30000);
          reconnectAttemptsRef.current += 1;

          if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = setTimeout(() => {
            if (!isUnmountedRef.current) {
              connect();
            }
          }, delay);
        }
      };

      ws.onerror = () => {
        // ws.close will trigger ws.onclose with clean backoff pacing
        try {
          ws.close();
        } catch {
          // Ignore
        }
      };
    } catch {
      setIsConnected(false);
    }
  }, [workspaceId, token]);

  useEffect(() => {
    isUnmountedRef.current = false;
    connect();

    return () => {
      isUnmountedRef.current = true;
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
      if (socketRef.current) {
        socketRef.current.onopen = null;
        socketRef.current.onclose = null;
        socketRef.current.onerror = null;
        socketRef.current.onmessage = null;
        socketRef.current.close(1000, "Component unmounted");
        socketRef.current = null;
      }
    };
  }, [connect]);

  return { isConnected };
}

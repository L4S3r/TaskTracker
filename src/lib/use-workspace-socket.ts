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

  const optionsRef = useRef(options);
  optionsRef.current = options;

  const connect = useCallback(() => {
    if (!workspaceId) return;

    // Clean up existing socket
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }

    const apiBase = process.env.NEXT_PUBLIC_AUTH_API_URL || "http://localhost:8000";
    let wsUrl = apiBase.replace(/^http:\/\//i, "ws://").replace(/^https:\/\//i, "wss://");
    wsUrl = `${wsUrl.replace(/\/+$/, "")}/ws/workspaces/${encodeURIComponent(workspaceId)}`;
    if (token) {
      wsUrl += `?token=${encodeURIComponent(token)}`;
    }

    try {
      const ws = new WebSocket(wsUrl);
      socketRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        reconnectAttemptsRef.current = 0;

        // Start heartbeat ping
        if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: "ping" }));
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
        setIsConnected(false);
        if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);

        // Reconnect with exponential backoff if not closed cleanly
        if (event.code !== 1000 && event.code !== 1008) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 15000);
          reconnectAttemptsRef.current += 1;
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, delay);
        }
      };

      ws.onerror = () => {
        ws.close();
      };
    } catch (err) {
      console.warn("Failed to initialize workspace WebSocket:", err);
    }
  }, [workspaceId, token]);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
      if (socketRef.current) {
        socketRef.current.close(1000, "Component unmounted");
        socketRef.current = null;
      }
    };
  }, [connect]);

  return { isConnected };
}

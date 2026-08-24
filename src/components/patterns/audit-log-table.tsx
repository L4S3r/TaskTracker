"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { AuditLog } from "@/lib/tasks-store";

export interface AuditLogTableProps {
  logs: AuditLog[];
  onInspectJson?: (log: AuditLog) => void;
}

export const AuditLogTable: React.FC<AuditLogTableProps> = ({ logs, onInspectJson }) => {
  const getSeverityBadge = (severity?: string) => {
    const s = (severity || "INFO").toUpperCase();
    switch (s) {
      case "CRITICAL":
      case "ERROR":
        return <Badge variant="destructive">CRITICAL</Badge>;
      case "WARNING":
      case "WARN":
        return (
          <span className="inline-flex items-center rounded-md border border-amber-500/30 bg-amber-500 text-white dark:text-slate-900 font-bold px-2 py-0.5 text-[10px]">
            WARN
          </span>
        );
      default:
        return (
          <Badge variant="secondary" className="text-[10px] px-2 py-0.5 font-medium">
            INFO
          </Badge>
        );
    }
  };

  const formatTimestamp = (ts?: string) => {
    if (!ts) return "-";
    try {
      const cleanTs = ts.includes(" ") ? ts.replace(" ", "T") : ts;
      const date = new Date(cleanTs);
      if (isNaN(date.getTime())) return ts;
      return date.toLocaleString();
    } catch {
      return ts;
    }
  };

  const formatMetadata = (meta: any) => {
    if (!meta) return "-";
    try {
      const parsed = typeof meta === "string" ? JSON.parse(meta) : meta;
      return (
        <pre className="text-xs max-w-xs truncate font-mono text-muted-foreground bg-muted/40 px-2 py-0.5 rounded border border-border/50 select-all">
          {JSON.stringify(parsed)}
        </pre>
      );
    } catch {
      return (
        <span className="text-xs font-mono text-muted-foreground truncate max-w-xs block">
          {String(meta)}
        </span>
      );
    }
  };

  const formatEventType = (eventType: string) => {
    switch (eventType) {
      case "MFA_SKIPPED_TRUSTED_DEVICE":
        return (
          <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            MFA_SKIPPED_TRUSTED_DEVICE
          </span>
        );
      case "ACCOUNT_LOCKOUT":
        return (
          <span className="inline-flex items-center gap-1 font-semibold text-rose-600 dark:text-rose-400">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-500"></span>
            ACCOUNT_LOCKOUT
          </span>
        );
      case "REFRESH_TOKEN_REUSE_DETECTED":
        return (
          <span className="inline-flex items-center gap-1 font-semibold text-amber-600 dark:text-amber-400">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500"></span>
            REFRESH_TOKEN_REUSE_DETECTED
          </span>
        );
      default:
        return <span className="font-semibold text-foreground">{eventType}</span>;
    }
  };

  if (!logs || logs.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground border border-dashed rounded-xl bg-secondary/20">
        No audit telemetry events recorded yet.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border/80 bg-card shadow-sm">
      <table className="w-full text-sm text-left">
        <thead className="bg-muted/50 text-muted-foreground font-medium border-b border-border/70 text-xs">
          <tr>
            <th className="p-3 font-semibold whitespace-nowrap">Timestamp</th>
            <th className="p-3 font-semibold">Severity</th>
            <th className="p-3 font-semibold">Event Type</th>
            <th className="p-3 font-semibold">Subject / User</th>
            <th className="p-3 font-semibold">IP Address</th>
            <th className="p-3 font-semibold">Workspace</th>
            <th className="p-3 font-semibold">Metadata</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/60 text-xs">
          {logs.map((log, index) => {
            const ts = log.timestamp || log.created_at;
            const eventType = log.event_type || log.event || log.action || "system.event";
            const subject = log.subject_id || log.actor_email || log.actor || log.actor_id || "system";
            const ip = log.ip_address || log.ip || "-";
            const ws = log.workspace_id || "global";
            const meta = log.metadata || log.details;

            return (
              <tr
                key={log.id || index}
                onClick={() => onInspectJson?.(log)}
                className={`hover:bg-muted/30 transition-colors ${onInspectJson ? "cursor-pointer" : ""}`}
              >
                <td className="p-3 font-mono text-xs whitespace-nowrap text-muted-foreground">
                  {formatTimestamp(ts)}
                </td>
                <td className="p-3">{getSeverityBadge(log.severity)}</td>
                <td className="p-3">{formatEventType(eventType)}</td>
                <td className="p-3 font-mono text-xs text-foreground/80">
                  {subject}
                </td>
                <td className="p-3 font-mono text-xs text-muted-foreground">{ip}</td>
                <td className="p-3">
                  <span className="text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-foreground/80 border border-border/50">
                    {ws}
                  </span>
                </td>
                <td className="p-3">{formatMetadata(meta)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

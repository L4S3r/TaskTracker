"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { AuditLog } from "@/lib/tasks-store";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Activity,
  Shield,
  ShieldAlert,
  ShieldCheck,
  RefreshCw,
  Search,
  ChevronDown,
  ChevronRight,
  Filter,
  Terminal,
  Clock,
  User,
  Globe,
  AlertCircle,
  Copy,
  Check,
} from "lucide-react";

export function AuditLogsView() {
  const { token, activeWorkspace, isAdmin, isSuperAdmin } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [eventTypeFilter, setEventTypeFilter] = useState<string>("all");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Expanded Log Drawer
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [copiedLogId, setCopiedLogId] = useState<string | null>(null);

  const fetchAuditLogs = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    setError(null);

    const wsId = activeWorkspace?.id;
    try {
      if (wsId) {
        const res = await api.getWorkspaceAuditLogs(token, wsId, {
          limit: 50,
          offset: 0,
          event_type: eventTypeFilter !== "all" ? eventTypeFilter : undefined,
          severity: severityFilter !== "all" ? severityFilter : undefined,
        });
        setLogs(res.logs || []);
      } else {
        const res = await api.getAuditLogs(token, 50, 0);
        setLogs(res.logs || []);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load audit logs from security gateway.");
    } finally {
      setIsLoading(false);
    }
  }, [token, activeWorkspace?.id, eventTypeFilter, severityFilter]);

  // Immediate cache invalidation on workspace switch: clear previous workspace's audit telemetry
  useEffect(() => {
    setLogs([]);
    setIsLoading(true);
    setError(null);
    fetchAuditLogs();
  }, [activeWorkspace?.id, fetchAuditLogs]);

  const handleCopyJson = (log: AuditLog, id: string) => {
    navigator.clipboard.writeText(JSON.stringify(log, null, 2));
    setCopiedLogId(id);
    setTimeout(() => setCopiedLogId(null), 2000);
  };

  const filteredLogs = logs.filter((log) => {
    const eventText = (log.event_type || log.event || log.action || "").toLowerCase();
    const actorText = (log.actor_email || log.actor || log.actor_id || "").toLowerCase();
    const ipText = (log.ip_address || log.ip || "").toLowerCase();
    const detailsText = log.details || log.metadata ? JSON.stringify(log.details || log.metadata).toLowerCase() : "";

    const matchesSearch =
      searchQuery === "" ||
      eventText.includes(searchQuery.toLowerCase()) ||
      actorText.includes(searchQuery.toLowerCase()) ||
      ipText.includes(searchQuery.toLowerCase()) ||
      detailsText.includes(searchQuery.toLowerCase());

    const logSeverity = (log.severity || "INFO").toUpperCase();
    const matchesSeverity = severityFilter === "all" || logSeverity === severityFilter.toUpperCase();

    const matchesEventType =
      eventTypeFilter === "all" || eventText.includes(eventTypeFilter.toLowerCase());

    return matchesSearch && matchesSeverity && matchesEventType;
  });

  const getSeverityBadgeVariant = (severity?: string): "info" | "warning" | "critical" => {
    const s = (severity || "INFO").toUpperCase();
    if (s === "CRITICAL" || s === "ERROR") return "critical";
    if (s === "WARNING" || s === "WARN") return "warning";
    return "info";
  };

  if (!isAdmin) {
    return (
      <div className="flex min-h-[55vh] items-center justify-center p-4">
        <Card className="max-w-md w-full text-center p-6 border-border/80 shadow-2xl bg-card">
          <CardHeader className="space-y-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive mx-auto">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <CardTitle className="text-lg font-bold text-destructive">Clearance Restricted</CardTitle>
            <CardDescription className="text-xs">
              Security Audit Telemetry is restricted to Workspace Administrators and Superadmins.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Security Audit Telemetry
            </h1>
            <Badge variant="superadmin" className="text-xs">
              Immutable Log
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Live compliance records of workspace mutations, credential events, and access decisions in{" "}
            <strong>{activeWorkspace?.name || "current workspace"}</strong>.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchAuditLogs}
            className="gap-1.5"
            title="Refresh telemetry"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive font-medium">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Filter Controls Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-3 p-3.5 rounded-xl border border-border/80 bg-card shadow-xs">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder="Search by actor, IP, event, details..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-11 min-h-[44px] w-full rounded-xl border border-input bg-background dark:bg-slate-900/80 pl-10 pr-4 text-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary transition-colors"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Severity Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold text-muted-foreground whitespace-nowrap uppercase tracking-wider">
              Severity:
            </span>
            <div className="relative">
              <select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
                className="h-11 min-h-[44px] rounded-xl border border-input bg-background dark:bg-slate-900/80 pl-3 pr-8 text-xs font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary cursor-pointer transition-colors appearance-none [&>option]:bg-card dark:[&>option]:bg-slate-900 [&>option]:text-foreground"
              >
                <option value="all">All Severities</option>
                <option value="INFO">🔵 INFO</option>
                <option value="WARNING">🟡 WARNING</option>
                <option value="CRITICAL">🔴 CRITICAL</option>
              </select>
              <ChevronDown className="absolute right-2.5 top-4 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            </div>
          </div>

          {/* Event Type Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold text-muted-foreground whitespace-nowrap uppercase tracking-wider">
              Event:
            </span>
            <div className="relative">
              <select
                value={eventTypeFilter}
                onChange={(e) => setEventTypeFilter(e.target.value)}
                className="h-11 min-h-[44px] rounded-xl border border-input bg-background dark:bg-slate-900/80 pl-3 pr-8 text-xs font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary cursor-pointer transition-colors appearance-none [&>option]:bg-card dark:[&>option]:bg-slate-900 [&>option]:text-foreground"
              >
                <option value="all">All Event Types</option>
                <option value="WORKSPACE">Workspace Events</option>
                <option value="MEMBER">Member Events</option>
                <option value="TASK">Task Deliverable Events</option>
                <option value="ACCESS">Access & Auth Decisions</option>
              </select>
              <ChevronDown className="absolute right-2.5 top-4 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {/* Audit Telemetry Timeline Table */}
      <Card className="border-border/80 shadow-sm bg-card overflow-hidden">
        <CardHeader className="p-4 sm:p-5 pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" />
                <span>Security Events Log ({filteredLogs.length})</span>
              </CardTitle>
              <CardDescription>RFC 5424 compliant structured audit stream.</CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading && logs.length === 0 ? (
            <div className="flex min-h-[220px] items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-3 border-primary border-t-transparent" />
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center min-h-[200px] p-8 text-center text-muted-foreground space-y-2">
              <Shield className="h-8 w-8 text-muted-foreground/60" />
              <p className="text-xs font-semibold text-foreground">No audit telemetry records match the filter.</p>
            </div>
          ) : (
            <div className="divide-y border-t border-border/60 divide-border/60">
              {filteredLogs.map((log, idx) => {
                const logId = log.id || `log-${idx}`;
                const isExpanded = expandedLogId === logId;
                const eventName = log.event_type || log.event || log.action || "SECURITY_EVENT";
                const timestamp = log.created_at || log.timestamp || new Date().toISOString();
                const severity = (log.severity || "INFO").toUpperCase();
                const actor = log.actor_email || log.actor || log.actor_id || "System Gateway";
                const ip = log.ip_address || log.ip || "127.0.0.1";
                const rawPayload = log.details || log.metadata || log;

                return (
                  <div key={logId} className="transition-colors hover:bg-muted/30">
                    <div
                      onClick={() => setExpandedLogId(isExpanded ? null : logId)}
                      className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer select-none"
                    >
                      <div className="flex items-start sm:items-center gap-3">
                        <div className="mt-0.5 sm:mt-0">
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4 text-primary shrink-0" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                          )}
                        </div>

                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-xs font-bold text-foreground">{eventName}</span>
                            <Badge variant={getSeverityBadgeVariant(severity)} className="text-[9px] px-1.5 py-0 uppercase">
                              {severity}
                            </Badge>
                          </div>

                          <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-1 flex-wrap">
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              <span>{actor}</span>
                            </span>
                            <span className="flex items-center gap-1">
                              <Globe className="h-3 w-3" />
                              <span className="font-mono">{ip}</span>
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center text-xs text-muted-foreground">
                        <Clock className="h-3.5 w-3.5 shrink-0" />
                        <span className="font-mono text-[11px]">
                          {new Date(timestamp).toLocaleString()}
                        </span>
                      </div>
                    </div>

                    {/* Expandable JSON Details Drawer */}
                    {isExpanded && (
                      <div className="px-4 pb-4 pt-1 animate-in fade-in-50 duration-150">
                        <div className="rounded-xl border border-border/80 bg-secondary/50 p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1.5">
                              <Terminal className="h-3.5 w-3.5 text-primary" />
                              <span>Structured Audit Payload</span>
                            </span>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopyJson(rawPayload, logId);
                              }}
                              className="h-8 text-xs gap-1.5 py-1 px-2.5"
                            >
                              {copiedLogId === logId ? (
                                <Check className="h-3.5 w-3.5 text-emerald-500" />
                              ) : (
                                <Copy className="h-3.5 w-3.5" />
                              )}
                              <span>{copiedLogId === logId ? "Copied" : "Copy JSON"}</span>
                            </Button>
                          </div>

                          <pre className="p-3 rounded-lg bg-background font-mono text-[11px] text-foreground/90 overflow-x-auto custom-scrollbar border border-border/60">
                            {JSON.stringify(rawPayload, null, 2)}
                          </pre>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

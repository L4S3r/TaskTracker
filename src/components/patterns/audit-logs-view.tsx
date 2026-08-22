"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { AuditLog } from "@/lib/tasks-store";
import { fetchWorkspaceAuditLogs, fetchGlobalAuditLogs } from "@/services/audit-service";
import { AuditLogTable } from "@/components/patterns/audit-log-table";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import {
  Activity,
  Shield,
  ShieldAlert,
  ShieldCheck,
  RefreshCw,
  Search,
  ChevronDown,
  Building2,
  Globe2,
  Table as TableIcon,
  List,
  Terminal,
  Copy,
  Check,
  AlertCircle,
} from "lucide-react";

export function AuditLogsView() {
  const { token, activeWorkspace, isAdmin, isSuperAdmin } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Scope Toggle: "workspace" vs "global" (Superadmin organization compliance console)
  const [scope, setScope] = useState<"workspace" | "global">("workspace");

  // View Display Mode: "table" vs "timeline"
  const [viewMode, setViewMode] = useState<"table" | "timeline">("table");

  // Filters
  const [eventTypeFilter, setEventTypeFilter] = useState<string>("all");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Inspect Modal State
  const [inspectingLog, setInspectingLog] = useState<AuditLog | null>(null);
  const [copiedLogJson, setCopiedLogJson] = useState(false);

  const fetchLogs = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    setError(null);

    const wsId = activeWorkspace?.id;
    try {
      if (scope === "workspace" && wsId) {
        const fetched = await fetchWorkspaceAuditLogs(token, wsId, {
          limit: 100,
          offset: 0,
          event_type: eventTypeFilter !== "all" ? eventTypeFilter : undefined,
          severity: severityFilter !== "all" ? severityFilter : undefined,
        });
        setLogs(fetched);
      } else {
        const fetched = await fetchGlobalAuditLogs(token, {
          limit: 100,
          offset: 0,
          event_type: eventTypeFilter !== "all" ? eventTypeFilter : undefined,
          severity: severityFilter !== "all" ? severityFilter : undefined,
          workspace_id: scope === "workspace" && wsId ? wsId : undefined,
        });
        setLogs(fetched);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load audit telemetry from security gateway.");
    } finally {
      setIsLoading(false);
    }
  }, [token, activeWorkspace?.id, scope, eventTypeFilter, severityFilter]);

  // Immediate cache invalidation on workspace switch: clear previous workspace's audit telemetry
  useEffect(() => {
    setLogs([]);
    setIsLoading(true);
    setError(null);
    fetchLogs();
  }, [activeWorkspace?.id, scope, fetchLogs]);

  const handleCopyJson = (payload: any) => {
    navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
    setCopiedLogJson(true);
    setTimeout(() => setCopiedLogJson(false), 2000);
  };

  const filteredLogs = logs.filter((log) => {
    const eventText = (log.event_type || log.event || log.action || "").toLowerCase();
    const actorText = (log.subject_id || log.actor_email || log.actor || log.actor_id || "").toLowerCase();
    const ipText = (log.ip_address || log.ip || "").toLowerCase();
    const wsText = (log.workspace_id || "").toLowerCase();
    const detailsText = log.details || log.metadata ? JSON.stringify(log.details || log.metadata).toLowerCase() : "";

    const matchesSearch =
      searchQuery === "" ||
      eventText.includes(searchQuery.toLowerCase()) ||
      actorText.includes(searchQuery.toLowerCase()) ||
      ipText.includes(searchQuery.toLowerCase()) ||
      wsText.includes(searchQuery.toLowerCase()) ||
      detailsText.includes(searchQuery.toLowerCase());

    const logSeverity = (log.severity || "INFO").toUpperCase();
    const matchesSeverity = severityFilter === "all" || logSeverity === severityFilter.toUpperCase();

    const matchesEventType =
      eventTypeFilter === "all" || eventText.includes(eventTypeFilter.toLowerCase());

    return matchesSearch && matchesSeverity && matchesEventType;
  });

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
              RFC 5424 Immutable Stream
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {scope === "workspace"
              ? `Workspace mutation logs, member lifecycle events, and access decisions for ${activeWorkspace?.name || "the current workspace"}.`
              : "Organization-wide compliance console across all tenant workspaces & global authentication events."}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Scope Toggle (For Superadmins) */}
          {isSuperAdmin && (
            <div className="flex items-center rounded-xl bg-secondary/80 p-1 border border-border/70 text-xs">
              <button
                type="button"
                onClick={() => setScope("workspace")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                  scope === "workspace"
                    ? "bg-card text-foreground shadow-xs border border-border/60"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Building2 className="h-3.5 w-3.5" />
                <span>Workspace Scope</span>
              </button>
              <button
                type="button"
                onClick={() => setScope("global")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all cursor-pointer ${
                  scope === "global"
                    ? "bg-card text-foreground shadow-xs border border-border/60"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Globe2 className="h-3.5 w-3.5 text-primary" />
                <span>Organization Console</span>
              </button>
            </div>
          )}

          {/* Refresh Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={fetchLogs}
            className="gap-1.5"
            title="Refresh telemetry"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive font-medium animate-in fade-in-50">
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
            placeholder="Search by subject, IP, event, metadata..."
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
                <option value="WARNING">🟡 WARN / WARNING</option>
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
                <option value="AUTH">Authentication Events</option>
              </select>
              <ChevronDown className="absolute right-2.5 top-4 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Audit Telemetry Table Component */}
      <Card className="border-border/80 shadow-sm bg-card overflow-hidden">
        <CardHeader className="p-4 sm:p-5 pb-3 border-b border-border/60 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              <span>
                {scope === "workspace" ? "Workspace Audit Events" : "Organization Compliance Stream"} ({filteredLogs.length})
              </span>
            </CardTitle>
            <CardDescription className="text-xs">
              {scope === "workspace"
                ? `Endpoint: GET /workspaces/${activeWorkspace?.id || "id"}/audit-logs`
                : "Endpoint: GET /audit/logs"}
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading && logs.length === 0 ? (
            <div className="flex min-h-[220px] items-center justify-center gap-2 text-xs text-muted-foreground">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <span>Streaming audit telemetry...</span>
            </div>
          ) : (
            <AuditLogTable logs={filteredLogs} onInspectJson={(log) => setInspectingLog(log)} />
          )}
        </CardContent>
      </Card>

      {/* Detailed JSON Inspector Modal */}
      <Modal
        isOpen={Boolean(inspectingLog)}
        onClose={() => setInspectingLog(null)}
        title="Audit Event Details"
        description="Structured JSON metadata recorded by the Auth N&Z security telemetry pipeline."
      >
        {inspectingLog && (
          <div className="space-y-4 pt-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-foreground">
                {inspectingLog.event_type || inspectingLog.event || "SECURITY_EVENT"}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleCopyJson(inspectingLog)}
                className="h-8 text-xs gap-1.5 px-2.5"
              >
                {copiedLogJson ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                <span>{copiedLogJson ? "Copied" : "Copy Full Event"}</span>
              </Button>
            </div>

            <pre className="p-3.5 rounded-xl bg-secondary/60 font-mono text-xs text-foreground overflow-x-auto custom-scrollbar border border-border/70 max-h-80 select-all">
              {JSON.stringify(inspectingLog, null, 2)}
            </pre>

            <div className="flex justify-end pt-2 border-t border-border/60">
              <Button size="sm" onClick={() => setInspectingLog(null)}>
                Close Inspector
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

/**
 * Audit Telemetry Service (src/services/audit-service.ts)
 * -------------------------------------------------------
 * Handles scoped workspace audit telemetry and global organization compliance streams.
 */

import { api } from "@/lib/api";
import { AuditLog } from "@/lib/tasks-store";

// For Workspace Admin / Team View:
export const fetchWorkspaceAuditLogs = async (
  token: string,
  workspaceId: string,
  params?: { limit?: number; offset?: number; severity?: string; event_type?: string }
): Promise<AuditLog[]> => {
  const res = await api.getWorkspaceAuditLogs(token, workspaceId, params);
  // Defensive key check: supports both 'audit_logs' and 'logs'
  return res.audit_logs || res.logs || [];
};

// For Global Superadmin Security Console:
export const fetchGlobalAuditLogs = async (
  token: string,
  params?: { limit?: number; offset?: number; severity?: string; event_type?: string; workspace_id?: string }
): Promise<AuditLog[]> => {
  const res = await api.getGlobalAuditLogs(token, params);
  // Defensive key check: supports both 'logs' and 'audit_logs'
  return res.logs || res.audit_logs || [];
};

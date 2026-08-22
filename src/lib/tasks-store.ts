/**
 * Task and Team Data Models (src/lib/tasks-store.ts)
 * --------------------------------------------------
 * Type definitions for persistent database tasks and team entities.
 * Zero mock data.
 */

export type TaskStatus = "todo" | "in_progress" | "review" | "done";
export type TaskPriority = "low" | "medium" | "high" | "urgent";
export type WorkspaceRole = "superadmin" | "admin" | "developer" | "editor" | "viewer";

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  description?: string;
  member_role?: WorkspaceRole;
  role?: WorkspaceRole;
  member_count?: number;
  created_at?: string;
}

export interface Task {
  id: string;
  workspace_id?: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignee_email?: string;
  assignee_name?: string;
  assignee_avatar?: string;
  assignees?: {
    email: string;
    name: string;
    avatar_url?: string;
  }[];
  created_by: string;
  createdAt?: string;
  created_at?: string;
  dueDate?: string;
  due_date?: string;
  tags: string[];
}

export interface TeamMember {
  id: string;
  email: string;
  name: string;
  username?: string;
  role: WorkspaceRole | "admin" | "editor" | "viewer" | "developer";
  department: string;
  avatar_url?: string;
  status: "active" | "invited" | "pending";
  invited_at?: string;
  invitedAt?: string;
  expires_at?: string;
  joined_at?: string;
}

export interface WorkspaceMember extends TeamMember {}

export interface AuditLog {
  id?: string;
  timestamp?: string;
  created_at?: string;
  event_type?: string;
  event?: string;
  severity?: "INFO" | "WARNING" | "CRITICAL" | "info" | "warning" | "critical";
  subject_id?: string | null;
  actor_email?: string | null;
  actor?: string | null;
  actor_id?: string | null;
  action?: string | null;
  resource?: string | null;
  ip_address?: string | null;
  ip?: string | null;
  user_agent?: string | null;
  workspace_id?: string | null;
  metadata?: Record<string, any> | string | null;
  details?: Record<string, any> | string | null;
}

export interface TrustedDevice {
  id: string;
  device_label?: string;
  label?: string;
  user_agent?: string;
  ip_address?: string;
  ip?: string;
  location?: string;
  is_current_device?: boolean;
  is_current?: boolean;
  created_at?: string;
  last_active?: string;
  last_used_at?: string;
  expires_at?: string;
}


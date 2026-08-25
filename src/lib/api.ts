/**
 * Auth N&Z REST API Client (src/lib/api.ts)
 * ----------------------------------------
 * Interfaces with the Auth N&Z Security Gateway & Multi-Tenant Backend.
 */

import { Task, Workspace, WorkspaceMember, AuditLog, TrustedDevice, InAppNotification } from "./tasks-store";

const API_BASE = process.env.NEXT_PUBLIC_AUTH_API_URL;

export interface UserProfile {
  id: string;
  name?: string;
  username: string;
  email: string;
  avatar_url?: string;
  roles: string[];
  metadata?: {
    department?: string;
    clearance?: number;
    avatar_url?: string;
    mfa_enabled?: boolean;
    name?: string;
    oauth_providers?: Record<string, string>;
  };
  is_active?: boolean | number;
}

export type User = UserProfile;

export interface AuthSuccessResponse {
  status: "SUCCESS";
  user_id: string;
  access_token: string;
  refresh_token: string;
  session_id?: string;
  mfa_skipped?: boolean;
  trusted_device?: TrustedDevice;
  user?: UserProfile;
  workspace?: Workspace;
  active_workspace?: Workspace;
  workspaces?: Workspace[];
}

export interface MFARequiredResponse {
  status: "MFA_REQUIRED";
  user_id: string;
  challenge_id: string;
}

export type LoginResponse = AuthSuccessResponse | MFARequiredResponse;

class ApiClient {
  private activeWorkspaceId: string | null = null;

  setActiveWorkspaceId(id: string | null | undefined) {
    this.activeWorkspaceId = id || null;
  }

  getActiveWorkspaceId(): string | null {
    return this.activeWorkspaceId;
  }

  private getCsrfToken(): string | null {
    if (typeof document === "undefined") return null;
    const match = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : null;
  }

  private getHeaders(token?: string | null, workspaceId?: string | null): HeadersInit {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    const wsId = workspaceId || this.activeWorkspaceId;
    if (wsId) {
      headers["X-Workspace-Id"] = wsId;
    }
    const csrf = this.getCsrfToken();
    if (csrf) {
      headers["X-CSRF-Token"] = csrf;
    }
    return headers;
  }

  private async handleResponse<T>(res: Response): Promise<T> {
    if (res.status === 401) {
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("auth:unauthorized"));
      }
    }

    if (!res.ok) {
      let detail = "An unexpected error occurred.";
      let rawErrorObj: any = null;
      try {
        const errorJson = await res.json();
        rawErrorObj = errorJson;
        const rawDetail = errorJson.detail || errorJson.reason || errorJson.message || errorJson.error || errorJson.code;
        if (typeof rawDetail === "string") {
          detail = rawDetail;
        } else if (Array.isArray(rawDetail)) {
          detail = rawDetail.map((d: any) => d.msg || d.message || JSON.stringify(d)).join(", ");
        } else if (typeof rawDetail === "object" && rawDetail !== null) {
          detail = JSON.stringify(rawDetail);
        } else {
          detail = res.statusText || detail;
        }
      } catch {
        detail = res.statusText || `HTTP error ${res.status}`;
      }

      if (res.status === 403) {
        const isMembershipError =
          detail.includes("WORKSPACE_MEMBERSHIP_REQUIRED") ||
          detail.toLowerCase().includes("workspace membership") ||
          rawErrorObj?.code === "WORKSPACE_MEMBERSHIP_REQUIRED" ||
          rawErrorObj?.error === "WORKSPACE_MEMBERSHIP_REQUIRED";

        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("auth:forbidden", {
              detail: isMembershipError
                ? "WORKSPACE_MEMBERSHIP_REQUIRED: You do not have access to that workspace."
                : (detail || "You do not have sufficient permissions to perform this action."),
            })
          );
        }
      }

      if (res.status === 404) {
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("auth:notfound", {
              detail: detail || "The requested resource was not found.",
            })
          );
        }
      }

      throw new Error(detail);
    }
    return res.json();
  }

  // =========================================================================
  // Authentication Endpoints
  // =========================================================================

  async login(identifier: string, password: string): Promise<LoginResponse> {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: this.getHeaders(),
      credentials: "include",
      body: JSON.stringify({ identifier, password }),
    });
    return this.handleResponse<LoginResponse>(res);
  }

  async register(username: string, email: string, password: string): Promise<{ status: string; user: UserProfile }> {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: "POST",
      headers: this.getHeaders(),
      credentials: "include",
      body: JSON.stringify({ username, email, password }),
    });
    return this.handleResponse<{ status: string; user: UserProfile }>(res);
  }

  async forgotPassword(email: string): Promise<{ status: string; message: string }> {
    const res = await fetch(`${API_BASE}/auth/forgot-password`, {
      method: "POST",
      headers: this.getHeaders(),
      credentials: "include",
      body: JSON.stringify({ email }),
    });
    return this.handleResponse<{ status: string; message: string }>(res);
  }

  async verifyResetToken(token: string): Promise<{ status: string; valid: boolean; username?: string; masked_email?: string }> {
    const res = await fetch(`${API_BASE}/auth/verify-reset-token?token=${encodeURIComponent(token)}`, {
      method: "GET",
      headers: this.getHeaders(),
      credentials: "include",
    });
    return this.handleResponse<{ status: string; valid: boolean; username?: string; masked_email?: string }>(res);
  }

  async resetPassword(token: string, newPassword: string): Promise<{ status: string; message: string }> {
    const res = await fetch(`${API_BASE}/auth/reset-password`, {
      method: "POST",
      headers: this.getHeaders(),
      credentials: "include",
      body: JSON.stringify({ token, new_password: newPassword }),
    });
    return this.handleResponse<{ status: string; message: string }>(res);
  }

  async completeMFA(
    userId: string,
    challengeId: string,
    code: string,
    rememberDevice: boolean = true
  ): Promise<AuthSuccessResponse> {
    const res = await fetch(`${API_BASE}/auth/mfa/complete`, {
      method: "POST",
      headers: this.getHeaders(),
      credentials: "include",
      body: JSON.stringify({
        user_id: userId,
        challenge_id: challengeId,
        code,
        remember_device: rememberDevice,
      }),
    });
    return this.handleResponse<AuthSuccessResponse>(res);
  }

  async setupMFA(token: string): Promise<{
    status: string;
    secret: string;
    provisioning_uri: string;
    backup_codes: string[];
  }> {
    const res = await fetch(`${API_BASE}/auth/mfa/setup`, {
      method: "POST",
      headers: this.getHeaders(token),
      credentials: "include",
    });
    return this.handleResponse(res);
  }

  async verifyMFASetup(token: string, code: string): Promise<{ status: string; message: string }> {
    const res = await fetch(`${API_BASE}/auth/mfa/verify-setup`, {
      method: "POST",
      headers: this.getHeaders(token),
      credentials: "include",
      body: JSON.stringify({ code }),
    });
    return this.handleResponse(res);
  }

  async disableMFA(token: string): Promise<{ status: string; message: string }> {
    const res = await fetch(`${API_BASE}/auth/mfa/disable`, {
      method: "POST",
      headers: this.getHeaders(token),
      credentials: "include",
    });
    return this.handleResponse(res);
  }

  // =========================================================================
  // Trusted Devices Endpoints
  // =========================================================================

  async getTrustedDevices(token: string): Promise<{ status: string; devices: TrustedDevice[] }> {
    const res = await fetch(`${API_BASE}/auth/trusted-devices`, {
      method: "GET",
      headers: this.getHeaders(token),
      credentials: "include",
    });
    const data = await this.handleResponse<any>(res);
    const devices = Array.isArray(data) ? data : data.devices || [];
    return { status: "SUCCESS", devices };
  }

  async revokeTrustedDevice(token: string, deviceId: string): Promise<{ status: string; message?: string }> {
    const res = await fetch(`${API_BASE}/auth/trusted-devices/${encodeURIComponent(deviceId)}`, {
      method: "DELETE",
      headers: this.getHeaders(token),
      credentials: "include",
    });
    return this.handleResponse(res);
  }

  async revokeAllTrustedDevices(token: string): Promise<{ status: string; message?: string }> {
    const res = await fetch(`${API_BASE}/auth/trusted-devices`, {
      method: "DELETE",
      headers: this.getHeaders(token),
      credentials: "include",
    });
    return this.handleResponse<{ status: string; message?: string }>(res);
  }

  async refreshTokens(refreshToken?: string | null): Promise<{
    status: "SUCCESS";
    access_token: string;
    refresh_token: string;
    user_id: string;
  }> {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: "POST",
      headers: this.getHeaders(),
      credentials: "include",
      body: JSON.stringify(refreshToken ? { refresh_token: refreshToken } : {}),
    });
    return this.handleResponse(res);
  }

  async logout(token?: string | null, sessionId?: string, logoutAll: boolean = false): Promise<{ status: string }> {
    const res = await fetch(`${API_BASE}/auth/logout`, {
      method: "POST",
      headers: this.getHeaders(token),
      credentials: "include",
      body: JSON.stringify({
        session_id: sessionId || null,
        logout_all_devices: logoutAll,
      }),
    });
    return this.handleResponse(res);
  }

  async getMe(token?: string | null): Promise<{
    status: string;
    user: UserProfile;
    claims?: any;
    active_workspace?: Workspace;
    workspaces?: Workspace[];
  }> {
    const res = await fetch(`${API_BASE}/auth/me`, {
      method: "GET",
      headers: this.getHeaders(token),
      credentials: "include",
    });
    const data = await this.handleResponse<any>(res);
    const user = data.user || data;
    return {
      status: "SUCCESS",
      user,
      claims: data.claims,
      active_workspace: data.active_workspace || data.workspace,
      workspaces: data.workspaces,
    };
  }

  // =========================================================================
  // Multi-Tenancy & Workspace Endpoints
  // =========================================================================

  async getWorkspaces(token?: string | null): Promise<{ status: string; count?: number; workspaces: Workspace[] }> {
    try {
      const res = await fetch(`${API_BASE}/workspaces`, {
        method: "GET",
        headers: this.getHeaders(token),
        credentials: "include",
      });
      const data = await this.handleResponse<any>(res);
      const workspaces = Array.isArray(data) ? data : data.workspaces || [];
      return { status: "SUCCESS", count: workspaces.length, workspaces };
    } catch (err: any) {
      // Fallback if workspaces endpoint returns object
      throw err;
    }
  }

  async createWorkspace(
    token: string | null | undefined,
    payload: { name: string; slug?: string; description?: string }
  ): Promise<{ status: string; workspace: Workspace; message?: string }> {
    const res = await fetch(`${API_BASE}/workspaces`, {
      method: "POST",
      headers: this.getHeaders(token),
      credentials: "include",
      body: JSON.stringify(payload),
    });
    return this.handleResponse(res);
  }

  async getWorkspace(token: string | null | undefined, workspaceId: string): Promise<{ status: string; workspace: Workspace }> {
    const res = await fetch(`${API_BASE}/workspaces/${encodeURIComponent(workspaceId)}`, {
      method: "GET",
      headers: this.getHeaders(token),
      credentials: "include",
    });
    return this.handleResponse(res);
  }

  async deleteWorkspace(token: string | null | undefined, workspaceId: string): Promise<{ status: string; message?: string }> {
    const res = await fetch(`${API_BASE}/workspaces/${encodeURIComponent(workspaceId)}`, {
      method: "DELETE",
      headers: this.getHeaders(token),
      credentials: "include",
    });
    return this.handleResponse(res);
  }

  async switchWorkspace(
    token: string | null | undefined,
    workspaceId: string
  ): Promise<{
    status: string;
    workspace?: Workspace;
    active_workspace?: Workspace;
    access_token?: string;
    refresh_token?: string;
    user?: UserProfile;
    message?: string;
  }> {
    const res = await fetch(`${API_BASE}/auth/workspaces/switch`, {
      method: "POST",
      headers: this.getHeaders(token),
      credentials: "include",
      body: JSON.stringify({ workspace_id: workspaceId }),
    });
    const data = await this.handleResponse<any>(res);
    this.setActiveWorkspaceId(workspaceId);
    return data;
  }

  async getWorkspaceAuditLogs(
    token: string,
    workspaceId: string,
    params?: { limit?: number; offset?: number; event_type?: string; severity?: string }
  ): Promise<{ status: string; count: number; logs: AuditLog[]; audit_logs: AuditLog[] }> {
    const searchParams = new URLSearchParams();
    if (params?.limit) searchParams.append("limit", params.limit.toString());
    if (params?.offset !== undefined) searchParams.append("offset", params.offset.toString());
    if (params?.event_type && params.event_type !== "all") searchParams.append("event_type", params.event_type);
    if (params?.severity && params.severity !== "all") searchParams.append("severity", params.severity);

    const query = searchParams.toString() ? `?${searchParams.toString()}` : "";
    const res = await fetch(`${API_BASE}/workspaces/${encodeURIComponent(workspaceId)}/audit-logs${query}`, {
      method: "GET",
      headers: this.getHeaders(token, workspaceId),
      credentials: "include",
    });
    const data = await this.handleResponse<any>(res);
    // Defensive key check: supports both 'audit_logs' and 'logs' or raw array
    const logs: AuditLog[] = Array.isArray(data) ? data : data.audit_logs || data.logs || [];
    return { status: "SUCCESS", count: logs.length, logs, audit_logs: logs };
  }

  // =========================================================================
  // Scoped Task Management Endpoints
  // =========================================================================

  async getTasks(
    token: string,
    filters?: { workspace_id?: string; status?: string; priority?: string; assignee_email?: string }
  ): Promise<{ status: string; count: number; tasks: Task[] }> {
    const params = new URLSearchParams();
    const wsId = filters?.workspace_id || this.activeWorkspaceId;
    if (wsId) params.append("workspace_id", wsId);
    if (filters?.status) params.append("status", filters.status);
    if (filters?.priority) params.append("priority", filters.priority);
    if (filters?.assignee_email) params.append("assignee_email", filters.assignee_email);

    const query = params.toString() ? `?${params.toString()}` : "";
    const res = await fetch(`${API_BASE}/tasks${query}`, {
      method: "GET",
      headers: this.getHeaders(token, wsId),
      credentials: "include",
    });
    const data = await this.handleResponse<any>(res);
    const tasks = Array.isArray(data) ? data : data.tasks || [];
    return { status: "SUCCESS", count: tasks.length, tasks };
  }

  async getTask(token: string | null | undefined, taskId: string): Promise<{ status: string; task: Task }> {
    const res = await fetch(`${API_BASE}/tasks/${encodeURIComponent(taskId)}`, {
      method: "GET",
      headers: this.getHeaders(token),
      credentials: "include",
    });
    return this.handleResponse<{ status: string; task: Task }>(res);
  }

  async createTask(
    token: string,
    taskData: {
      workspace_id?: string;
      title: string;
      description?: string;
      priority: string;
      assignees?: any[];
      assignee_email?: string;
      assignee_name?: string;
      due_date?: string;
      tags?: string[];
      status?: string;
    }
  ): Promise<{ status: string; task: Task }> {
    const wsId = taskData.workspace_id || this.activeWorkspaceId;
    const body = {
      ...taskData,
      workspace_id: wsId,
    };
    const res = await fetch(`${API_BASE}/tasks`, {
      method: "POST",
      headers: this.getHeaders(token, wsId),
      credentials: "include",
      body: JSON.stringify(body),
    });
    return this.handleResponse(res);
  }

  async updateTask(token: string, taskId: string, updates: Partial<Task>): Promise<{ status: string; task: Task }> {
    const res = await fetch(`${API_BASE}/tasks/${encodeURIComponent(taskId)}`, {
      method: "PATCH",
      headers: this.getHeaders(token),
      credentials: "include",
      body: JSON.stringify(updates),
    });
    return this.handleResponse(res);
  }

  async deleteTask(token: string, taskId: string): Promise<{ status: string; deleted_task_id: string }> {
    const res = await fetch(`${API_BASE}/tasks/${encodeURIComponent(taskId)}`, {
      method: "DELETE",
      headers: this.getHeaders(token),
      credentials: "include",
    });
    return this.handleResponse(res);
  }

  // =========================================================================
  // Workspace Team Management Endpoints
  // =========================================================================

  async getWorkspaceMembers(
    token: string,
    workspaceId: string,
    statusFilter?: string
  ): Promise<{ status: string; count: number; members: WorkspaceMember[] }> {
    const params = new URLSearchParams();
    if (statusFilter && statusFilter !== "all") params.append("status_filter", statusFilter);
    const query = params.toString() ? `?${params.toString()}` : "";

    const res = await fetch(`${API_BASE}/workspaces/${encodeURIComponent(workspaceId)}/members${query}`, {
      method: "GET",
      headers: this.getHeaders(token, workspaceId),
      credentials: "include",
    });
    const data = await this.handleResponse<any>(res);
    const members = Array.isArray(data) ? data : data.members || [];
    return { status: "SUCCESS", count: members.length, members };
  }

  async inviteWorkspaceMember(
    token: string,
    workspaceId: string,
    payload: {
      email: string;
      name?: string;
      role: string;
      department?: string;
    }
  ): Promise<{ status: string; message: string; member: any; invite_token?: string; invite_url?: string }> {
    const res = await fetch(`${API_BASE}/workspaces/${encodeURIComponent(workspaceId)}/invite`, {
      method: "POST",
      headers: this.getHeaders(token, workspaceId),
      credentials: "include",
      body: JSON.stringify(payload),
    });
    return this.handleResponse(res);
  }

  async updateWorkspaceMemberRole(
    token: string,
    workspaceId: string,
    memberIdOrEmail: string,
    role: string
  ): Promise<{ status: string; message?: string; member: any }> {
    const res = await fetch(
      `${API_BASE}/workspaces/${encodeURIComponent(workspaceId)}/members/${encodeURIComponent(memberIdOrEmail)}/role`,
      {
        method: "PATCH",
        headers: this.getHeaders(token, workspaceId),
        credentials: "include",
        body: JSON.stringify({ role }),
      }
    );
    return this.handleResponse(res);
  }

  async removeWorkspaceMember(
    token: string,
    workspaceId: string,
    memberIdOrEmail: string
  ): Promise<{ status: string; removed_member?: string; message?: string }> {
    const res = await fetch(
      `${API_BASE}/workspaces/${encodeURIComponent(workspaceId)}/members/${encodeURIComponent(memberIdOrEmail)}`,
      {
        method: "DELETE",
        headers: this.getHeaders(token, workspaceId),
        credentials: "include",
      }
    );
    return this.handleResponse(res);
  }

  // =========================================================================
  // Workspace Invite Verification & Acceptance
  // =========================================================================

  async verifyWorkspaceInvite(token: string): Promise<{
    status: string;
    email: string;
    name: string;
    role: string;
    department: string;
    invited_by: string;
    workspace_name?: string;
    workspace_id?: string;
    workspace_slug?: string;
    expires_at?: string;
  }> {
    try {
      const res = await fetch(`${API_BASE}/workspaces/invite/verify?token=${encodeURIComponent(token)}`, {
        credentials: "include",
      });
      return await this.handleResponse(res);
    } catch {
      // Fallback to legacy endpoint if backend mounts at /team/invite/verify
      const res = await fetch(`${API_BASE}/team/invite/verify?token=${encodeURIComponent(token)}`, {
        credentials: "include",
      });
      return await this.handleResponse(res);
    }
  }

  async acceptWorkspaceInvite(payload: {
    token: string;
    password: string;
    name?: string;
  }): Promise<AuthSuccessResponse> {
    try {
      const res = await fetch(`${API_BASE}/workspaces/invite/accept`, {
        method: "POST",
        headers: this.getHeaders(),
        credentials: "include",
        body: JSON.stringify(payload),
      });
      return await this.handleResponse<AuthSuccessResponse>(res);
    } catch {
      // Fallback to legacy endpoint if backend mounts at /team/invite/accept
      const res = await fetch(`${API_BASE}/team/invite/accept`, {
        method: "POST",
        headers: this.getHeaders(),
        credentials: "include",
        body: JSON.stringify(payload),
      });
      return await this.handleResponse<AuthSuccessResponse>(res);
    }
  }

  // =========================================================================
  // Legacy & Fallback Aliases
  // =========================================================================

  async getTeamMembers(token: string): Promise<{ status: string; count: number; members: any[] }> {
    if (this.activeWorkspaceId) {
      try {
        return await this.getWorkspaceMembers(token, this.activeWorkspaceId);
      } catch {
        // Fallback
      }
    }
    const res = await fetch(`${API_BASE}/team/members`, {
      method: "GET",
      headers: this.getHeaders(token),
      credentials: "include",
    });
    return this.handleResponse(res);
  }

  async inviteTeamMember(
    token: string,
    payload: {
      email: string;
      name?: string;
      role?: string;
      department?: string;
    }
  ): Promise<{ status: string; message: string; member: any; invite_token?: string; invite_url?: string }> {
    if (this.activeWorkspaceId) {
      try {
        return await this.inviteWorkspaceMember(token, this.activeWorkspaceId, {
          email: payload.email,
          name: payload.name,
          role: payload.role || "viewer",
          department: payload.department,
        });
      } catch {
        // Fallback
      }
    }
    const res = await fetch(`${API_BASE}/team/invite`, {
      method: "POST",
      headers: this.getHeaders(token),
      credentials: "include",
      body: JSON.stringify(payload),
    });
    return this.handleResponse(res);
  }

  async verifyInvite(token: string) {
    return this.verifyWorkspaceInvite(token);
  }

  async acceptInvite(payload: { token: string; password: string; name?: string }) {
    return this.acceptWorkspaceInvite(payload);
  }

  async removeTeamMember(token: string, memberEmail: string) {
    if (this.activeWorkspaceId) {
      try {
        return await this.removeWorkspaceMember(token, this.activeWorkspaceId, memberEmail);
      } catch {
        // Fallback
      }
    }
    const res = await fetch(`${API_BASE}/team/members/${encodeURIComponent(memberEmail)}`, {
      method: "DELETE",
      headers: this.getHeaders(token),
      credentials: "include",
    });
    return this.handleResponse(res);
  }

  async getAuditLogs(
    token: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<{
    status: string;
    count: number;
    logs: AuditLog[];
    audit_logs: AuditLog[];
  }> {
    if (this.activeWorkspaceId) {
      try {
        return await this.getWorkspaceAuditLogs(token, this.activeWorkspaceId, { limit, offset });
      } catch {
        // Fallback to global endpoint
      }
    }
    return this.getGlobalAuditLogs(token, { limit, offset });
  }

  async getGlobalAuditLogs(
    token: string,
    params?: { limit?: number; offset?: number; severity?: string; event_type?: string; workspace_id?: string }
  ): Promise<{ status: string; count: number; logs: AuditLog[]; audit_logs: AuditLog[] }> {
    const searchParams = new URLSearchParams();
    if (params?.limit) searchParams.append("limit", params.limit.toString());
    if (params?.offset !== undefined) searchParams.append("offset", params.offset.toString());
    if (params?.event_type && params.event_type !== "all") searchParams.append("event_type", params.event_type);
    if (params?.severity && params.severity !== "all") searchParams.append("severity", params.severity);
    if (params?.workspace_id && params.workspace_id !== "all") searchParams.append("workspace_id", params.workspace_id);

    const query = searchParams.toString() ? `?${searchParams.toString()}` : "";
    const res = await fetch(`${API_BASE}/audit/logs${query}`, {
      method: "GET",
      headers: this.getHeaders(token),
      credentials: "include",
    });
    const data = await this.handleResponse<any>(res);
    // Defensive key check: supports both 'logs' and 'audit_logs' or raw array
    const logs: AuditLog[] = Array.isArray(data) ? data : data.logs || data.audit_logs || [];
    return { status: "SUCCESS", count: logs.length, logs, audit_logs: logs };
  }

  // =========================================================================
  // Social Login & OAuth2
  // =========================================================================

  async getOAuthProviders(): Promise<{ status: string; available_providers: string[] }> {
    try {
      const res = await fetch(`${API_BASE}/auth/oauth/providers`, {
        credentials: "include",
      });
      return this.handleResponse(res);
    } catch {
      return { status: "SUCCESS", available_providers: ["google", "github"] };
    }
  }

  async getOAuthLoginUrl(provider: string, redirectUri?: string): Promise<{
    status: string;
    authorization_url: string;
    state: string;
    code_verifier: string;
  }> {
    const url = redirectUri
      ? `${API_BASE}/auth/oauth/${provider}/login?redirect_uri=${encodeURIComponent(redirectUri)}`
      : `${API_BASE}/auth/oauth/${provider}/login`;
    const res = await fetch(url, {
      credentials: "include",
    });
    return this.handleResponse(res);
  }

  async exchangeOAuthCode(
    provider: string,
    code: string,
    codeVerifier?: string,
    redirectUri?: string
  ): Promise<AuthSuccessResponse> {
    const res = await fetch(`${API_BASE}/auth/oauth/${provider}/exchange`, {
      method: "POST",
      headers: this.getHeaders(),
      credentials: "include",
      body: JSON.stringify({
        code,
        code_verifier: codeVerifier,
        redirect_uri: redirectUri,
      }),
    });
    return this.handleResponse<AuthSuccessResponse>(res);
  }

  // ===========================================================================
  // In-App Notifications (Phase 4.2)
  // ===========================================================================
  async getNotifications(
    token?: string,
    params?: { limit?: number; offset?: number }
  ): Promise<{ status: string; unread_count: number; notifications: InAppNotification[] }> {
    const query = new URLSearchParams();
    if (params?.limit) query.set("limit", String(params.limit));
    if (params?.offset) query.set("offset", String(params.offset));
    const qs = query.toString() ? `?${query.toString()}` : "";
    const res = await fetch(`${API_BASE}/notifications${qs}`, {
      headers: this.getHeaders(token),
      credentials: "include",
    });
    return this.handleResponse<{ status: string; unread_count: number; notifications: InAppNotification[] }>(res);
  }

  async markNotificationRead(
    token: string | undefined,
    notificationId: string
  ): Promise<{ status: string; id: string; is_read: number }> {
    const res = await fetch(`${API_BASE}/notifications/${encodeURIComponent(notificationId)}/read`, {
      method: "POST",
      headers: this.getHeaders(token),
      credentials: "include",
    });
    return this.handleResponse<{ status: string; id: string; is_read: number }>(res);
  }

  async markAllNotificationsRead(
    token?: string
  ): Promise<{ status: string; message: string }> {
    const res = await fetch(`${API_BASE}/notifications/read-all`, {
      method: "POST",
      headers: this.getHeaders(token),
      credentials: "include",
    });
    return this.handleResponse<{ status: string; message: string }>(res);
  }
}

export const api = new ApiClient();

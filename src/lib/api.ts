/**
 * Auth N&Z REST API Client (src/lib/api.ts)
 * ----------------------------------------
 * Interfaces with the Auth N&Z Security Gateway backend.
 */

const API_BASE =
  process.env.NEXT_PUBLIC_AUTH_API_URL;


export interface UserProfile {
  id: string;
  username: string;
  email: string;
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

export interface AuthSuccessResponse {
  status: "SUCCESS";
  user_id: string;
  access_token: string;
  refresh_token: string;
  session_id?: string;
  user?: UserProfile;
}

export interface MFARequiredResponse {
  status: "MFA_REQUIRED";
  user_id: string;
  challenge_id: string;
}

export type LoginResponse = AuthSuccessResponse | MFARequiredResponse;

class ApiClient {
  private getHeaders(token?: string | null): HeadersInit {
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
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
      try {
        const errorJson = await res.json();
        const rawDetail = errorJson.detail || errorJson.reason || errorJson.message;
        if (typeof rawDetail === "string") {
          detail = rawDetail;
        } else if (Array.isArray(rawDetail)) {
          detail = rawDetail.map((d: any) => d.msg || JSON.stringify(d)).join(", ");
        } else if (typeof rawDetail === "object" && rawDetail !== null) {
          detail = JSON.stringify(rawDetail);
        } else {
          detail = res.statusText || detail;
        }
      } catch {
        detail = res.statusText || `HTTP error ${res.status}`;
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
      body: JSON.stringify({ identifier, password }),
    });
    return this.handleResponse<LoginResponse>(res);
  }

  async register(username: string, email: string, password: string): Promise<{ status: string; user: UserProfile }> {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify({ username, email, password }),
    });
    return this.handleResponse<{ status: string; user: UserProfile }>(res);
  }

  async completeMFA(userId: string, challengeId: string, code: string): Promise<AuthSuccessResponse> {
    const res = await fetch(`${API_BASE}/auth/mfa/complete`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify({ user_id: userId, challenge_id: challengeId, code }),
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
    });
    return this.handleResponse(res);
  }

  async verifyMFASetup(token: string, code: string): Promise<{ status: string; message: string }> {
    const res = await fetch(`${API_BASE}/auth/mfa/verify-setup`, {
      method: "POST",
      headers: this.getHeaders(token),
      body: JSON.stringify({ code }),
    });
    return this.handleResponse(res);
  }

  async disableMFA(token: string): Promise<{ status: string; message: string }> {
    const res = await fetch(`${API_BASE}/auth/mfa/disable`, {
      method: "POST",
      headers: this.getHeaders(token),
    });
    return this.handleResponse(res);
  }



  async refreshTokens(refreshToken: string): Promise<{
    status: "SUCCESS";
    access_token: string;
    refresh_token: string;
    user_id: string;
  }> {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    return this.handleResponse(res);
  }

  async logout(token: string, sessionId?: string, logoutAll: boolean = false): Promise<{ status: string }> {
    const res = await fetch(`${API_BASE}/auth/logout`, {
      method: "POST",
      headers: this.getHeaders(token),
      body: JSON.stringify({
        session_id: sessionId || null,
        logout_all_devices: logoutAll,
      }),
    });
    return this.handleResponse(res);
  }

  async getMe(token: string): Promise<{ status: string; user: UserProfile; claims: any }> {
    const res = await fetch(`${API_BASE}/auth/me`, {
      method: "GET",
      headers: this.getHeaders(token),
    });
    return this.handleResponse(res);
  }

  // =========================================================================
  // Administration Endpoints
  // =========================================================================

  async adminCreateUser(
    token: string,
    payload: {
      username: string;
      email: string;
      password: string;
      roles: string[];
      department: string;
      clearance: number;
    }
  ): Promise<{ status: string; user: UserProfile }> {
    const res = await fetch(`${API_BASE}/admin/users`, {
      method: "POST",
      headers: this.getHeaders(token),
      body: JSON.stringify(payload),
    });
    return this.handleResponse(res);
  }

  async getAuditLogs(token: string, limit: number = 50, offset: number = 0): Promise<{
    status: string;
    count: number;
    logs: any[];
  }> {
    const res = await fetch(`${API_BASE}/audit/logs?limit=${limit}&offset=${offset}`, {
      method: "GET",
      headers: this.getHeaders(token),
    });
    return this.handleResponse(res);
  }

  // =========================================================================
  // Social Login & OAuth2
  // =========================================================================

  async getOAuthProviders(): Promise<{ status: string; available_providers: string[] }> {
    try {
      const res = await fetch(`${API_BASE}/auth/oauth/providers`);
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
    const res = await fetch(url);
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
      body: JSON.stringify({
        code,
        code_verifier: codeVerifier,
        redirect_uri: redirectUri,
      }),
    });
    return this.handleResponse<AuthSuccessResponse>(res);
  }

  // =========================================================================
  // Task Management Endpoints
  // =========================================================================

  async getTasks(
    token: string,
    filters?: { status?: string; priority?: string; assignee_email?: string }
  ): Promise<{ status: string; count: number; tasks: any[] }> {
    const params = new URLSearchParams();
    if (filters?.status) params.append("status", filters.status);
    if (filters?.priority) params.append("priority", filters.priority);
    if (filters?.assignee_email) params.append("assignee_email", filters.assignee_email);

    const query = params.toString() ? `?${params.toString()}` : "";
    const res = await fetch(`${API_BASE}/tasks${query}`, {
      method: "GET",
      headers: this.getHeaders(token),
    });
    return this.handleResponse(res);
  }

  async createTask(token: string, taskData: any): Promise<{ status: string; task: any }> {
    const res = await fetch(`${API_BASE}/tasks`, {
      method: "POST",
      headers: this.getHeaders(token),
      body: JSON.stringify(taskData),
    });
    return this.handleResponse(res);
  }

  async updateTask(token: string, taskId: string, updates: any): Promise<{ status: string; task: any }> {
    const res = await fetch(`${API_BASE}/tasks/${taskId}`, {
      method: "PATCH",
      headers: this.getHeaders(token),
      body: JSON.stringify(updates),
    });
    return this.handleResponse(res);
  }

  async deleteTask(token: string, taskId: string): Promise<{ status: string; deleted_task_id: string }> {
    const res = await fetch(`${API_BASE}/tasks/${taskId}`, {
      method: "DELETE",
      headers: this.getHeaders(token),
    });
    return this.handleResponse(res);
  }

  // =========================================================================
  // Team Management Endpoints
  // =========================================================================

  async getTeamMembers(token: string): Promise<{ status: string; count: number; members: any[] }> {
    const res = await fetch(`${API_BASE}/team/members`, {
      method: "GET",
      headers: this.getHeaders(token),
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
      provision_password?: string;
    }
  ): Promise<{ status: string; message: string; member: any }> {
    const res = await fetch(`${API_BASE}/team/invite`, {
      method: "POST",
      headers: this.getHeaders(token),
      body: JSON.stringify(payload),
    });
    return this.handleResponse(res);
  }

  async verifyInvite(token: string): Promise<{
    status: string;
    email: string;
    name: string;
    role: string;
    department: string;
    invited_by: string;
    expires_at?: string;
  }> {
    const res = await fetch(`${API_BASE}/team/invite/verify?token=${encodeURIComponent(token)}`);
    return this.handleResponse(res);
  }

  async acceptInvite(payload: {
    token: string;
    password: string;
    name?: string;
  }): Promise<AuthSuccessResponse> {
    const res = await fetch(`${API_BASE}/team/invite/accept`, {
      method: "POST",
      headers: this.getHeaders(),
      body: JSON.stringify(payload),
    });
    return this.handleResponse<AuthSuccessResponse>(res);
  }

  async removeTeamMember(token: string, memberEmail: string): Promise<{ status: string; removed_email: string }> {
    const res = await fetch(`${API_BASE}/team/members/${encodeURIComponent(memberEmail)}`, {
      method: "DELETE",
      headers: this.getHeaders(token),
    });
    return this.handleResponse(res);
  }
}

export const api = new ApiClient();



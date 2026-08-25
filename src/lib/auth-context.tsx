"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { api, AuthSuccessResponse, UserProfile } from "./api";
import { Workspace, WorkspaceRole } from "./tasks-store";

function parseRoles(rawRoles: any): string[] {
  if (Array.isArray(rawRoles)) return rawRoles;
  if (typeof rawRoles === "string") {
    try {
      const parsed = JSON.parse(rawRoles);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      return rawRoles
        .split(",")
        .map((r) => r.trim())
        .filter(Boolean);
    }
  }
  return [];
}

function parseMetadata(rawMetadata: any): Record<string, any> {
  if (typeof rawMetadata === "object" && rawMetadata !== null && !Array.isArray(rawMetadata)) {
    return rawMetadata;
  }
  if (typeof rawMetadata === "string") {
    try {
      const parsed = JSON.parse(rawMetadata);
      if (typeof parsed === "object" && parsed !== null) return parsed;
    } catch {
      return {};
    }
  }
  return {};
}

export function normalizeUser(rawUser: any): UserProfile | null {
  if (!rawUser) return null;
  const metadata = parseMetadata(rawUser.metadata);
  const avatarUrl =
    rawUser.avatar_url ||
    rawUser.picture ||
    rawUser.avatar ||
    rawUser.photo_url ||
    rawUser.image ||
    metadata.avatar_url ||
    metadata.picture ||
    metadata.avatar ||
    metadata.photo_url ||
    metadata.image ||
    undefined;

  const name =
    rawUser.name ||
    metadata.name ||
    metadata.full_name ||
    rawUser.full_name ||
    undefined;

  return {
    ...rawUser,
    name,
    avatar_url: avatarUrl,
    roles: parseRoles(rawUser.roles),
    metadata: {
      ...metadata,
      avatar_url: avatarUrl,
      name,
    },
  };
}

function isTokenExpired(jwtToken: string, bufferSeconds: number = 30): boolean {
  try {
    const parts = jwtToken.split(".");
    if (parts.length !== 3) return true;
    const payload = JSON.parse(atob(parts[1]));
    if (!payload.exp) return false;
    const expMs = payload.exp * 1000;
    return Date.now() + bufferSeconds * 1000 >= expMs;
  } catch {
    return false;
  }
}

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  accessToken: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  activeWorkspace: Workspace | null;
  workspaces: Workspace[];
  userRole: WorkspaceRole;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isDeveloper: boolean;
  isEditor: boolean;
  isViewer: boolean;
  permissionAlert: string | null;
  clearPermissionAlert: () => void;
  setPermissionAlert: (alert: string | null) => void;
  switchWorkspace: (workspaceId: string) => Promise<void>;
  createWorkspace: (data: { name: string; slug?: string; description?: string }) => Promise<Workspace>;
  deleteWorkspace: (workspaceId: string) => Promise<void>;
  fetchWorkspaces: () => Promise<Workspace[]>;
  setActiveWorkspace: (ws: Workspace | null) => void;
  loginSuccess: (authData: AuthSuccessResponse) => void;
  logout: (logoutAll?: boolean) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [activeWorkspace, setActiveWorkspaceState] = useState<Workspace | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [permissionAlert, setPermissionAlert] = useState<string | null>(null);

  const isRefreshingRef = useRef<boolean>(false);

  const setActiveWorkspace = useCallback((ws: Workspace | null) => {
    setActiveWorkspaceState(ws);
    api.setActiveWorkspaceId(ws?.id || null);
    if (typeof window !== "undefined") {
      if (ws) {
        localStorage.setItem("active_workspace", JSON.stringify(ws));
      } else {
        localStorage.removeItem("active_workspace");
      }
    }
  }, []);

  const clearAuthSession = useCallback((redirectToLogin: boolean = true) => {
    setToken(null);
    setRefreshToken(null);
    setUser(null);
    setActiveWorkspace(null);
    setWorkspaces([]);
    setPermissionAlert(null);
    api.setActiveWorkspaceId(null);
    if (typeof window !== "undefined") {
      localStorage.removeItem("auth_token");
      localStorage.removeItem("refresh_token");
      localStorage.removeItem("auth_user");
      localStorage.removeItem("active_workspace");
      localStorage.removeItem("workspaces_list");
    }
    if (redirectToLogin && pathname && !["/login", "/register", "/forgot-password", "/reset-password", "/invite/accept", "/auth/callback"].includes(pathname)) {
      router.push("/login?expired=true");
    }
  }, [pathname, router, setActiveWorkspace]);

  const fetchWorkspaces = useCallback(async (): Promise<Workspace[]> => {
    try {
      const res = await api.getWorkspaces();
      const list = res.workspaces || [];
      setWorkspaces(list);

      // If no active workspace or active workspace no longer in list, set to first
      setActiveWorkspaceState((prev) => {
        if (!prev && list.length > 0) {
          const first = list[0];
          api.setActiveWorkspaceId(first.id);
          if (typeof window !== "undefined") {
            localStorage.setItem("active_workspace", JSON.stringify(first));
          }
          return first;
        }
        if (prev) {
          const updated = list.find((w) => w.id === prev.id);
          if (updated) {
            api.setActiveWorkspaceId(updated.id);
            if (typeof window !== "undefined") {
              localStorage.setItem("active_workspace", JSON.stringify(updated));
            }
            return updated;
          }
        }
        return prev;
      });

      return list;
    } catch {
      return [];
    }
  }, []);

  const switchWorkspace = useCallback(async (workspaceId: string) => {
    setPermissionAlert(null);
    try {
      const res = await api.switchWorkspace(token, workspaceId);
      if (res.access_token) {
        setToken(res.access_token);
        if (typeof window !== "undefined") {
          localStorage.setItem("auth_token", res.access_token);
        }
      }
      if (res.user) {
        const cleanUser = normalizeUser(res.user);
        setUser(cleanUser);
      }

      const activeWs = res.active_workspace || (res as any).data?.active_workspace || res.workspace || (res as any).data?.workspace;
      const target =
        activeWs ||
        workspaces.find((w) => w.id === workspaceId) ||
        ({ id: workspaceId, name: "Workspace", slug: workspaceId, role: "viewer" } as Workspace);

      setActiveWorkspace(target);
      await fetchWorkspaces();
    } catch (err: any) {
      // If switch endpoint failed, fallback to local switch if in member list
      const fallbackTarget = workspaces.find((w) => w.id === workspaceId);
      if (fallbackTarget) {
        setActiveWorkspace(fallbackTarget);
      }
      throw err;
    }
  }, [token, workspaces, setActiveWorkspace, fetchWorkspaces]);

  const createWorkspace = useCallback(async (data: { name: string; slug?: string; description?: string }): Promise<Workspace> => {
    const res = await api.createWorkspace(null, data);
    const newWs = res.workspace;

    await fetchWorkspaces();
    if (newWs && newWs.id) {
      await switchWorkspace(newWs.id);
    }
    return newWs;
  }, [fetchWorkspaces, switchWorkspace]);

  const deleteWorkspace = useCallback(async (workspaceId: string) => {
    await api.deleteWorkspace(token, workspaceId);
    setWorkspaces((prev) => prev.filter((w) => w.id !== workspaceId));
    if (activeWorkspace?.id === workspaceId) {
      const remaining = workspaces.filter((w) => w.id !== workspaceId);
      if (remaining.length > 0) {
        await switchWorkspace(remaining[0].id);
      } else {
        setActiveWorkspace(null);
      }
    } else {
      await fetchWorkspaces();
    }
  }, [token, activeWorkspace?.id, workspaces, switchWorkspace, setActiveWorkspace, fetchWorkspaces]);

  const attemptTokenRefresh = useCallback(async (): Promise<boolean> => {
    if (isRefreshingRef.current) return false;
    isRefreshingRef.current = true;
    try {
      const refreshed = await api.refreshTokens();
      if (refreshed.access_token) {
        setToken(refreshed.access_token);
      }
      if (refreshed.refresh_token) {
        setRefreshToken(refreshed.refresh_token);
      }

      try {
        const me = await api.getMe();
        if (me.user) {
          const cleanUser = normalizeUser(me.user);
          setUser(cleanUser);
        }
        if (me.active_workspace) {
          setActiveWorkspace(me.active_workspace);
        }
        if (me.workspaces) {
          setWorkspaces(me.workspaces);
        }
      } catch {
        // Non-fatal
      }

      return true;
    } catch {
      clearAuthSession(true);
      return false;
    } finally {
      isRefreshingRef.current = false;
    }
  }, [clearAuthSession, setActiveWorkspace]);

  // Initial load: Hydrate authentication session via httpOnly cookie
  useEffect(() => {
    let isMounted = true;

    async function initSession() {
      try {
        const me = await api.getMe();
        if (!isMounted) return;

        if (me.user) {
          const cleanUser = normalizeUser(me.user);
          setUser(cleanUser);
          setToken("cookie_session");

          // Restore or select active workspace
          const savedWorkspace = typeof window !== "undefined" ? localStorage.getItem("active_workspace") : null;
          if (savedWorkspace) {
            try {
              const parsedWs = JSON.parse(savedWorkspace);
              setActiveWorkspaceState(parsedWs);
              api.setActiveWorkspaceId(parsedWs.id);
            } catch {}
          } else if (me.active_workspace) {
            setActiveWorkspace(me.active_workspace);
          }

          if (me.workspaces && me.workspaces.length > 0) {
            setWorkspaces(me.workspaces);
          } else {
            api.getWorkspaces().then((res) => {
              if (isMounted && res.workspaces) {
                setWorkspaces(res.workspaces);
              }
            }).catch(() => {});
          }
        }
      } catch {
        // Attempt silent refresh via refresh_token cookie
        try {
          const refreshed = await api.refreshTokens();
          if (refreshed.access_token && isMounted) {
            setToken(refreshed.access_token);
            const me = await api.getMe();
            if (me.user && isMounted) {
              const cleanUser = normalizeUser(me.user);
              setUser(cleanUser);
              if (me.active_workspace) setActiveWorkspace(me.active_workspace);
              if (me.workspaces) setWorkspaces(me.workspaces);
            }
          }
        } catch {
          if (isMounted) {
            clearAuthSession(false);
          }
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    initSession();

    return () => {
      isMounted = false;
    };
  }, [clearAuthSession, setActiveWorkspace]);

  const workspacesRef = useRef<Workspace[]>([]);
  workspacesRef.current = workspaces;

  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;

  const routerRef = useRef(router);
  routerRef.current = router;

  const setActiveWorkspaceRef = useRef(setActiveWorkspace);
  setActiveWorkspaceRef.current = setActiveWorkspace;

  // Listen for unauthorized 401 & forbidden 403 events across the app
  useEffect(() => {
    const handleUnauthorized = () => {
      attemptTokenRefresh();
    };

    const handleForbidden = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      const detail = customEvent.detail || "You do not have sufficient permissions to perform this action.";
      
      const isMembershipError =
        detail.includes("WORKSPACE_MEMBERSHIP_REQUIRED") ||
        detail.toLowerCase().includes("workspace membership") ||
        detail.toLowerCase().includes("access to that workspace");

      if (isMembershipError) {
        const msg = "You do not have access to that workspace.";
        setPermissionAlert(msg);
        
        // Auto-redirect to default workspace or dashboard
        const currentWorkspaces = workspacesRef.current;
        if (currentWorkspaces.length > 0) {
          const defaultWs = currentWorkspaces[0];
          setActiveWorkspaceRef.current(defaultWs);
          api.setActiveWorkspaceId(defaultWs.id);
        }
        
        if (typeof window !== "undefined") {
          // Clean unauthorized workspace query params
          if (window.location.search) {
            const url = new URL(window.location.href);
            if (url.searchParams.has("workspace") || url.searchParams.has("workspace_id")) {
              url.searchParams.delete("workspace");
              url.searchParams.delete("workspace_id");
              window.history.replaceState({}, "", url.pathname + (url.search || ""));
            }
          }
          if (pathnameRef.current !== "/") {
            routerRef.current.push("/");
          }
        }
      } else {
        setPermissionAlert(detail);
      }

      setTimeout(() => {
        setPermissionAlert((curr) => (curr ? null : curr));
      }, 7000);
    };

    window.addEventListener("auth:unauthorized", handleUnauthorized);
    window.addEventListener("auth:forbidden", handleForbidden);
    return () => {
      window.removeEventListener("auth:unauthorized", handleUnauthorized);
      window.removeEventListener("auth:forbidden", handleForbidden);
    };
  }, [attemptTokenRefresh]);

  // Periodic silent token refresh (every 10 minutes) & upon tab visibility return
  useEffect(() => {
    const triggerRefresh = () => {
      if (user) {
        attemptTokenRefresh();
      }
    };

    // Access token TTL is 15m; silent refresh at 10m keeps session seamlessly uninterrupted
    const interval = setInterval(triggerRefresh, 10 * 60 * 1000);
    const handleVisibility = () => {
      if (document.visibilityState === "visible" && user) {
        triggerRefresh();
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [user, attemptTokenRefresh]);

  const loginSuccess = (authData: AuthSuccessResponse) => {
    setToken(authData.access_token || "cookie_session");
    if (authData.refresh_token) {
      setRefreshToken(authData.refresh_token);
    }

    if (authData.user) {
      const cleanUser = normalizeUser(authData.user);
      setUser(cleanUser);
    }

    if (authData.active_workspace || authData.workspace) {
      const ws = authData.active_workspace || authData.workspace;
      if (ws) setActiveWorkspace(ws);
    }

    if (authData.workspaces && Array.isArray(authData.workspaces)) {
      setWorkspaces(authData.workspaces);
      if (!authData.active_workspace && !authData.workspace && authData.workspaces.length > 0) {
        setActiveWorkspace(authData.workspaces[0]);
      }
    } else {
      api.getWorkspaces().then((res) => {
        if (res.workspaces && res.workspaces.length > 0) {
          setWorkspaces(res.workspaces);
          if (!activeWorkspace) {
            setActiveWorkspace(res.workspaces[0]);
          }
        }
      }).catch(() => {});
    }

    // Always synchronize latest user profile data (including OAuth avatar) from GET /auth/me
    api.getMe().then((me) => {
      if (me.user) {
        const freshUser = normalizeUser(me.user);
        setUser(freshUser);
      }
      if (me.active_workspace) {
        setActiveWorkspace(me.active_workspace);
      }
      if (me.workspaces && me.workspaces.length > 0) {
        setWorkspaces(me.workspaces);
      }
    }).catch(() => {});
  };

  const logout = async (logoutAll: boolean = false) => {
    try {
      await api.logout(token, undefined, logoutAll);
    } catch {}
    clearAuthSession(true);
  };

  const refreshProfile = async () => {
    try {
      const res = await api.getMe();
      const cleanUser = normalizeUser(res.user);
      setUser(cleanUser);
      if (res.active_workspace) {
        setActiveWorkspace(res.active_workspace);
      }
      if (res.workspaces) {
        setWorkspaces(res.workspaces);
      }
      await fetchWorkspaces();
    } catch {
      await attemptTokenRefresh();
    }
  };

  // Role resolution: superadmin > admin > developer > editor > viewer
  const globalRoles = user?.roles ? parseRoles(user.roles).map((r) => r.toLowerCase()) : [];
  const workspaceRole = (
    activeWorkspace?.member_role ||
    activeWorkspace?.role ||
    ""
  ).toLowerCase();

  const isSuperAdmin = globalRoles.includes("superadmin");
  const isGlobalAdmin = globalRoles.includes("admin");

  const effectiveRole: WorkspaceRole = isSuperAdmin
    ? "superadmin"
    : workspaceRole === "superadmin"
    ? "superadmin"
    : isGlobalAdmin || workspaceRole === "admin"
    ? "admin"
    : workspaceRole === "developer" || workspaceRole === "dev"
    ? "developer"
    : workspaceRole === "editor"
    ? "editor"
    : "viewer";

  const isAdmin = effectiveRole === "admin" || effectiveRole === "superadmin";
  const isDeveloper = effectiveRole === "developer" || isAdmin;
  const isEditor = effectiveRole === "editor" || isDeveloper;
  const isViewer = effectiveRole === "viewer";

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        accessToken: token,
        refreshToken,
        isLoading,
        isAuthenticated: Boolean(token && user),
        activeWorkspace,
        workspaces,
        userRole: effectiveRole,
        isAdmin,
        isSuperAdmin,
        isDeveloper,
        isEditor,
        isViewer,
        permissionAlert,
        clearPermissionAlert: () => setPermissionAlert(null),
        setPermissionAlert,
        switchWorkspace,
        createWorkspace,
        deleteWorkspace,
        fetchWorkspaces,
        setActiveWorkspace,
        loginSuccess,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export const useAuthStore = useAuth;

"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { api, AuthSuccessResponse, UserProfile } from "./api";

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
  return {
    ...rawUser,
    roles: parseRoles(rawUser.roles),
    metadata: parseMetadata(rawUser.metadata),
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
  refreshToken: string | null;
  isLoading: boolean;
  isAdmin: boolean;
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
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const isRefreshingRef = useRef<boolean>(false);

  const clearAuthSession = useCallback((redirectToLogin: boolean = true) => {
    setToken(null);
    setRefreshToken(null);
    setUser(null);
    if (typeof window !== "undefined") {
      localStorage.removeItem("auth_token");
      localStorage.removeItem("refresh_token");
      localStorage.removeItem("auth_user");
    }
    if (redirectToLogin && pathname && !["/login", "/register", "/invite/accept", "/auth/callback"].includes(pathname)) {
      router.push("/login?expired=true");
    }
  }, [pathname, router]);

  const attemptTokenRefresh = useCallback(async (): Promise<boolean> => {
    if (isRefreshingRef.current) return false;
    const storedRefresh = refreshToken || (typeof window !== "undefined" ? localStorage.getItem("refresh_token") : null);
    if (!storedRefresh) {
      clearAuthSession(true);
      return false;
    }

    isRefreshingRef.current = true;
    try {
      const refreshed = await api.refreshTokens(storedRefresh);
      setToken(refreshed.access_token);
      setRefreshToken(refreshed.refresh_token);
      if (typeof window !== "undefined") {
        localStorage.setItem("auth_token", refreshed.access_token);
        localStorage.setItem("refresh_token", refreshed.refresh_token);
      }

      // Refresh profile data in background
      try {
        const me = await api.getMe(refreshed.access_token);
        const cleanUser = normalizeUser(me.user);
        setUser(cleanUser);
        if (typeof window !== "undefined") {
          localStorage.setItem("auth_user", JSON.stringify(cleanUser));
        }
      } catch {
        // Non-fatal if profile fetch fails
      }

      return true;
    } catch {
      clearAuthSession(true);
      return false;
    } finally {
      isRefreshingRef.current = false;
    }
  }, [refreshToken, clearAuthSession]);

  // Restore session from localStorage on initial load
  useEffect(() => {
    const savedToken = localStorage.getItem("auth_token");
    const savedRefresh = localStorage.getItem("refresh_token");
    const savedUser = localStorage.getItem("auth_user");

    if (savedToken && savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        setToken(savedToken);
        setRefreshToken(savedRefresh);
        setUser(normalizeUser(parsed));

        // If access token is already expired on startup, trigger background refresh
        if (isTokenExpired(savedToken)) {
          attemptTokenRefresh();
        }
      } catch {
        clearAuthSession(false);
      }
    }
    setIsLoading(false);
  }, [attemptTokenRefresh, clearAuthSession]);

  // Listen for unauthorized 401 events across the app
  useEffect(() => {
    const handleUnauthorized = () => {
      attemptTokenRefresh();
    };

    window.addEventListener("auth:unauthorized", handleUnauthorized);
    return () => {
      window.removeEventListener("auth:unauthorized", handleUnauthorized);
    };
  }, [attemptTokenRefresh]);

  // Proactive token expiration heartbeat (every 45 seconds) & visibility change
  useEffect(() => {
    const checkExpiry = () => {
      if (token && isTokenExpired(token, 60)) {
        attemptTokenRefresh();
      }
    };

    const interval = setInterval(checkExpiry, 45000);
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        checkExpiry();
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [token, attemptTokenRefresh]);

  const loginSuccess = (authData: AuthSuccessResponse) => {
    setToken(authData.access_token);
    setRefreshToken(authData.refresh_token);
    localStorage.setItem("auth_token", authData.access_token);
    localStorage.setItem("refresh_token", authData.refresh_token);

    if (authData.user) {
      const cleanUser = normalizeUser(authData.user);
      setUser(cleanUser);
      localStorage.setItem("auth_user", JSON.stringify(cleanUser));
    }
  };

  const logout = async (logoutAll: boolean = false) => {
    if (token) {
      try {
        await api.logout(token, undefined, logoutAll);
      } catch {
        // Continue local logout even if server is unreachable
      }
    }
    clearAuthSession(true);
  };

  const refreshProfile = async () => {
    if (!token) return;
    try {
      const res = await api.getMe(token);
      const cleanUser = normalizeUser(res.user);
      setUser(cleanUser);
      localStorage.setItem("auth_user", JSON.stringify(cleanUser));
    } catch {
      await attemptTokenRefresh();
    }
  };

  const rolesArray = user?.roles ? parseRoles(user.roles) : [];
  const isAdmin = rolesArray.includes("admin");

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        refreshToken,
        isLoading,
        isAdmin,
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

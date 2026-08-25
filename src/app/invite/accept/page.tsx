"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckSquare, AlertCircle, ArrowRight, Eye, EyeOff, Building2, Sparkles } from "lucide-react";
import Link from "next/link";

function getPasswordStrength(pass: string): { score: number; label: string; color: string } {
  if (!pass) return { score: 0, label: "None", color: "bg-muted" };
  let score = 0;
  if (pass.length >= 8) score += 1;
  if (pass.length >= 12) score += 1;
  if (/[A-Z]/.test(pass) && /[a-z]/.test(pass)) score += 1;
  if (/[0-9]/.test(pass)) score += 1;
  if (/[^A-Za-z0-9]/.test(pass)) score += 1;

  if (score <= 1) return { score: 1, label: "Weak", color: "bg-destructive" };
  if (score === 2) return { score: 2, label: "Fair", color: "bg-amber-500" };
  if (score === 3 || score === 4) return { score: 3, label: "Strong", color: "bg-blue-500" };
  return { score: 4, label: "Very Strong", color: "bg-emerald-500" };
}

function AcceptInviteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const { user, loginSuccess, switchWorkspace, fetchWorkspaces } = useAuth();

  const [inviteData, setInviteData] = useState<{
    email: string;
    name?: string;
    role: string;
    department?: string;
    invited_by: string;
    workspace_name?: string;
    workspace_id?: string;
    expires_at?: string;
  } | null>(null);

  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isLoadingVerify, setIsLoadingVerify] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError("No invitation token found in the URL. Please check your invitation email or request a fresh invite.");
      setIsLoadingVerify(false);
      return;
    }

    api
      .verifyWorkspaceInvite(token)
      .then((res) => {
        setInviteData(res);
        if (res.name) setName(res.name);
      })
      .catch((err) => {
        setError(err.message || "This invitation link is invalid or has expired. Please request a fresh invite from your workspace administrator.");
      })
      .finally(() => {
        setIsLoadingVerify(false);
      });
  }, [token]);

  const strength = getPasswordStrength(password);

  const handleAcceptAsCurrentUser = async () => {
    if (!token) return;
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await api.acceptWorkspaceInvite({
        token,
        password: "",
        name: user?.name || undefined,
      });

      await loginSuccess(res);
      if (res.active_workspace?.id) {
        await switchWorkspace(res.active_workspace.id);
      } else {
        await fetchWorkspaces();
      }
      router.replace("/");
    } catch (err: any) {
      setError(err.message || "Failed to accept invitation. Please try again or log in.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !inviteData) return;

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await api.acceptWorkspaceInvite({
        token,
        password,
        name: name.trim() || inviteData.name || undefined,
      });

      await loginSuccess(res);
      router.replace("/");
    } catch (err: any) {
      setError(err.message || "Failed to accept invitation. Please try again or request a new invite.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingVerify) {
    return (
      <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center p-4 sm:p-6">
        <Card className="w-full max-w-md shadow-2xl border-border/80 bg-card p-6 space-y-4 animate-in fade-in-50 duration-200">
          <div className="flex flex-col items-center space-y-2 pb-2">
            <Skeleton className="h-12 w-12 rounded-2xl" />
            <Skeleton className="h-6 w-48 rounded-lg" />
            <Skeleton className="h-4 w-64 rounded-md" />
          </div>
          <div className="space-y-2 p-3.5 rounded-xl border border-border/70 bg-secondary/20">
            <Skeleton className="h-4 w-full rounded" />
            <Skeleton className="h-4 w-3/4 rounded" />
            <Skeleton className="h-4 w-4/5 rounded" />
          </div>
          <div className="space-y-3 pt-2">
            <Skeleton className="h-10 w-full rounded-xl" />
            <Skeleton className="h-10 w-full rounded-xl" />
          </div>
        </Card>
      </div>
    );
  }

  if (error && !inviteData) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center p-4">
        <Card className="w-full max-w-md p-6 text-center border-border/80 shadow-2xl bg-card">
          <CardHeader className="space-y-3 pb-2">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 mx-auto border border-amber-500/20 shadow-xs">
              <AlertCircle className="h-7 w-7" />
            </div>
            <CardTitle className="text-lg font-bold text-foreground">Invitation Expired or Consumed</CardTitle>
            <CardDescription className="text-xs leading-relaxed space-y-1">
              <span className="block font-medium text-foreground/90">
                This invitation link has expired or has already been consumed.
              </span>
              <span className="block text-muted-foreground">
                If you already completed setup, please log in.
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-3">
            <Link href="/login" className="block w-full">
              <Button size="lg" className="w-full gap-2 shadow-md">
                <span>Go to Login</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const workspaceName = inviteData?.workspace_name || "TaskTracker Workspace";
  const inviter = inviteData?.invited_by || "Administrator";
  const roleName = (inviteData?.role || "viewer").toUpperCase();
  const departmentName = inviteData?.department || "General";

  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center p-4 sm:p-6">
      <Card className="w-full max-w-md shadow-2xl border-border/80 bg-card">
        <CardHeader className="space-y-2 text-center pb-5">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-blue-700 text-primary-foreground shadow-md mb-1">
            <CheckSquare className="h-6 w-6" />
          </div>
          <CardTitle className="text-xl font-bold tracking-tight">Accept Workspace Invitation</CardTitle>
          <CardDescription className="text-xs leading-relaxed">
            You&apos;ve been invited by <strong className="text-foreground">{inviter}</strong> to join{" "}
            <strong className="text-primary">{workspaceName}</strong> as a <strong className="text-foreground">{roleName}</strong> in{" "}
            <strong className="text-foreground">{departmentName}</strong>.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Clearance Badge Summary */}
          <div className="rounded-xl border border-border/70 bg-secondary/30 p-3.5 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground font-medium">Invited Email:</span>
              <span className="font-semibold text-foreground">{inviteData?.email}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground font-medium">Workspace:</span>
              <span className="font-semibold text-primary flex items-center gap-1">
                <Building2 className="h-3.5 w-3.5" />
                <span>{workspaceName}</span>
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground font-medium">Department:</span>
              <span className="font-semibold text-foreground">{departmentName}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground font-medium">Clearance Role:</span>
              <Badge variant={(inviteData?.role || "viewer").toLowerCase() as any}>
                {roleName}
              </Badge>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive font-medium">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* If already authenticated, allow seamless 1-click acceptance */}
          {user ? (
            <div className="space-y-3 pt-2">
              <div className="p-3 rounded-xl border border-primary/20 bg-primary/5 flex items-center gap-3">
                <Avatar name={user.name || user.username} src={user.avatar_url} size="md" />
                <div className="text-left">
                  <p className="font-semibold text-xs text-foreground leading-tight">
                    {user.name || user.username}
                  </p>
                  <p className="text-[11px] text-muted-foreground">{user.email}</p>
                </div>
              </div>

              <Button
                type="button"
                size="lg"
                isLoading={isSubmitting}
                onClick={handleAcceptAsCurrentUser}
                className="w-full gap-2 shadow-md"
              >
                <Sparkles className="h-4 w-4" />
                <span>Join Workspace as {user.name || user.username}</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3.5">
              <Input
                label="Full Name (Optional)"
                type="text"
                placeholder="e.g. Jane Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />

              <div className="space-y-1.5">
                <Input
                  label="Create Password"
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="Minimum 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  endIcon={
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-muted-foreground hover:text-foreground cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center p-2 rounded-lg"
                      title={showPassword ? "Hide password" : "Show password"}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  }
                />

                {/* Password Strength Indicator */}
                {password && (
                  <div className="space-y-1 pt-1">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-muted-foreground">Strength:</span>
                      <span className="font-semibold text-foreground">{strength.label}</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${strength.color}`}
                        style={{ width: `${(strength.score / 4) * 100}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              <Input
                label="Confirm Password"
                type={showConfirmPassword ? "text" : "password"}
                required
                placeholder="Repeat your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                endIcon={
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="text-muted-foreground hover:text-foreground cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center p-2 rounded-lg"
                    title={showConfirmPassword ? "Hide password" : "Show password"}
                    aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                }
              />

              <Button type="submit" size="lg" isLoading={isSubmitting} className="w-full gap-2 mt-2">
                <Sparkles className="h-4 w-4" />
                <span>Accept Invitation & Enter Workspace</span>
                <ArrowRight className="h-4 w-4" />
              </Button>
            </form>
          )}
        </CardContent>

        <CardFooter className="flex justify-center border-t border-border/70 p-4 text-[11px] text-muted-foreground">
          Protected by Auth N&amp;Z Identity &amp; Access Management Gateway
        </CardFooter>
      </Card>
    </div>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[70vh] items-center justify-center p-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      }
    >
      <AcceptInviteContent />
    </Suspense>
  );
}

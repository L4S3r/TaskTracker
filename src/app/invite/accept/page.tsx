"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckSquare, Shield, AlertCircle, CheckCircle2, ArrowRight } from "lucide-react";
import Link from "next/link";

function AcceptInviteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const { loginSuccess } = useAuth();

  const [inviteData, setInviteData] = useState<{
    email: string;
    name: string;
    role: string;
    department: string;
    invited_by: string;
  } | null>(null);

  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [isLoadingVerify, setIsLoadingVerify] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError("No invitation token found in the URL. Please check your invitation email.");
      setIsLoadingVerify(false);
      return;
    }

    api
      .verifyInvite(token)
      .then((res) => {
        setInviteData(res);
        setName(res.name || "");
      })
      .catch((err) => {
        setError(err.message || "Invalid or expired invitation link.");
      })
      .finally(() => {
        setIsLoadingVerify(false);
      });
  }, [token]);

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
      const res = await api.acceptInvite({
        token,
        password,
        name: name.trim() || inviteData.name,
      });

      loginSuccess(res);
      router.replace("/");
    } catch (err: any) {
      setError(err.message || "Failed to accept invitation. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingVerify) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-xs text-muted-foreground">Verifying invitation credentials...</p>
        </div>
      </div>
    );
  }

  if (error && !inviteData) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center p-4">
        <Card className="w-full max-w-md p-6 text-center border-border shadow-xl bg-card">
          <CardHeader className="space-y-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-destructive/10 text-destructive mx-auto">
              <AlertCircle className="h-6 w-6" />
            </div>
            <CardTitle className="text-lg font-bold text-destructive">Invitation Error</CardTitle>
            <CardDescription className="text-xs">{error}</CardDescription>
            <Link href="/login" className="block pt-2">
              <Button variant="outline" className="w-full">
                Return to Sign In
              </Button>
            </Link>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center p-4 sm:p-6">
      <Card className="w-full max-w-md shadow-xl border-border bg-card">
        <CardHeader className="space-y-2 text-center pb-5">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-md mb-1">
            <CheckSquare className="h-6 w-6" />
          </div>
          <CardTitle className="text-xl font-bold tracking-tight">Join the Workspace</CardTitle>
          <CardDescription>
            <strong>{inviteData?.invited_by}</strong> invited you to collaborate on TaskTracker.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Clearance Badge Summary */}
          <div className="rounded-xl border border-border bg-secondary/30 p-3.5 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground font-medium">Invited Email:</span>
              <span className="font-semibold text-foreground">{inviteData?.email}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground font-medium">Department:</span>
              <span className="font-semibold text-foreground">{inviteData?.department}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground font-medium">Clearance Role:</span>
              <Badge variant={inviteData?.role as any}>
                {inviteData?.role.toUpperCase()}
              </Badge>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive font-medium">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <Input
              label="Full Name"
              type="text"
              required
              placeholder="e.g. Jane Doe"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />

            <Input
              label="Create Password"
              type="password"
              required
              placeholder="Minimum 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            <Input
              label="Confirm Password"
              type="password"
              required
              placeholder="Repeat your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />

            <Button type="submit" isLoading={isSubmitting} className="w-full gap-2 mt-2">
              <span>Accept Invitation & Enter Board</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </form>
        </CardContent>

        <CardFooter className="flex justify-center border-t border-border p-4 text-[11px] text-muted-foreground">
          Protected by Auth N&Z Identity & Access Management Gateway
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

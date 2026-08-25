"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { useRateLimitCountdown } from "@/lib/use-rate-limit";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { KeyRound, Lock, ArrowLeft, CheckCircle2, AlertCircle, Eye, EyeOff, Loader2, Clock } from "lucide-react";

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const { countdown, isRateLimited, handleRateLimitError } = useRateLimitCountdown();

  const [isVerifying, setIsVerifying] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [maskedEmail, setMaskedEmail] = useState<string | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setIsVerifying(false);
      setTokenValid(false);
      setVerifyError("No password reset token provided. Please use the link sent to your email.");
      return;
    }

    api
      .verifyResetToken(token)
      .then((res) => {
        if (res.valid) {
          setTokenValid(true);
          setMaskedEmail(res.masked_email || null);
        } else {
          setTokenValid(false);
          setVerifyError("This reset link is invalid, expired, or has already been used.");
        }
      })
      .catch((err: any) => {
        setTokenValid(false);
        setVerifyError(err.message || "Invalid or expired password reset link.");
      })
      .finally(() => {
        setIsVerifying(false);
      });
  }, [token]);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || isRateLimited) return;

    if (newPassword.length < 8) {
      setFormError("Password must be at least 8 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setFormError("Passwords do not match. Please verify and try again.");
      return;
    }

    setIsLoading(true);
    setFormError(null);

    try {
      await api.resetPassword(token, newPassword);
      setSuccess(true);
      setTimeout(() => {
        router.push("/login?reset=success");
      }, 3000);
    } catch (err: any) {
      if (handleRateLimitError(err)) {
        const secs = err.retry_after_seconds || err?.response?.data?.retry_after_seconds || 60;
        setFormError(`Rate limit exceeded for password reset. Please wait ${secs}s.`);
      } else {
        setFormError(err.message || "Failed to reset password. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md shadow-2xl border-border/80 bg-card">
      <CardHeader className="space-y-2 text-center pb-5">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-blue-700 text-primary-foreground shadow-md mb-2">
          <KeyRound className="h-6 w-6" />
        </div>
        <CardTitle className="text-xl font-bold tracking-tight">Set New Password</CardTitle>
        <CardDescription>
          {maskedEmail
            ? `Choose a secure new password for ${maskedEmail}.`
            : "Enter and confirm your new account password."}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {isVerifying ? (
          <div className="flex flex-col items-center justify-center py-8 space-y-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-xs text-muted-foreground font-medium">Verifying reset token security...</p>
          </div>
        ) : !tokenValid ? (
          <div className="space-y-4 text-center py-3">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <AlertCircle className="h-7 w-7" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-sm font-semibold text-foreground">Invalid Reset Link</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {verifyError || "This password reset token is expired or invalid."}
              </p>
            </div>
            <div className="pt-2">
              <Link href="/forgot-password">
                <Button variant="outline" className="w-full text-xs">
                  Request a New Reset Link
                </Button>
              </Link>
            </div>
          </div>
        ) : success ? (
          <div className="space-y-4 text-center py-3">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-sm font-semibold text-foreground">Password Reset Successful!</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Your password has been updated. Redirecting you to sign in...
              </p>
            </div>
            <div className="pt-2">
              <Link href="/login">
                <Button className="w-full text-xs">
                  Continue to Sign In
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleReset} className="space-y-3.5">
            {isRateLimited && countdown !== null && (
              <div className="flex items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs text-amber-700 dark:text-amber-300 font-medium animate-pulse">
                <Clock className="h-5 w-5 shrink-0 text-amber-500" />
                <div className="flex-1">
                  <p className="font-semibold text-foreground">Rate Limit Active</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Please wait <strong className="text-amber-600 dark:text-amber-400 font-bold">{countdown}s</strong> before attempting to update your password.
                  </p>
                </div>
              </div>
            )}

            {formError && !isRateLimited && (
              <div className="flex items-start gap-2.5 rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive font-medium">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <Input
              label="New Password"
              type={showPassword ? "text" : "password"}
              required
              placeholder="Minimum 8 characters"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              disabled={isRateLimited}
              startIcon={<Lock className="h-4 w-4" />}
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

            <Input
              label="Confirm New Password"
              type={showPassword ? "text" : "password"}
              required
              placeholder="Re-enter your new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={isRateLimited}
              startIcon={<Lock className="h-4 w-4" />}
            />

            <Button
              type="submit"
              className="w-full mt-2"
              size="lg"
              isLoading={isLoading}
              disabled={isRateLimited}
            >
              {isRateLimited ? `Try again in ${countdown}s` : "Update Password & Sign In"}
            </Button>
          </form>
        )}
      </CardContent>

      <CardFooter className="flex justify-center border-t border-border/70 pt-4 pb-4">
        <Link
          href="/login"
          className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors p-1"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Sign In
        </Link>
      </CardFooter>
    </Card>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center p-4 sm:p-6">
      <Suspense
        fallback={
          <Card className="w-full max-w-md shadow-2xl border-border/80 bg-card p-8 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
            <p className="text-xs text-muted-foreground mt-3">Loading security verification...</p>
          </Card>
        }
      >
        <ResetPasswordContent />
      </Suspense>
    </div>
  );
}

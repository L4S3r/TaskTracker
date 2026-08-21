"use client";

import React, { useEffect, useState, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api, LoginResponse } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { AlertCircle, KeyRound, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

function OAuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { loginSuccess } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [mfaChallenge, setMfaChallenge] = useState<{ userId: string; challengeId: string } | null>(null);
  const [mfaCode, setMfaCode] = useState("");
  const [isVerifyingMFA, setIsVerifyingMFA] = useState(false);
  const isExecuting = useRef<boolean>(false);

  useEffect(() => {
    if (isExecuting.current) return;

    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const provider = localStorage.getItem("oauth_provider") || "google";
    const codeVerifier = localStorage.getItem("oauth_code_verifier") || undefined;
    const savedState = localStorage.getItem("oauth_state");

    if (!code) {
      setError("No authorization code received from OAuth identity provider.");
      return;
    }

    if (savedState && state && savedState !== state) {
      setError("OAuth state parameter mismatch (potential CSRF attempt).");
      return;
    }

    isExecuting.current = true;
    const redirectUri = `${window.location.origin}/auth/callback`;

    api
      .exchangeOAuthCode(provider, code, codeVerifier, redirectUri)
      .then((res: LoginResponse) => {
        if (res.status === "SUCCESS") {
          loginSuccess(res);
          localStorage.removeItem("oauth_provider");
          localStorage.removeItem("oauth_code_verifier");
          localStorage.removeItem("oauth_state");
          router.replace("/");
        } else if (res.status === "MFA_REQUIRED") {
          setMfaChallenge({
            userId: res.user_id,
            challengeId: res.challenge_id,
          });
        }
      })
      .catch((err) => {
        setError(err.message || "Failed to exchange social authentication code.");
      });
  }, [searchParams, router, loginSuccess]);

  const handleCompleteOAuthMFA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mfaChallenge || !mfaCode.trim()) return;

    setIsVerifyingMFA(true);
    setError(null);

    try {
      const res = await api.completeMFA(mfaChallenge.userId, mfaChallenge.challengeId, mfaCode.trim());
      if (res.status === "SUCCESS") {
        loginSuccess(res);
        localStorage.removeItem("oauth_provider");
        localStorage.removeItem("oauth_code_verifier");
        localStorage.removeItem("oauth_state");
        router.replace("/");
      }
    } catch (err: any) {
      setError(err.message || "Invalid MFA code. Check Google Authenticator or use a backup code.");
    } finally {
      setIsVerifyingMFA(false);
    }
  };

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-4">
      <Card className="w-full max-w-md p-6 text-center border-border shadow-xl">
        <CardHeader className="space-y-3">
          {mfaChallenge ? (
            <>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground mx-auto">
                <KeyRound className="h-6 w-6" />
              </div>
              <CardTitle className="text-lg font-bold">Two-Factor Authentication Required</CardTitle>
              <CardDescription className="text-xs">
                Your account is protected by 2FA. Enter the 6-digit code from Google Authenticator to complete social sign-in.
              </CardDescription>

              <form onSubmit={handleCompleteOAuthMFA} className="space-y-4 pt-2 text-left">
                {error && (
                  <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive font-medium">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <div className="space-y-1.5">
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={10}
                    autoFocus
                    required
                    placeholder="e.g. 123456"
                    value={mfaCode}
                    onChange={(e) => setMfaCode(e.target.value.replace(/\s+/g, ""))}
                    className="flex h-11 w-full rounded-lg border border-input bg-card px-3 text-center text-lg font-mono font-bold tracking-widest text-foreground placeholder:text-muted-foreground placeholder:tracking-normal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>

                <Button type="submit" isLoading={isVerifyingMFA} className="w-full gap-2">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Verify & Sign In</span>
                </Button>
              </form>
            </>
          ) : error ? (
            <>
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-destructive/10 text-destructive mx-auto">
                <AlertCircle className="h-6 w-6" />
              </div>
              <CardTitle className="text-lg font-bold text-destructive">Authentication Error</CardTitle>
              <CardDescription className="text-xs">{error}</CardDescription>
              <Link href="/login" className="block pt-2">
                <Button variant="outline" className="w-full">
                  Return to Sign In
                </Button>
              </Link>
            </>
          ) : (
            <>
              <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
              <CardTitle className="text-base font-bold">Completing Social Authentication...</CardTitle>
              <CardDescription className="text-xs">
                Exchanging PKCE cryptographic proof and verifying identity with Auth N&Z.
              </CardDescription>
            </>
          )}
        </CardHeader>
      </Card>
    </div>
  );
}

export default function OAuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center p-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      }
    >
      <OAuthCallbackContent />
    </Suspense>
  );
}

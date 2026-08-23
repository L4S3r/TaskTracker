"use client";

import React, { useEffect, useState, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api, LoginResponse } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { AlertCircle, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { MfaModal } from "@/components/patterns/mfa-modal";

function OAuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { loginSuccess } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [mfaChallenge, setMfaChallenge] = useState<{ userId: string; challengeId: string } | null>(null);
  const [isVerifyingMFA, setIsVerifyingMFA] = useState(false);
  const [mfaError, setMfaError] = useState<string | null>(null);
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

    if (!savedState || savedState !== state) {
      setError("OAuth state parameter mismatch (potential CSRF attempt).");
      return;
    }

    isExecuting.current = true;
    const redirectUri = `${window.location.origin}/auth/callback`;

    api
      .exchangeOAuthCode(provider, code, codeVerifier, redirectUri)
      .then((res: LoginResponse) => {
        if (res.status === "SUCCESS") {
          if (res.mfa_skipped) {
            console.log(
              "MFA bypassed via trusted device:",
              res.trusted_device?.device_label || res.trusted_device?.label
            );
          }
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

  const handleCompleteOAuthMFA = async (code: string, rememberDevice: boolean = true) => {
    if (!mfaChallenge) return;

    setIsVerifyingMFA(true);
    setMfaError(null);

    try {
      const res = await api.completeMFA(mfaChallenge.userId, mfaChallenge.challengeId, code, rememberDevice);
      if (res.status === "SUCCESS") {
        loginSuccess(res);
        localStorage.removeItem("oauth_provider");
        localStorage.removeItem("oauth_code_verifier");
        localStorage.removeItem("oauth_state");
        router.replace("/");
      }
    } catch (err: any) {
      setMfaError(err.message || "Invalid verification code. Check Google Authenticator or use a backup code.");
    } finally {
      setIsVerifyingMFA(false);
    }
  };

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-4">
      {mfaChallenge ? (
        <MfaModal
          isOpen={true}
          onClose={() => {
            setMfaChallenge(null);
            router.push("/login");
          }}
          onVerify={handleCompleteOAuthMFA}
          isLoading={isVerifyingMFA}
          error={mfaError}
          title="Two-Factor Social Verification"
          description="Complete sign-in by entering the 6-digit code from your authenticator app."
        />
      ) : (
        <Card className="w-full max-w-md p-6 text-center border-border/80 shadow-2xl bg-card">
          <CardHeader className="space-y-3">
            {error ? (
              <>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive mx-auto">
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
              <div className="flex flex-col items-center gap-3 py-6">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                <p className="text-sm font-semibold text-foreground">Completing authentication handshake...</p>
                <p className="text-xs text-muted-foreground">Exchanging cryptographic tokens with identity gateway.</p>
              </div>
            )}
          </CardHeader>
        </Card>
      )}
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

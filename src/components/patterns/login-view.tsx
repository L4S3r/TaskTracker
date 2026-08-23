"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { MfaModal } from "@/components/patterns/mfa-modal";
import { CheckSquare, Shield, KeyRound, AlertCircle, Eye, EyeOff } from "lucide-react";

export function LoginView() {
  const router = useRouter();
  const { loginSuccess } = useAuth();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // MFA Challenge State
  const [mfaChallenge, setMfaChallenge] = useState<{ userId: string; challengeId: string } | null>(null);
  const [mfaLoading, setMfaLoading] = useState(false);
  const [mfaError, setMfaError] = useState<string | null>(null);

  // Available OAuth providers
  const [providers, setProviders] = useState<string[]>([]);

  useEffect(() => {
    api.getOAuthProviders().then((res) => {
      if (res.available_providers) {
        setProviders(res.available_providers);
      }
    });
  }, []);

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const res = await api.login(identifier, password);
      if (res.status === "SUCCESS") {
        if (res.mfa_skipped) {
          console.log(
            "MFA bypassed via trusted device:",
            res.trusted_device?.device_label || res.trusted_device?.label
          );
        }
        loginSuccess(res);
        router.push("/");
      } else if (res.status === "MFA_REQUIRED") {
        setMfaChallenge({
          userId: res.user_id,
          challengeId: res.challenge_id,
        });
      }
    } catch (err: any) {
      setError(err.message || "Failed to sign in. Please verify your credentials.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompleteMFA = async (code: string, rememberDevice: boolean = true) => {
    if (!mfaChallenge) return;

    setMfaLoading(true);
    setMfaError(null);

    try {
      const res = await api.completeMFA(mfaChallenge.userId, mfaChallenge.challengeId, code, rememberDevice);
      if (res.status === "SUCCESS") {
        loginSuccess(res);
        setMfaChallenge(null);
        router.push("/");
      }
    } catch (err: any) {
      setMfaError(err.message || "Invalid verification code. Check your authenticator app or backup codes.");
    } finally {
      setMfaLoading(false);
    }
  };

  const handleOAuthLogin = async (provider: string) => {
    try {
      const redirectUri = `${window.location.origin}/auth/callback`;
      const res = await api.getOAuthLoginUrl(provider, redirectUri);
      if (res.authorization_url) {
        // Save state and PKCE verifier for callback verification
        localStorage.setItem("oauth_state", res.state);
        localStorage.setItem("oauth_code_verifier", res.code_verifier);
        localStorage.setItem("oauth_provider", provider);
        window.location.href = res.authorization_url;
      }
    } catch (err: any) {
      setError(err.message || `Failed to initiate ${provider} social login.`);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center p-4 sm:p-6">
      <Card className="w-full max-w-md shadow-2xl border-border/80 bg-card">
        <CardHeader className="space-y-2 text-center pb-5">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-blue-700 text-primary-foreground shadow-md mb-2">
            <CheckSquare className="h-6 w-6" />
          </div>
          <CardTitle className="text-xl font-bold tracking-tight">Sign in to TaskTracker</CardTitle>
          <CardDescription>Enter your credentials or use social sign-in to access your workspace.</CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {error && (
            <div className="flex items-start gap-2.5 rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive font-medium">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Social OAuth Providers */}
          {providers.length > 0 && (
            <div className="space-y-2">
              {providers.includes("google") && (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full gap-2.5 bg-card hover:bg-muted/70 font-medium text-xs h-10 shadow-xs"
                  onClick={() => handleOAuthLogin("google")}
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.04 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                    />
                  </svg>
                  <span>Continue with Google</span>
                </Button>
              )}

              {providers.includes("github") && (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full gap-2.5 bg-card hover:bg-muted/70 font-medium text-xs h-10 shadow-xs"
                  onClick={() => handleOAuthLogin("github")}
                >
                  <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                  </svg>
                  <span>Continue with GitHub</span>
                </Button>
              )}

              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border/80" />
                </div>
                <div className="relative flex justify-center text-[10px] uppercase">
                  <span className="bg-card px-2 text-muted-foreground font-semibold">Or with password</span>
                </div>
              </div>
            </div>
          )}

          {/* Email / Password Form */}
          <form onSubmit={handlePasswordLogin} className="space-y-3.5">
            <Input
              label="Username or Email"
              type="text"
              required
              placeholder="e.g. admin@l4s3r.site"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
            />

            <Input
              label="Password"
              type={showPassword ? "text" : "password"}
              required
              placeholder="Enter your account password"
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

            <Button type="submit" className="w-full mt-2" size="lg" isLoading={isLoading}>
              Sign In
            </Button>
          </form>
        </CardContent>

        <CardFooter className="flex justify-center border-t border-border/70 pt-4 pb-4">
          <p className="text-xs text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="font-semibold text-primary hover:underline p-1 inline-block">
              Create an account
            </Link>
          </p>
        </CardFooter>
      </Card>

      {/* MFA TOTP Challenge Modal */}
      <MfaModal
        isOpen={Boolean(mfaChallenge)}
        onClose={() => setMfaChallenge(null)}
        onVerify={handleCompleteMFA}
        isLoading={mfaLoading}
        error={mfaError}
      />
    </div>
  );
}

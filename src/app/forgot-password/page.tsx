"use client";

import React, { useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { KeyRound, Mail, ArrowLeft, CheckCircle2, AlertCircle } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const res = await api.forgotPassword(email.trim());
      setSubmitted(true);
      setMessage(res.message || "If an account matching that email address exists, password reset instructions have been sent.");
    } catch (err: any) {
      setError(err.message || "Failed to submit password reset request. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center p-4 sm:p-6">
      <Card className="w-full max-w-md shadow-2xl border-border/80 bg-card">
        <CardHeader className="space-y-2 text-center pb-5">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-blue-700 text-primary-foreground shadow-md mb-2">
            <KeyRound className="h-6 w-6" />
          </div>
          <CardTitle className="text-xl font-bold tracking-tight">Forgot Password</CardTitle>
          <CardDescription>
            Enter your registered account email and we'll send you a secure link to reset your password.
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {error && (
            <div className="flex items-start gap-2.5 rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive font-medium">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {submitted ? (
            <div className="space-y-4 text-center py-2">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-7 w-7" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-sm font-semibold text-foreground">Check your inbox</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {message}
                </p>
              </div>
              <div className="rounded-xl border border-border/60 bg-muted/30 p-3 text-[11px] text-muted-foreground text-left">
                <strong>Tip:</strong> The reset link is valid for 15 minutes. Be sure to check your spam or junk folder if it doesn't appear shortly.
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Email Address"
                type="email"
                required
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                startIcon={<Mail className="h-4 w-4" />}
              />

              <Button type="submit" className="w-full" size="lg" isLoading={isLoading}>
                Send Reset Link
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
    </div>
  );
}

"use client";

import React, { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { OtpInput } from "@/components/ui/otp-input";
import QRCode from "qrcode";
import {
  Shield,
  Smartphone,
  Lock,
  LogOut,
  CheckCircle2,
  AlertCircle,
  Copy,
  Download,
  QrCode,
  Check,
  ShieldCheck,
  ShieldAlert,
  ArrowRight,
  KeyRound,
} from "lucide-react";

export function SecuritySettings() {
  const { user, token, logout, refreshProfile } = useAuth();
  const [isMfaModalOpen, setIsMfaModalOpen] = useState(false);
  const [mfaData, setMfaData] = useState<{
    secret: string;
    provisioning_uri: string;
    backup_codes: string[];
  } | null>(null);

  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>("");
  const [step, setStep] = useState<1 | 2 | 3>(1); // 1: QR & Secret, 2: Recovery Codes, 3: Verify 6-Digit Code
  const [verificationCode, setVerificationCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [copiedCodes, setCopiedCodes] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const isMfaActive = Boolean(user?.metadata?.mfa_enabled);

  const handleStartMfaSetup = async () => {
    if (!token) return;
    setIsLoading(true);
    setError(null);
    setVerificationError(null);
    setVerificationCode("");
    setStep(1);

    try {
      const res = await api.setupMFA(token);
      setMfaData({
        secret: res.secret,
        provisioning_uri: res.provisioning_uri,
        backup_codes: res.backup_codes,
      });

      const qrUrl = await QRCode.toDataURL(res.provisioning_uri, {
        width: 256,
        margin: 2,
        color: {
          dark: "#000000",
          light: "#ffffff",
        },
      });
      setQrCodeDataUrl(qrUrl);
      setIsMfaModalOpen(true);
    } catch (err: any) {
      setError(err.message || "Failed to initialize MFA setup.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyAndActivateMFA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !verificationCode.trim()) return;

    setIsVerifying(true);
    setVerificationError(null);

    try {
      await api.verifyMFASetup(token, verificationCode.trim());
      setStatusMessage("Two-factor authentication successfully verified and activated.");
      await refreshProfile();
      setIsMfaModalOpen(false);
    } catch (err: any) {
      setVerificationError(err.message || "Invalid verification code. Please check your authenticator clock.");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleDisableMFA = async () => {
    if (!token || !confirm("Are you sure you want to disable Two-Factor Authentication?")) return;
    setIsLoading(true);
    setError(null);

    try {
      await api.disableMFA(token);
      setStatusMessage("Two-factor authentication has been disabled.");
      await refreshProfile();
    } catch (err: any) {
      setError(err.message || "Failed to disable MFA.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopySecret = () => {
    if (!mfaData) return;
    navigator.clipboard.writeText(mfaData.secret);
    setCopiedSecret(true);
    setTimeout(() => setCopiedSecret(false), 2000);
  };

  const handleCopyCodes = () => {
    if (!mfaData) return;
    navigator.clipboard.writeText(mfaData.backup_codes.join("\n"));
    setCopiedCodes(true);
    setTimeout(() => setCopiedCodes(false), 2000);
  };

  const handleDownloadCodes = () => {
    if (!mfaData) return;
    const content = `Auth N&Z - Emergency Recovery Backup Codes\nAccount: ${user?.email}\nGenerated: ${new Date().toISOString()}\n\n` +
      mfaData.backup_codes.map((c, i) => `${i + 1}. ${c}`).join("\n") +
      `\n\nKeep these single-use recovery codes in a secure password manager.`;

    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `recovery_codes_${user?.username || "auth_nz"}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Security & Identity Settings</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Manage your authentication credentials, multi-factor security, and active sessions.
        </p>
      </div>

      {statusMessage && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive font-medium">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Identity Profile Overview */}
      <Card className="border-border/80 bg-card shadow-sm">
        <CardHeader className="p-4 sm:p-5 pb-3">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <span>Account Security Claims</span>
          </CardTitle>
          <CardDescription>Role and clearance context assigned by the Auth N&Z gateway.</CardDescription>
        </CardHeader>

        <CardContent className="p-4 sm:p-5 pt-0 space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-xl border border-border/70 p-3.5 bg-secondary/30">
              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Department</span>
              <p className="text-sm font-bold text-foreground mt-1">
                {user?.metadata?.department || "General"}
              </p>
            </div>

            <div className="rounded-xl border border-border/70 p-3.5 bg-secondary/30">
              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Security Clearance</span>
              <p className="text-sm font-bold text-foreground mt-1">
                Level {user?.metadata?.clearance ?? 1} / 3
              </p>
            </div>

            <div className="rounded-xl border border-border/70 p-3.5 bg-secondary/30">
              <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Assigned Roles</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {(Array.isArray(user?.roles)
                  ? user.roles
                  : typeof user?.roles === "string"
                  ? [user.roles]
                  : []
                ).map((r) => (
                  <Badge key={r} variant={r === "admin" ? "admin" : "secondary"}>
                    {r}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* MFA Management Card */}
      <Card className="border-border/80 bg-card shadow-sm">
        <CardHeader className="p-4 sm:p-5 pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Smartphone className="h-5 w-5 text-primary" />
              <span>Two-Factor Authentication (RFC 6238 TOTP)</span>
            </CardTitle>
            {isMfaActive ? (
              <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold text-xs bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>Enabled</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-semibold text-xs bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">
                <ShieldAlert className="h-3.5 w-3.5" />
                <span>Disabled</span>
              </span>
            )}
          </div>
          <CardDescription>
            Protect your account with standard 6-digit one-time passwords from Google Authenticator or YubiKey.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-4 sm:p-5 pt-0 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 rounded-xl border border-border/80 bg-secondary/30">
            <div>
              <p className="text-xs font-bold text-foreground">
                {isMfaActive ? "Authenticator App is Active" : "Add Authenticator App"}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5 max-w-md leading-relaxed">
                {isMfaActive
                  ? "Your account requires entering a 6-digit code or backup code on every login attempt."
                  : "Scan a QR code using Google Authenticator, Bitwarden, or 1Password to generate time-based codes."}
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {isMfaActive ? (
                <>
                  <Button variant="outline" size="sm" onClick={handleStartMfaSetup} isLoading={isLoading}>
                    <QrCode className="h-4 w-4 mr-1.5" />
                    <span>Reconfigure QR</span>
                  </Button>
                  <Button variant="destructive" size="sm" onClick={handleDisableMFA} isLoading={isLoading}>
                    <span>Disable 2FA</span>
                  </Button>
                </>
              ) : (
                <Button onClick={handleStartMfaSetup} isLoading={isLoading} size="sm" className="gap-2 shadow-sm">
                  <QrCode className="h-4 w-4" />
                  <span>Set Up Authenticator</span>
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Session Invalidation Card */}
      <Card className="border-destructive/30 bg-card shadow-sm">
        <CardHeader className="p-4 sm:p-5 pb-3">
          <CardTitle className="text-base font-bold flex items-center gap-2 text-destructive">
            <Lock className="h-5 w-5" />
            <span>Active Sessions & Device Management</span>
          </CardTitle>
          <CardDescription>Invalidate JWT tokens and revoke stateful Redis sessions.</CardDescription>
        </CardHeader>

        <CardContent className="p-4 sm:p-5 pt-0 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 rounded-xl border border-destructive/20 bg-destructive/5">
            <div>
              <p className="text-xs font-bold text-foreground">Log Out from All Devices</p>
              <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                Revokes all active sessions and blacklists your active JWT tokens across all browsers and apps.
              </p>
            </div>

            <Button variant="destructive" size="sm" onClick={() => logout(true)} className="gap-2 shrink-0 shadow-sm">
              <LogOut className="h-4 w-4" />
              <span>Revoke All Devices</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Multi-Step Interactive MFA Enrollment Modal */}
      <Modal
        isOpen={isMfaModalOpen}
        onClose={() => setIsMfaModalOpen(false)}
        title="Set Up Two-Factor Authentication"
        description="Scan the QR code, save your recovery codes, and enter the 6-digit code to activate."
      >
        {mfaData && (
          <div className="space-y-4 text-xs pt-1">
            {/* Step Stepper Tabs */}
            <div className="flex items-center justify-between border-b border-border/70 pb-3">
              <button
                type="button"
                onClick={() => setStep(1)}
                className={`flex items-center gap-2 font-bold transition-colors cursor-pointer min-h-[44px] px-2.5 py-1.5 rounded-lg ${
                  step === 1 ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
                aria-label="Step 1: Scan QR Code"
              >
                <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                  step === 1 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}>1</span>
                <span className="text-xs">Scan QR</span>
              </button>

              <span className="text-muted-foreground/40 text-xs">→</span>

              <button
                type="button"
                onClick={() => setStep(2)}
                className={`flex items-center gap-2 font-bold transition-colors cursor-pointer min-h-[44px] px-2.5 py-1.5 rounded-lg ${
                  step === 2 ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
                aria-label="Step 2: Backup Codes"
              >
                <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                  step === 2 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}>2</span>
                <span className="text-xs">Backup Codes</span>
              </button>

              <span className="text-muted-foreground/40 text-xs">→</span>

              <button
                type="button"
                onClick={() => setStep(3)}
                className={`flex items-center gap-2 font-bold transition-colors cursor-pointer min-h-[44px] px-2.5 py-1.5 rounded-lg ${
                  step === 3 ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
                aria-label="Step 3: Verify TOTP Code"
              >
                <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                  step === 3 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}>3</span>
                <span className="text-xs">Verify Code</span>
              </button>
            </div>

            {/* Step 1: Scan QR Code & Secret */}
            {step === 1 && (
              <div className="space-y-4">
                <div className="flex flex-col items-center justify-center p-4 bg-secondary/40 rounded-2xl border border-border/80 shadow-xs max-w-xs mx-auto">
                  {qrCodeDataUrl ? (
                    <div className="p-2.5 bg-white rounded-xl shadow-xs">
                      <img src={qrCodeDataUrl} alt="Google Authenticator QR Code" className="h-40 w-40 rounded-lg" />
                    </div>
                  ) : (
                    <div className="h-44 w-44 flex items-center justify-center text-muted-foreground">
                      Generating QR...
                    </div>
                  )}
                  <p className="text-[10px] text-muted-foreground font-semibold mt-2.5 text-center">
                    Point your Google Authenticator camera at this QR code.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-foreground">Or enter key manually:</span>
                    <button
                      type="button"
                      onClick={handleCopySecret}
                      className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline cursor-pointer min-h-[44px] px-2.5 py-1.5 rounded-lg hover:bg-primary/10 transition-colors"
                    >
                      {copiedSecret ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      <span>{copiedSecret ? "Copied!" : "Copy Key"}</span>
                    </button>
                  </div>
                  <div className="p-3 rounded-xl bg-secondary/60 font-mono text-xs text-primary font-bold break-all border border-border select-all text-center tracking-widest">
                    {mfaData.secret}
                  </div>
                </div>

                <div className="flex justify-end pt-3 border-t border-border/70">
                  <Button size="default" onClick={() => setStep(2)} className="gap-1.5">
                    <span>Next: Save Backup Codes</span>
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 2: Emergency Recovery Codes */}
            {step === 2 && (
              <div className="space-y-4">
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-[11px] leading-relaxed">
                  <strong>Save these single-use recovery codes in a safe place.</strong> If you lose access to your phone or authenticator app, these codes are the only way to recover your account.
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-xs text-foreground bg-secondary/40 p-3 rounded-xl border border-border/70">
                  {mfaData.backup_codes.map((code, idx) => (
                    <div key={idx} className="p-2.5 bg-card rounded-lg border border-border/60 text-center font-bold">
                      {code}
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <Button variant="outline" size="default" onClick={handleCopyCodes} className="gap-1.5">
                    {copiedCodes ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                    <span>{copiedCodes ? "Codes Copied" : "Copy All Codes"}</span>
                  </Button>
                  <Button variant="outline" size="default" onClick={handleDownloadCodes} className="gap-1.5">
                    <Download className="h-4 w-4" />
                    <span>Download (.txt)</span>
                  </Button>
                </div>

                <div className="flex justify-between pt-3 border-t border-border/70">
                  <Button variant="ghost" size="default" onClick={() => setStep(1)}>
                    ← Back to QR
                  </Button>
                  <Button size="default" onClick={() => setStep(3)} className="gap-1.5">
                    <span>Next: Verify Code</span>
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: Enter and Verify 6-digit TOTP Code */}
            {step === 3 && (
              <form onSubmit={handleVerifyAndActivateMFA} className="space-y-4">
                <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 text-primary text-[11px] leading-relaxed">
                  <strong>Final Step:</strong> Enter the 6-digit code currently shown in your Google Authenticator app to confirm proper synchronization and activate 2FA.
                </div>

                {verificationError && (
                  <div className="flex items-center gap-2 rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive font-medium">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{verificationError}</span>
                  </div>
                )}

                <div className="space-y-2.5">
                  <label className="block text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Enter 6-Digit Authenticator Code
                  </label>
                  <OtpInput
                    length={6}
                    value={verificationCode}
                    onChange={setVerificationCode}
                    onComplete={(code) => {
                      setVerificationCode(code);
                    }}
                    disabled={isVerifying}
                    autoFocus={true}
                    hasError={Boolean(verificationError)}
                  />
                  <p className="text-[11px] text-center text-muted-foreground">
                    Codes rotate every 30 seconds.
                  </p>
                </div>

                <div className="flex justify-between pt-3 border-t border-border/70">
                  <Button variant="ghost" size="default" type="button" onClick={() => setStep(2)}>
                    ← Back to Codes
                  </Button>
                  <Button type="submit" size="default" isLoading={isVerifying} className="gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Activate 2FA</span>
                  </Button>
                </div>
              </form>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { api } from "@/lib/api";
import { TrustedDevice } from "@/lib/tasks-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Modal } from "@/components/ui/modal";
import { OtpInput } from "@/components/ui/otp-input";
import QRCode from "qrcode";
import { registerPasskeyFlow, isWebAuthnSupported } from "@/lib/webauthn";
import {
  Shield,
  Smartphone,
  Laptop,
  Monitor,
  Globe,
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
  Trash2,
  RotateCcw,
  Clock,
  Radio,
  Fingerprint,
  Key,
  Plus,
} from "lucide-react";

export function SecuritySettings() {
  const { user, token, logout, refreshProfile } = useAuth();
  const { toast } = useToast();
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

  // WebAuthn / Passkeys State
  const [passkeys, setPasskeys] = useState<any[]>([]);
  const [isLoadingPasskeys, setIsLoadingPasskeys] = useState(false);
  const [isRegisteringPasskey, setIsRegisteringPasskey] = useState(false);
  const [isPasskeyModalOpen, setIsPasskeyModalOpen] = useState(false);
  const [passkeyLabel, setPasskeyLabel] = useState("");
  const [passkeyRevokingId, setPasskeyRevokingId] = useState<string | null>(null);
  const [webAuthnSupported, setWebAuthnSupported] = useState(false);

  // Trusted Devices State
  const [trustedDevices, setTrustedDevices] = useState<TrustedDevice[]>([]);
  const [isLoadingDevices, setIsLoadingDevices] = useState(false);
  const [deviceRevokingId, setDeviceRevokingId] = useState<string | null>(null);
  const [isRevokingAll, setIsRevokingAll] = useState(false);
  const [deviceActionMsg, setDeviceActionMsg] = useState<string | null>(null);

  const isMfaActive = Boolean(user?.metadata?.mfa_enabled);

  const fetchPasskeys = useCallback(async () => {
    if (!token) return;
    setIsLoadingPasskeys(true);
    try {
      const res = await api.getWebAuthnCredentials(token);
      setPasskeys(res.credentials || []);
    } catch {
      // Backend may return empty list or not have credentials yet
      setPasskeys([]);
    } finally {
      setIsLoadingPasskeys(false);
    }
  }, [token]);

  const fetchTrustedDevices = useCallback(async () => {
    if (!token) return;
    setIsLoadingDevices(true);
    try {
      const res = await api.getTrustedDevices(token);
      setTrustedDevices(res.devices || []);
    } catch {
      // Best effort telemetry
    } finally {
      setIsLoadingDevices(false);
    }
  }, [token]);

  useEffect(() => {
    setWebAuthnSupported(isWebAuthnSupported());
    fetchTrustedDevices();
    fetchPasskeys();
  }, [fetchTrustedDevices, fetchPasskeys]);

  const handleOpenPasskeyModal = () => {
    const defaultName =
      typeof navigator !== "undefined" && navigator.userAgent.includes("Mac")
        ? "MacBook Touch ID / Apple Passkey"
        : typeof navigator !== "undefined" && navigator.userAgent.includes("Windows")
        ? "Windows Hello Passkey"
        : "FIDO2 Security Key";
    setPasskeyLabel(defaultName);
    setIsPasskeyModalOpen(true);
  };

  const handleRegisterPasskey = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!token) return;
    setIsRegisteringPasskey(true);
    setError(null);

    try {
      await registerPasskeyFlow(token, passkeyLabel.trim() || undefined);
      setIsPasskeyModalOpen(false);
      setPasskeyLabel("");
      toast.success("Passkey Registered", "Hardware passkey / security key was registered successfully.");
      setStatusMessage("Passkey registered successfully. You can now use it for instant biometric sign-in.");
      setTimeout(() => setStatusMessage(null), 5000);
      await fetchPasskeys();
      await refreshProfile();
    } catch (err: any) {
      if (err.name === "NotAllowedError" || err.message?.includes("cancelled")) {
        setError("Passkey registration was cancelled by user.");
      } else {
        setError(err.message || "Failed to register Passkey.");
      }
    } finally {
      setIsRegisteringPasskey(false);
    }
  };

  const handleDeletePasskey = async (credentialId: string) => {
    if (!token || !confirm("Are you sure you want to remove this Passkey / Security Key?")) return;
    setPasskeyRevokingId(credentialId);
    setError(null);

    try {
      await api.deleteWebAuthnCredential(token, credentialId);
      setPasskeys((prev) => prev.filter((p) => (p.id || p.credential_id) !== credentialId));
      toast.success("Passkey Removed", "Security key was revoked from your account.");
      await fetchPasskeys();
    } catch (err: any) {
      setError(err.message || "Failed to remove Passkey.");
    } finally {
      setPasskeyRevokingId(null);
    }
  };

  const handleStartMfaSetup = async () => {
    if (!token) return;
    setIsLoading(true);
    setError(null);
    setVerificationError(null);
    setVerificationCode("");

    try {
      const res = await api.setupMFA(token);
      setMfaData({
        secret: res.secret,
        provisioning_uri: res.provisioning_uri,
        backup_codes: res.backup_codes || [],
      });

      const qrUrl = await QRCode.toDataURL(res.provisioning_uri, {
        width: 240,
        margin: 1,
        color: {
          dark: "#0F172A",
          light: "#FFFFFF",
        },
      });
      setQrCodeDataUrl(qrUrl);
      setStep(1);
      setIsMfaModalOpen(true);
    } catch (err: any) {
      setError(err.message || "Failed to initialize TOTP authenticator setup.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyAndActivateMFA = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!token || verificationCode.length !== 6) return;
    setIsVerifying(true);
    setVerificationError(null);

    try {
      await api.verifyMFASetup(token, verificationCode);
      await refreshProfile();
      setIsMfaModalOpen(false);
      setStatusMessage("Two-factor authentication has been successfully enforced.");
      toast.success("MFA Activated", "Two-Factor Authentication is now actively securing your account.");
      setVerificationCode("");
      setTimeout(() => setStatusMessage(null), 5000);
    } catch (err: any) {
      setVerificationError(err.message || "Invalid authenticator code. Please check your app.");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleDisableMFA = async () => {
    if (!token || !confirm("Are you sure you want to disable two-factor authentication? This reduces your account security.")) return;
    setIsLoading(true);
    setError(null);

    try {
      await api.disableMFA(token);
      await refreshProfile();
      setStatusMessage("Two-factor authentication has been disabled.");
      toast.warning("MFA Disabled", "Two-Factor Authentication has been removed.");
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err: any) {
      setError(err.message || "Failed to disable MFA.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRevokeDevice = async (deviceId: string) => {
    if (!token) return;
    setDeviceRevokingId(deviceId);
    setDeviceActionMsg(null);

    try {
      await api.revokeTrustedDevice(token, deviceId);
      setTrustedDevices((prev) => prev.filter((d) => d.id !== deviceId));
      setDeviceActionMsg("Device authorization revoked successfully.");
      toast.success("Device Revoked", "Recognized browser session was signed out.");
      setTimeout(() => setDeviceActionMsg(null), 3500);
    } catch (err: any) {
      setError(err.message || "Failed to revoke device authorization.");
    } finally {
      setDeviceRevokingId(null);
    }
  };

  const handleRevokeAllDevices = async () => {
    if (
      !token ||
      !confirm("Are you sure you want to sign out of all trusted devices? MFA will be required on all browsers upon next login.")
    )
      return;
    setIsRevokingAll(true);
    setDeviceActionMsg(null);

    try {
      await api.revokeAllTrustedDevices(token);
      setTrustedDevices([]);
      setDeviceActionMsg("All trusted devices have been signed out and revoked.");
      toast.success("All Sessions Revoked", "MFA will be required on all browsers.");
      setTimeout(() => setDeviceActionMsg(null), 3500);
    } catch (err: any) {
      setError(err.message || "Failed to revoke all trusted devices.");
    } finally {
      setIsRevokingAll(false);
    }
  };

  const handleCopySecret = () => {
    if (!mfaData) return;
    navigator.clipboard.writeText(mfaData.secret);
    setCopiedSecret(true);
    toast.info("Secret Copied", "Authenticator secret copied to clipboard.");
    setTimeout(() => setCopiedSecret(false), 2000);
  };

  const handleCopyCodes = () => {
    if (!mfaData) return;
    navigator.clipboard.writeText(mfaData.backup_codes.join("\n"));
    setCopiedCodes(true);
    toast.info("Codes Copied", "Emergency backup codes copied to clipboard.");
    setTimeout(() => setCopiedCodes(false), 2000);
  };

  const handleDownloadCodes = () => {
    if (!mfaData) return;
    const content =
      `Auth N&Z - Emergency Recovery Backup Codes\nAccount: ${user?.email}\nGenerated: ${new Date().toISOString()}\n\n` +
      mfaData.backup_codes.map((c, i) => `${i + 1}. ${c}`).join("\n") +
      `\n\nKeep these single-use recovery codes in a secure password manager.`;

    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `recovery_codes_${user?.username || "auth_nz"}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Codes Downloaded", "Saved recovery backup codes file.");
  };

  const getDeviceIcon = (label?: string, ua?: string) => {
    const str = `${label || ""} ${ua || ""}`.toLowerCase();
    if (str.includes("iphone") || str.includes("android") || str.includes("mobile")) {
      return <Smartphone className="h-5 w-5 text-primary" />;
    }
    if (str.includes("mac") || str.includes("windows") || str.includes("linux")) {
      return <Laptop className="h-5 w-5 text-primary" />;
    }
    return <Monitor className="h-5 w-5 text-primary" />;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Security &amp; Device Trust</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Configure cryptographic two-factor authentication and manage recognized trusted browsers.
        </p>
      </div>

      {statusMessage && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-600 dark:text-emerald-400 font-medium animate-in fade-in-50 duration-200">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {deviceActionMsg && (
        <div className="flex items-center gap-2 rounded-xl border border-blue-500/30 bg-blue-500/10 p-3 text-xs text-blue-600 dark:text-blue-400 font-medium animate-in fade-in-50 duration-200">
          <ShieldCheck className="h-4 w-4 shrink-0" />
          <span>{deviceActionMsg}</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive font-medium animate-in fade-in-50 duration-200">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Security Overview & 2FA Status Banner */}
      <Card className="border-border/80 bg-card shadow-sm">
        <CardHeader className="p-4 sm:p-5 pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <Avatar name={user?.name || user?.metadata?.name || user?.username} size="md">
                <AvatarImage src={user?.avatar_url || user?.metadata?.avatar_url} alt={user?.username} />
                <AvatarFallback>{user?.username?.slice(0, 2).toUpperCase() || "US"}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col text-left">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm text-foreground">
                    {user?.name || user?.metadata?.name || user?.username}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    @{user?.username}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {user?.email} &bull; Clearance: <strong className="text-primary font-semibold">{user?.roles?.join(", ") || "Standard"}</strong>
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant={isMfaActive ? "superadmin" : "outline"} className="text-xs">
                {isMfaActive ? "2FA Hardened" : "Password Only"}
              </Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-5 pt-0 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 rounded-xl border border-border/80 bg-secondary/30">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary mt-0.5">
                {isMfaActive ? <ShieldCheck className="h-5 w-5 text-emerald-500" /> : <ShieldAlert className="h-5 w-5 text-amber-500" />}
              </div>
              <div>
                <p className="text-xs font-bold text-foreground">
                  {isMfaActive ? "Authenticator App is Active (TOTP)" : "Add Authenticator App (Recommended)"}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5 max-w-md leading-relaxed">
                  {isMfaActive
                    ? "Your account is protected by time-based 6-digit one-time passcodes and backup recovery keys."
                    : "Scan a QR code using Google Authenticator, 1Password, or Bitwarden to require 2FA on sign-in."}
                </p>
              </div>
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

      {/* WebAuthn / Passkeys & Hardware Security Keys Card */}
      <Card className="border-border/80 bg-card shadow-sm">
        <CardHeader className="p-4 sm:p-5 pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground">
                <Fingerprint className="h-5 w-5 text-primary" />
                <span>Passkeys &amp; Hardware Security Keys (WebAuthn)</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Passwordless, phishing-resistant cryptographic authentication using Touch ID, Face ID, Windows Hello, or YubiKey.
              </CardDescription>
            </div>

            <Button
              size="sm"
              onClick={handleOpenPasskeyModal}
              disabled={!webAuthnSupported}
              className="gap-1.5 text-xs shrink-0 shadow-sm"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Register Passkey</span>
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-5 pt-0 space-y-3">
          {!webAuthnSupported ? (
            <div className="p-3.5 rounded-xl border border-amber-500/20 bg-amber-500/10 text-[11px] text-amber-600 dark:text-amber-400">
              WebAuthn / FIDO2 Passkeys are not supported by this browser or environment.
            </div>
          ) : isLoadingPasskeys ? (
            <div className="flex items-center justify-center py-6 gap-2 text-xs text-muted-foreground">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <span>Loading registered passkeys...</span>
            </div>
          ) : passkeys.length === 0 ? (
            <div className="text-center py-6 px-4 rounded-xl border border-dashed border-border/80 bg-secondary/20">
              <Key className="h-8 w-8 text-muted-foreground/60 mx-auto mb-2" />
              <p className="text-xs font-semibold text-foreground">No Passkeys Registered</p>
              <p className="text-[11px] text-muted-foreground mt-0.5 max-w-sm mx-auto">
                Add a biometric passkey or hardware security key to sign in instantly without typing passwords or MFA codes.
              </p>
              <div className="mt-3">
                <Button size="sm" variant="outline" onClick={handleOpenPasskeyModal} className="text-xs gap-1.5">
                  <Fingerprint className="h-3.5 w-3.5 text-primary" />
                  <span>Register First Passkey</span>
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-2.5">
              {passkeys.map((pk: any, idx: number) => {
                const credId = pk.id || pk.credential_id || `passkey-${idx}`;
                const label = pk.device_label || pk.label || pk.name || "FIDO2 / WebAuthn Passkey";
                const createdAt = pk.created_at ? new Date(pk.created_at).toLocaleDateString() : "Active";
                const transports: string[] = pk.transports || ["internal"];

                return (
                  <div
                    key={credId}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3.5 rounded-xl border border-border/70 bg-secondary/30 hover:border-border transition-all"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-card border border-border/60 shadow-xs mt-0.5">
                        <Fingerprint className="h-5 w-5 text-primary" />
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-foreground">{label}</span>
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-primary/40 text-primary">
                            FIDO2 COSE
                          </Badge>
                          {transports.map((t) => (
                            <Badge key={t} variant="secondary" className="text-[10px] px-1.5 py-0 uppercase">
                              {t}
                            </Badge>
                          ))}
                        </div>

                        <div className="flex items-center gap-3 text-[11px] text-muted-foreground flex-wrap">
                          <span className="flex items-center gap-1 font-mono text-[10px]">
                            ID: {credId.slice(0, 16)}...
                          </span>
                          <span>&bull; Registered: {createdAt}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeletePasskey(credId)}
                        isLoading={passkeyRevokingId === credId}
                        className="text-xs h-8 px-2.5 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-1" />
                        <span>Remove</span>
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Trusted Devices Management Card (30-Day MFA Bypass) */}
      <Card className="border-border/80 bg-card shadow-sm">
        <CardHeader className="p-4 sm:p-5 pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground">
                <Laptop className="h-5 w-5 text-primary" />
                <span>Trusted Devices &amp; Browsers</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Browsers recognized via 30-day device trust cookie. These skip MFA challenges during sign-in until revoked.
              </CardDescription>
            </div>

            {trustedDevices.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleRevokeAllDevices}
                isLoading={isRevokingAll}
                className="gap-1.5 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/30 shrink-0"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Sign out of all trusted devices</span>
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-4 sm:p-5 pt-0 space-y-3">
          {isLoadingDevices ? (
            <div className="flex items-center justify-center py-6 gap-2 text-xs text-muted-foreground">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <span>Loading recognized trusted devices...</span>
            </div>
          ) : trustedDevices.length === 0 ? (
            <div className="text-center py-6 px-4 rounded-xl border border-dashed border-border/80 bg-secondary/20">
              <Laptop className="h-8 w-8 text-muted-foreground/60 mx-auto mb-2" />
              <p className="text-xs font-semibold text-foreground">No Trusted Devices Registered</p>
              <p className="text-[11px] text-muted-foreground mt-0.5 max-w-sm mx-auto">
                When signing in with 2FA, check &ldquo;Remember this device for 30 days&rdquo; to recognize and manage your trusted browsers here.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {trustedDevices.map((device) => {
                const isCurrent = device.is_current_device || device.is_current;
                const label = device.device_label || device.label || device.user_agent || "Recognized Web Browser";
                const ip = device.ip_address || device.ip || "192.168.1.100";
                const location = device.location || "Local Network";
                const createdAt = device.created_at ? new Date(device.created_at).toLocaleDateString() : "Recent";
                const lastActive = device.last_active || device.last_used_at
                  ? new Date(device.last_active || device.last_used_at!).toLocaleDateString()
                  : "Active now";

                return (
                  <div
                    key={device.id}
                    className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3.5 rounded-xl border transition-all ${
                      isCurrent
                        ? "bg-primary/5 border-primary/30"
                        : "bg-secondary/30 border-border/70 hover:border-border"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-card border border-border/60 shadow-xs mt-0.5">
                        {getDeviceIcon(label, device.user_agent)}
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-foreground">{label}</span>
                          {isCurrent && (
                            <Badge variant="success" className="text-[10px] px-1.5 py-0">
                              Current Device
                            </Badge>
                          )}
                        </div>

                        <div className="flex items-center gap-3 text-[11px] text-muted-foreground flex-wrap">
                          <span className="flex items-center gap-1">
                            <Globe className="h-3 w-3 text-muted-foreground/70" />
                            <span>{ip} &bull; {location}</span>
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3 text-muted-foreground/70" />
                            <span>Last active: {lastActive}</span>
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRevokeDevice(device.id)}
                        isLoading={deviceRevokingId === device.id}
                        className="text-xs h-8 px-2.5 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-1" />
                        <span>Revoke</span>
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Session Invalidation Card */}
      <Card className="border-destructive/30 bg-card shadow-sm">
        <CardHeader className="p-4 sm:p-5 pb-3">
          <CardTitle className="text-base font-bold flex items-center gap-2 text-destructive">
            <Lock className="h-5 w-5" />
            <span>Active Sessions &amp; Global Logout</span>
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
              <span>Revoke All Sessions</span>
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
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                    step === 1 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  }`}
                >
                  1
                </span>
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
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                    step === 2 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  }`}
                >
                  2
                </span>
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
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                    step === 3 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  }`}
                >
                  3
                </span>
                <span className="text-xs">Verify Code</span>
              </button>
            </div>

            {/* Step 1: Scan QR Code & Secret */}
            {step === 1 && (
              <div className="space-y-4">
                <div className="flex flex-col items-center justify-center p-4 bg-secondary/40 rounded-2xl border border-border/80 shadow-xs max-w-xs mx-auto">
                  {qrCodeDataUrl ? (
                    <div className="p-2.5 bg-white rounded-xl shadow-xs">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
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

      {/* Passkey Registration Modal */}
      <Modal
        isOpen={isPasskeyModalOpen}
        onClose={() => setIsPasskeyModalOpen(false)}
        title="Register Passkey / Security Key"
        description="Add a cryptographic FIDO2 credential using Touch ID, Face ID, Windows Hello, or a hardware key."
      >
        <form onSubmit={handleRegisterPasskey} className="space-y-4 text-xs pt-1">
          <div className="flex items-start gap-3 p-3.5 rounded-xl border border-primary/20 bg-primary/5">
            <Fingerprint className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold text-foreground">Hardware &amp; Biometric Security</p>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                When you click &ldquo;Begin Registration&rdquo;, your browser will prompt you to scan your fingerprint, face, or touch your hardware security key.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Input
              label="Key / Device Label"
              placeholder="e.g. MacBook Touch ID, YubiKey 5C"
              value={passkeyLabel}
              onChange={(e) => setPasskeyLabel(e.target.value)}
              required
              disabled={isRegisteringPasskey}
            />
            <p className="text-[11px] text-muted-foreground">
              A nickname to help you identify this authenticator in your settings.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-border/70">
            <Button
              variant="outline"
              type="button"
              onClick={() => setIsPasskeyModalOpen(false)}
              disabled={isRegisteringPasskey}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              isLoading={isRegisteringPasskey}
              className="gap-2"
            >
              <Fingerprint className="h-4 w-4" />
              <span>Begin Registration</span>
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

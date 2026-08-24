"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { OtpInput } from "@/components/ui/otp-input";
import {
  ShieldCheck,
  Smartphone,
  KeyRound,
  AlertCircle,
  ArrowRight,
  HelpCircle,
} from "lucide-react";

interface MfaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVerify: (code: string, rememberDevice: boolean) => Promise<void>;
  isLoading: boolean;
  error: string | null;
  title?: string;
  description?: string;
}

export function MfaModal({
  isOpen,
  onClose,
  onVerify,
  isLoading,
  error,
  title = "Two-Factor Verification",
  description = "Confirm your identity by entering the 6-digit security code from your authenticator app.",
}: MfaModalProps) {
  const [mfaCode, setMfaCode] = useState("");
  const [isBackupMode, setIsBackupMode] = useState(false);
  const [backupCode, setBackupCode] = useState("");
  const [rememberDevice, setRememberDevice] = useState(true);

  const handleFormSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const finalCode = isBackupMode ? backupCode.trim() : mfaCode.trim();
    if (!finalCode) return;
    await onVerify(finalCode, rememberDevice);
  };

  const handleOtpComplete = async (completedCode: string) => {
    if (!isBackupMode && completedCode.length === 6) {
      await onVerify(completedCode, rememberDevice);
    }
  };

  const handleClose = () => {
    setMfaCode("");
    setBackupCode("");
    setIsBackupMode(false);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title=""
      description=""
    >
      <div className="space-y-5 pt-1">
        {/* Security Shield Crest */}
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="relative flex items-center justify-center">
            <div className="absolute h-16 w-16 rounded-full bg-primary/20 animate-ping opacity-60 pointer-events-none" />
            <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary via-blue-600 to-indigo-700 text-primary-foreground shadow-lg shadow-primary/25 border border-white/20">
              <ShieldCheck className="h-8 w-8" />
            </div>
          </div>

          <div className="space-y-1">
            <h3 className="text-lg font-bold tracking-tight text-foreground">{title}</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto leading-relaxed">
              {description}
            </p>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="flex items-center gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive font-medium animate-in fade-in-50 duration-150">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Verification Mode Selector Tabs */}
        <div className="flex rounded-xl bg-secondary/60 p-1 border border-border/70 text-xs">
          <button
            type="button"
            onClick={() => {
              setIsBackupMode(false);
              setBackupCode("");
            }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg font-semibold transition-all cursor-pointer min-h-[38px] ${
              !isBackupMode
                ? "bg-card text-foreground shadow-xs border border-border/50"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Smartphone className="h-3.5 w-3.5" />
            <span>Authenticator App</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setIsBackupMode(true);
              setMfaCode("");
            }}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg font-semibold transition-all cursor-pointer min-h-[38px] ${
              isBackupMode
                ? "bg-card text-foreground shadow-xs border border-border/50"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <KeyRound className="h-3.5 w-3.5" />
            <span>Backup Recovery Code</span>
          </button>
        </div>

        <form onSubmit={handleFormSubmit} className="space-y-4">
          {!isBackupMode ? (
            /* Segmented 6-digit OTP code input */
            <div className="space-y-3">
              <label className="block text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Enter 6-Digit Code
              </label>

              <OtpInput
                length={6}
                value={mfaCode}
                onChange={setMfaCode}
                onComplete={handleOtpComplete}
                disabled={isLoading}
                autoFocus={true}
                hasError={Boolean(error)}
              />

              {/* Remember This Device Checkbox */}
              <label className="flex items-center justify-center gap-2 text-xs text-muted-foreground cursor-pointer select-none py-1 hover:text-foreground transition-colors">
                <input
                  type="checkbox"
                  checked={rememberDevice}
                  onChange={(e) => setRememberDevice(e.target.checked)}
                  className="rounded border-border text-primary h-4 w-4 focus:ring-primary/30 cursor-pointer"
                />
                <span>Remember this device for 30 days</span>
              </label>

              <p className="text-[11px] text-center text-muted-foreground">
                Codes rotate every 30 seconds (Google Authenticator / Authy / 1Password).
              </p>
            </div>
          ) : (
            /* Alphanumeric Backup Recovery Code Input */
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-foreground/80 tracking-wide uppercase">
                Emergency Backup Recovery Code
              </label>
              <div className="relative">
                <KeyRound className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="e.g. 9F3A-8B2C"
                  value={backupCode}
                  onChange={(e) => setBackupCode(e.target.value.replace(/\s+/g, ""))}
                  className="flex h-12 min-h-[48px] w-full rounded-xl border border-input bg-card pl-10 pr-4 text-center font-mono text-base font-bold tracking-widest text-foreground placeholder:text-muted-foreground placeholder:tracking-normal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary shadow-xs"
                />
              </div>

              {/* Remember This Device Checkbox */}
              <label className="flex items-center justify-center gap-2 text-xs text-muted-foreground cursor-pointer select-none py-1 hover:text-foreground transition-colors">
                <input
                  type="checkbox"
                  checked={rememberDevice}
                  onChange={(e) => setRememberDevice(e.target.checked)}
                  className="rounded border-border text-primary h-4 w-4 focus:ring-primary/30 cursor-pointer"
                />
                <span>Remember this device for 30 days</span>
              </label>

              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Enter one of your single-use recovery backup codes generated during 2FA activation. Codes are case-sensitive — enter exactly as shown.
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-2 space-y-2">
            <Button
              type="submit"
              size="lg"
              isLoading={isLoading}
              disabled={isBackupMode ? !backupCode.trim() : mfaCode.length < 6}
              className="w-full gap-2 text-sm shadow-md"
            >
              <span>Verify & Continue</span>
              <ArrowRight className="h-4 w-4" />
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClose}
              className="w-full text-xs text-muted-foreground hover:text-foreground"
            >
              Cancel Verification
            </Button>
          </div>
        </form>

        {/* Security Assurance Footer */}
        <div className="flex items-center justify-center gap-1.5 pt-3 border-t border-border/60 text-[11px] text-muted-foreground">
          <HelpCircle className="h-3.5 w-3.5 text-muted-foreground/80" />
          <span>Protected by Auth N&Z Multi-Factor Identity Gateway</span>
        </div>
      </div>
    </Modal>
  );
}

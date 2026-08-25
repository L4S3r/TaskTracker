"use client";

import React from "react";
import { Modal } from "./modal";
import { Button } from "./button";
import { AlertTriangle, AlertCircle, Info, Trash2 } from "lucide-react";

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "destructive" | "warning" | "default";
  isLoading?: boolean;
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "destructive",
  isLoading = false,
}: ConfirmDialogProps) {
  const isWarning = variant === "warning";
  const isDestructive = variant === "destructive";

  const alertStyles = isDestructive
    ? "border-destructive/20 bg-destructive/10 text-destructive"
    : isWarning
    ? "border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400"
    : "border-primary/20 bg-primary/10 text-primary";

  const IconComponent = isDestructive ? AlertCircle : isWarning ? AlertTriangle : Info;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} description={description}>
      <div className="space-y-4 pt-2">
        <div className={`flex items-start gap-3 rounded-xl border p-3.5 text-xs ${alertStyles}`}>
          <IconComponent className="h-5 w-5 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-foreground">{title}</p>
            <p className="text-muted-foreground leading-relaxed">{description}</p>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-border/70">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isLoading}>
            {cancelText}
          </Button>
          <Button
            type="button"
            variant={isDestructive ? "destructive" : isWarning ? "default" : "default"}
            size="sm"
            onClick={onConfirm}
            isLoading={isLoading}
            className={isWarning ? "bg-amber-600 hover:bg-amber-700 text-white" : ""}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

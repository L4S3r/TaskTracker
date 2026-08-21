"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export function Modal({ isOpen, onClose, title, description, children, className }: ModalProps) {
  const titleId = React.useId();

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6"
      data-slot="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? titleId : undefined}
    >
      <div
        className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        data-slot="modal-content"
        className={cn(
          "relative w-full max-w-lg rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-2xl transition-all z-10 max-h-[90vh] overflow-y-auto custom-scrollbar animate-in fade-in zoom-in-95 duration-200",
          className
        )}
      >
        <button
          onClick={onClose}
          className="absolute right-3.5 top-3.5 rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors min-h-[36px] min-w-[36px] inline-flex items-center justify-center cursor-pointer"
          aria-label="Close dialog"
        >
          <X className="h-4 w-4" />
        </button>

        {title && (
          <div className="mb-4 pr-8 border-b border-border/60 pb-3">
            <h2 id={titleId} className="text-base sm:text-lg font-bold text-foreground tracking-tight">
              {title}
            </h2>
            {description && (
              <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{description}</p>
            )}
          </div>
        )}

        {children}
      </div>
    </div>
  );
}

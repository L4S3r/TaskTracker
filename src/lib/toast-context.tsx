"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { CheckCircle2, AlertTriangle, AlertCircle, Info, X } from "lucide-react";

export type ToastType = "success" | "error" | "info" | "warning";

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  duration?: number;
}

interface ToastContextType {
  toasts: ToastItem[];
  addToast: (toast: Omit<ToastItem, "id">) => void;
  removeToast: (id: string) => void;
  toast: {
    success: (title: string, description?: string) => void;
    error: (title: string, description?: string) => void;
    info: (title: string, description?: string) => void;
    warning: (title: string, description?: string) => void;
  };
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    ({ type, title, description, duration = 3500 }: Omit<ToastItem, "id">) => {
      const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const newToast: ToastItem = { id, type, title, description, duration };

      setToasts((prev) => [...prev, newToast]);

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
    },
    [removeToast]
  );

  const toast = {
    success: useCallback((title: string, description?: string) => addToast({ type: "success", title, description }), [addToast]),
    error: useCallback((title: string, description?: string) => addToast({ type: "error", title, description }), [addToast]),
    info: useCallback((title: string, description?: string) => addToast({ type: "info", title, description }), [addToast]),
    warning: useCallback((title: string, description?: string) => addToast({ type: "warning", title, description }), [addToast]),
  };

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, toast }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

function ToastContainer({ toasts, onDismiss }: { toasts: ToastItem[]; onDismiss: (id: string) => void }) {
  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2.5 max-w-sm sm:max-w-md w-full pointer-events-none px-3 sm:px-0"
    >
      {toasts.map((t) => {
        const icons = {
          success: <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />,
          error: <AlertCircle className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />,
          warning: <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />,
          info: <Info className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />,
        };

        const borderThemes = {
          success: "border-emerald-500/30 bg-card dark:bg-slate-900 shadow-emerald-500/5",
          error: "border-rose-500/30 bg-card dark:bg-slate-900 shadow-rose-500/5",
          warning: "border-amber-500/30 bg-card dark:bg-slate-900 shadow-amber-500/5",
          info: "border-blue-500/30 bg-card dark:bg-slate-900 shadow-blue-500/5",
        };

        return (
          <div
            key={t.id}
            role="status"
            className={`pointer-events-auto flex items-start gap-3 rounded-xl border p-3.5 shadow-xl text-card-foreground transition-all animate-in slide-in-from-bottom-3 fade-in duration-200 ${borderThemes[t.type]}`}
          >
            {icons[t.type]}
            <div className="flex-1 min-w-0 pr-1">
              <p className="text-xs font-bold text-foreground leading-snug">{t.title}</p>
              {t.description && (
                <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{t.description}</p>
              )}
            </div>
            <button
              onClick={() => onDismiss(t.id)}
              className="text-muted-foreground hover:text-foreground p-1 rounded-md transition-colors shrink-0 -mr-1 -mt-1 cursor-pointer"
              aria-label="Dismiss toast"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

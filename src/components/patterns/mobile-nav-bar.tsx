"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useCommandPalette } from "@/lib/command-palette-context";
import {
  CheckSquare,
  Search,
  Plus,
  Users,
  Shield,
  Activity,
} from "lucide-react";

interface MobileNavBarProps {
  onOpenNewTask?: () => void;
}

export function MobileNavBar({ onOpenNewTask }: MobileNavBarProps) {
  const { user, isAdmin, isViewer } = useAuth();
  const { open: openCommandPalette } = useCommandPalette();
  const pathname = usePathname();

  if (!user) return null;

  const isTasksActive = pathname === "/";
  const isTeamActive = pathname === "/workspace/members" || pathname === "/team";
  const isSettingsActive = pathname === "/settings" || pathname === "/workspace/audit-logs";

  return (
    <nav
      aria-label="Mobile Navigation Dock"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-border/80 bg-background/95 backdrop-blur-xl shadow-2xl pb-[env(safe-area-inset-bottom)] transition-colors"
    >
      <div className="flex h-16 items-center justify-around px-2 max-w-md mx-auto relative">
        {/* 1. Tasks Board Link */}
        <Link
          href="/"
          className={`flex flex-col items-center justify-center min-w-[56px] min-h-[48px] py-1 rounded-xl transition-all cursor-pointer ${
            isTasksActive ? "text-primary font-semibold" : "text-muted-foreground hover:text-foreground"
          }`}
          aria-label="Sprint Tasks"
        >
          <div className={`flex items-center justify-center h-7 w-7 rounded-lg transition-colors ${isTasksActive ? "bg-primary/10" : ""}`}>
            <CheckSquare className="h-4 w-4" />
          </div>
          <span className="text-[10px] mt-0.5">Tasks</span>
        </Link>

        {/* 2. Command Palette Search */}
        <button
          type="button"
          onClick={openCommandPalette}
          className="flex flex-col items-center justify-center min-w-[56px] min-h-[48px] py-1 rounded-xl text-muted-foreground hover:text-foreground transition-all cursor-pointer"
          aria-label="Open Command Search"
        >
          <div className="flex items-center justify-center h-7 w-7 rounded-lg">
            <Search className="h-4 w-4" />
          </div>
          <span className="text-[10px] mt-0.5">Search</span>
        </button>

        {/* 3. Center Elevated FAB: Quick Add Task (Gated for non-viewers) */}
        {!isViewer && (
          <div className="relative -top-3">
            <button
              type="button"
              onClick={() => {
                if (onOpenNewTask) {
                  onOpenNewTask();
                } else {
                  openCommandPalette();
                }
              }}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary-hover active:scale-95 transition-all cursor-pointer border-4 border-background focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              aria-label="Create New Deliverable"
              title="Create Task"
            >
              <Plus className="h-6 w-6 stroke-[2.5]" />
            </button>
          </div>
        )}

        {/* 4. Team Members Link */}
        <Link
          href="/workspace/members"
          className={`flex flex-col items-center justify-center min-w-[56px] min-h-[48px] py-1 rounded-xl transition-all cursor-pointer ${
            isTeamActive ? "text-primary font-semibold" : "text-muted-foreground hover:text-foreground"
          }`}
          aria-label="Team Members"
        >
          <div className={`flex items-center justify-center h-7 w-7 rounded-lg transition-colors ${isTeamActive ? "bg-primary/10" : ""}`}>
            <Users className="h-4 w-4" />
          </div>
          <span className="text-[10px] mt-0.5">Team</span>
        </Link>

        {/* 5. Security or Audit Telemetry */}
        <Link
          href={isAdmin ? "/workspace/audit-logs" : "/settings"}
          className={`flex flex-col items-center justify-center min-w-[56px] min-h-[48px] py-1 rounded-xl transition-all cursor-pointer ${
            isSettingsActive ? "text-primary font-semibold" : "text-muted-foreground hover:text-foreground"
          }`}
          aria-label={isAdmin ? "Audit Telemetry" : "Security Settings"}
        >
          <div className={`flex items-center justify-center h-7 w-7 rounded-lg transition-colors ${isSettingsActive ? "bg-primary/10" : ""}`}>
            {isAdmin ? <Activity className="h-4 w-4" /> : <Shield className="h-4 w-4" />}
          </div>
          <span className="text-[10px] mt-0.5">{isAdmin ? "Audit" : "Security"}</span>
        </Link>
      </div>
    </nav>
  );
}

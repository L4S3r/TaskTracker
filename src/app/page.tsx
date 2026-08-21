"use client";

import React from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { TaskBoard } from "@/components/patterns/task-board";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { CheckSquare, Shield, Users, ArrowRight, Lock } from "lucide-react";

export default function HomePage() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-xs text-muted-foreground">Authenticating session...</p>
        </div>
      </div>
    );
  }

  if (user) {
    return <TaskBoard />;
  }

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center text-center px-4">
      <div className="max-w-3xl space-y-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3.5 py-1 text-xs font-semibold text-primary">
          <Shield className="h-3.5 w-3.5" />
          <span>Secured by Auth N&Z Gateway</span>
        </div>

        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-foreground leading-tight">
          Personal and Team Task Tracking with Enterprise Security
        </h1>

        <p className="text-base text-muted-foreground max-w-xl mx-auto leading-relaxed">
          Create sprint workflows, assign deliverables to team members, and manage access with role-based clearances and multi-factor authentication.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link href="/register">
            <Button size="lg" className="gap-2 w-full sm:w-auto shadow-md">
              <span>Get Started</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link href="/login">
            <Button size="lg" variant="outline" className="w-full sm:w-auto">
              Sign In
            </Button>
          </Link>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-10 text-left">
          <Card className="border-border bg-card">
            <CardHeader className="p-4 space-y-1">
              <CheckSquare className="h-5 w-5 text-primary mb-1" />
              <CardTitle className="text-sm font-bold">Kanban Workflows</CardTitle>
              <CardDescription className="text-xs">
                To Do, In Progress, Review, and Completed task states with priority badges and filtering.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-border bg-card">
            <CardHeader className="p-4 space-y-1">
              <Users className="h-5 w-5 text-primary mb-1" />
              <CardTitle className="text-sm font-bold">Team Invitations</CardTitle>
              <CardDescription className="text-xs">
                Invite teammates via automated email notifications and control workspace clearances.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-border bg-card">
            <CardHeader className="p-4 space-y-1">
              <Lock className="h-5 w-5 text-primary mb-1" />
              <CardTitle className="text-sm font-bold">MFA & OAuth 2.0</CardTitle>
              <CardDescription className="text-xs">
                RFC 6238 TOTP authenticators, single-use recovery codes, and Google/GitHub login.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    </div>
  );
}

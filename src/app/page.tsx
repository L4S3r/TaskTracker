"use client";

import React, { Suspense } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { TaskBoard } from "@/components/patterns/task-board";
import { InteractiveLandingDemo } from "@/components/patterns/interactive-landing-demo";
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
    return (
      <Suspense
        fallback={
          <div className="flex min-h-[60vh] items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              <p className="text-xs text-muted-foreground">Loading workspace...</p>
            </div>
          </div>
        }
      >
        <TaskBoard />
      </Suspense>
    );
  }

  return (
    <div className="flex min-h-[75vh] flex-col items-center justify-center text-center px-4 py-8">
      <div className="max-w-4xl space-y-6 w-full">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-semibold text-primary shadow-xs">
          <Shield className="h-3.5 w-3.5" />
          <span>Secured by Auth N&amp;Z Gateway</span>
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-foreground leading-[1.15]">
          Personal and Team Task Tracking with{" "}
          <span className="bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
            Enterprise Security
          </span>
        </h1>

        <p className="text-sm sm:text-base text-muted-foreground max-w-xl mx-auto leading-relaxed">
          Create sprint workflows, assign deliverables to team members, and manage access with role-based clearances and multi-factor authentication.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link href="/register">
            <Button size="lg" className="gap-2 w-full sm:w-auto shadow-md">
              <span>Get Started Free</span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link href="/login">
            <Button size="lg" variant="outline" className="w-full sm:w-auto">
              Sign In
            </Button>
          </Link>
        </div>

        {/* Interactive Live Demo Showcase */}
        <InteractiveLandingDemo />

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 text-left">
          <Card className="border-border/80 bg-card hover:border-primary/40 hover:-translate-y-1 hover:shadow-lg transition-all duration-200">
            <CardHeader className="p-5 space-y-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <CheckSquare className="h-5 w-5" />
              </div>
              <CardTitle className="text-sm font-bold">Kanban Workflows</CardTitle>
              <CardDescription className="text-xs leading-relaxed">
                To Do, In Progress, Review, and Completed task states with priority badges, deadlines, and search filtering.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-border/80 bg-card hover:border-primary/40 hover:-translate-y-1 hover:shadow-lg transition-all duration-200">
            <CardHeader className="p-5 space-y-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500">
                <Users className="h-5 w-5" />
              </div>
              <CardTitle className="text-sm font-bold">Team Invitations</CardTitle>
              <CardDescription className="text-xs leading-relaxed">
                Invite teammates via automated notifications, assign multi-collaborator tasks, and control clearance roles.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-border/80 bg-card hover:border-primary/40 hover:-translate-y-1 hover:shadow-lg transition-all duration-200">
            <CardHeader className="p-5 space-y-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500">
                <Lock className="h-5 w-5" />
              </div>
              <CardTitle className="text-sm font-bold">MFA & OAuth 2.0</CardTitle>
              <CardDescription className="text-xs leading-relaxed">
                RFC 6238 TOTP authenticators, single-use recovery backup codes, and Google/GitHub social login.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    </div>
  );
}

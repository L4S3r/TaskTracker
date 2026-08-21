"use client";

import { useAuth } from "@/lib/auth-context";
import { SecuritySettings } from "@/components/patterns/security-settings";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ShieldAlert } from "lucide-react";

export default function SettingsPage() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-[55vh] items-center justify-center p-4">
        <Card className="max-w-md w-full text-center p-6 border-border/80 shadow-2xl bg-card">
          <CardHeader className="space-y-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500 mx-auto">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <CardTitle className="text-lg font-bold">Authentication Required</CardTitle>
            <CardDescription className="text-xs">You must sign in to manage account security settings.</CardDescription>
          </CardHeader>
          <Link href="/login" className="block pt-2">
            <Button size="lg" className="w-full">Sign In to Continue</Button>
          </Link>
        </Card>
      </div>
    );
  }

  return <SecuritySettings />;
}

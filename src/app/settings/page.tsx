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
      <div className="flex min-h-[50vh] items-center justify-center">
        <Card className="max-w-md text-center p-6 border-border">
          <CardHeader className="space-y-2">
            <ShieldAlert className="h-10 w-10 text-amber-500 mx-auto" />
            <CardTitle>Authentication Required</CardTitle>
            <CardDescription>You must sign in to manage account security settings.</CardDescription>
          </CardHeader>
          <Link href="/login" className="block mt-4">
            <Button className="w-full">Sign In</Button>
          </Link>
        </Card>
      </div>
    );
  }

  return <SecuritySettings />;
}

"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { TeamMember } from "@/lib/tasks-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Modal } from "@/components/ui/modal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { UserPlus, Mail, CheckCircle2, AlertCircle, Send, Trash2, RefreshCw, Copy, Check } from "lucide-react";

export function TeamManager() {
  const { token, user, isAdmin } = useAuth();
  const [members, setMembers] = useState<TeamMember[]>([]);

  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Invite Form State
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "editor" | "viewer">("viewer");
  const [inviteDept, setInviteDept] = useState("Engineering");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [generatedInviteUrl, setGeneratedInviteUrl] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Delete Confirmation State
  const [memberToDelete, setMemberToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchMembers = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      const res = await api.getTeamMembers(token);
      setMembers(res.members || []);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to load team members from server.");
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) {
      setErrorMessage("Please enter an email address to invite.");
      return;
    }
    if (!token) return;

    setIsSubmitting(true);
    setSuccessMessage(null);
    setGeneratedInviteUrl(null);
    setErrorMessage(null);

    try {
      const payload = {
        email: inviteEmail.trim().toLowerCase(),
        role: inviteRole,
        department: inviteDept,
      };

      const res = await api.inviteTeamMember(token, payload);
      setSuccessMessage(res.message || `Invitation dispatched to ${inviteEmail}.`);
      if (res.member?.invite_token) {
        setGeneratedInviteUrl(`${window.location.origin}/invite/accept?token=${res.member.invite_token}`);
      }

      await fetchMembers();
      setInviteEmail("");
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to dispatch invitation.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyInviteLink = () => {
    if (!generatedInviteUrl) return;
    navigator.clipboard.writeText(generatedInviteUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleConfirmDelete = async () => {
    if (!token || !memberToDelete) return;
    setIsDeleting(true);

    const emailToDelete = memberToDelete;
    // Optimistic UI removal
    setMembers((prev) => prev.filter((m) => m.email.toLowerCase() !== emailToDelete.toLowerCase()));

    try {
      await api.removeTeamMember(token, emailToDelete);
      await fetchMembers();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to remove member.");
      await fetchMembers();
    } finally {
      setIsDeleting(false);
      setMemberToDelete(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Team Management</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Real-time registered users, role clearances, and invitation dispatches.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchMembers}
            className="gap-1.5"
            title="Refresh team list"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Refresh</span>
          </Button>

          {isAdmin && (
            <Button
              onClick={() => {
                setGeneratedInviteUrl(null);
                setSuccessMessage(null);
                setErrorMessage(null);
                setIsInviteOpen(true);
              }}
              className="gap-2 shadow-sm"
            >
              <UserPlus className="h-4 w-4" />
              <span>Invite Team Member</span>
            </Button>
          )}
        </div>
      </div>

      {/* Team Roster Card */}
      <Card className="border-border shadow-sm bg-card">
        <CardHeader className="p-5 pb-3">
          <CardTitle className="text-base font-bold">Workspace Members ({members.length})</CardTitle>
          <CardDescription>Live database records of active users and pending invitations.</CardDescription>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading && members.length === 0 ? (
            <div className="flex min-h-[200px] items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-y border-border bg-muted/40 uppercase text-[10px] font-semibold text-muted-foreground">
                  <tr>
                    <th className="px-5 py-3">Member</th>
                    <th className="px-5 py-3">Role</th>
                    <th className="px-5 py-3">Department</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Joined / Invited</th>
                    {isAdmin && <th className="px-5 py-3 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y border-border divide-border/60">
                  {members.map((m) => (
                    <tr key={m.id || m.email} className="hover:bg-muted/30 transition-colors">
                      <td className="px-5 py-3.5 flex items-center gap-3">
                        <Avatar name={m.name || m.email} src={m.avatar_url} size="sm" />
                        <div>
                          <p className="font-semibold text-foreground">{m.name || m.email.split("@")[0]}</p>
                          <p className="text-[11px] text-muted-foreground">{m.email}</p>
                        </div>
                      </td>

                      <td className="px-5 py-3.5">
                        <Badge variant={m.role as any}>{m.role.toUpperCase()}</Badge>
                      </td>

                      <td className="px-5 py-3.5 text-foreground/80 font-medium">{m.department || "General"}</td>

                      <td className="px-5 py-3.5">
                        {m.status === "active" ? (
                          <span className="inline-flex items-center gap-1 text-green-500 font-semibold">
                            <CheckCircle2 className="h-3 w-3" />
                            <span>Active</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-amber-500 font-medium">
                            <Mail className="h-3 w-3" />
                            <span>Invite Sent</span>
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-3.5 text-muted-foreground">
                        {m.invited_at ? new Date(m.invited_at).toLocaleDateString() : "Active Member"}
                      </td>

                      {isAdmin && (
                        <td className="px-5 py-3.5 text-right">
                          {m.email.toLowerCase() !== user?.email?.toLowerCase() ? (
                            <button
                              onClick={() => setMemberToDelete(m.email)}
                              className="text-muted-foreground hover:text-destructive transition-colors p-1"
                              title="Remove member"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          ) : (
                            <span className="text-[10px] text-muted-foreground italic">You</span>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}

                  {members.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-5 py-8 text-center text-muted-foreground">
                        No team members registered yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invite Member Modal */}
      <Modal
        isOpen={isInviteOpen}
        onClose={() => setIsInviteOpen(false)}
        title="Invite New Team Member"
        description="Enter the colleague's email and role. Full name and profile details are automatically synced."
      >
        <form onSubmit={handleInvite} noValidate className="space-y-4 mt-2">

          {errorMessage && (
            <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive font-medium">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 rounded-lg border border-green-500/20 bg-green-500/10 p-3 text-xs text-green-500 font-medium">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>{successMessage}</span>
              </div>

              {generatedInviteUrl && (
                <div className="p-3 rounded-lg border border-border bg-muted/40 space-y-1.5">
                  <span className="text-[11px] font-bold text-foreground">Direct Invitation Link:</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={generatedInviteUrl}
                      className="flex-1 text-[11px] font-mono p-1.5 bg-background border border-input rounded select-all"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleCopyInviteLink}
                      className="gap-1 shrink-0"
                    >
                      {copiedLink ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                      <span>{copiedLink ? "Copied" : "Copy"}</span>
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          <Input
            label="Email Address"
            type="email"
            required
            placeholder="colleague@l4s3r.site"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
          />

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-foreground/80 tracking-wide uppercase">
                Access Role
              </label>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as any)}
                className="flex h-11 w-full rounded-lg border border-input bg-card px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="viewer">Viewer (Clearance 1)</option>
                <option value="editor">Editor (Clearance 2)</option>
                <option value="admin">Admin (Clearance 3)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-foreground/80 tracking-wide uppercase">
                Department
              </label>
              <select
                value={inviteDept}
                onChange={(e) => setInviteDept(e.target.value)}
                className="flex h-11 w-full rounded-lg border border-input bg-card px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="Engineering">Engineering</option>
                <option value="Product">Product</option>
                <option value="Security">Security</option>
                <option value="Finance">Finance</option>
                <option value="Operations">Operations</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button type="button" variant="outline" onClick={() => setIsInviteOpen(false)}>
              Close
            </Button>
            <Button type="submit" isLoading={isSubmitting} className="gap-2">
              <Send className="h-4 w-4" />
              <span>Send Invitation</span>
            </Button>
          </div>
        </form>
      </Modal>

      {/* Custom In-App Member Deletion Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(memberToDelete)}
        onClose={() => setMemberToDelete(null)}
        onConfirm={handleConfirmDelete}
        isLoading={isDeleting}
        title="Remove Workspace Member"
        description={`Are you sure you want to permanently remove ${memberToDelete} from the team workspace? All active sessions will be terminated.`}
        confirmText="Remove Member"
        cancelText="Keep Member"
        variant="destructive"
      />
    </div>
  );
}

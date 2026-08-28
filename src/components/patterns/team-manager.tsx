"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { api } from "@/lib/api";
import { WorkspaceMember, WorkspaceRole } from "@/lib/tasks-store";
import { queryClient, queryKeys } from "@/lib/query-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Modal } from "@/components/ui/modal";
import { CreateWorkspaceModal } from "@/components/patterns/create-workspace-modal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { TeamManagerSkeleton } from "@/components/ui/skeleton";
import {
  UserPlus,
  Mail,
  CheckCircle2,
  AlertCircle,
  Send,
  Trash2,
  RefreshCw,
  Copy,
  Check,
  Building2,
  Shield,
  Clock,
  UserCheck,
  Settings2,
  Plus,
} from "lucide-react";

export function TeamManager() {
  const { token, user, activeWorkspace, workspaces, isAdmin, isSuperAdmin, deleteWorkspace } = useAuth();
  const { toast } = useToast();
  const wsId = activeWorkspace?.id;

  const {
    data: membersData,
    isLoading: isLoadingMembers,
    error: membersError,
  } = useQuery({
    queryKey: queryKeys.workspaceMembers(wsId),
    queryFn: async () => {
      if (!token) return [];
      const res = wsId ? await api.getWorkspaceMembers(token, wsId) : await api.getTeamMembers(token);
      return res.members || [];
    },
    enabled: Boolean(token && (wsId || workspaces.length > 0)),
    staleTime: 5 * 60 * 1000,
  });

  const members: WorkspaceMember[] = useMemo(() => membersData || [], [membersData]);
  const isLoading = isLoadingMembers && members.length === 0;

  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [isCreateWsOpen, setIsCreateWsOpen] = useState(false);

  // Workspace Deletion State
  const [isDeleteWsOpen, setIsDeleteWsOpen] = useState(false);
  const [isDeletingWs, setIsDeletingWs] = useState(false);

  // Invite Form State
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<WorkspaceRole>("viewer");
  const [inviteDept, setInviteDept] = useState("Engineering");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [generatedInviteUrl, setGeneratedInviteUrl] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Role Edit State
  const [memberToEditRole, setMemberToEditRole] = useState<WorkspaceMember | null>(null);
  const [selectedNewRole, setSelectedNewRole] = useState<WorkspaceRole>("viewer");
  const [isUpdatingRole, setIsUpdatingRole] = useState(false);

  // Delete Confirmation State
  const [memberToDelete, setMemberToDelete] = useState<WorkspaceMember | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchMembers = useCallback(async () => {
    if (wsId) {
      queryClient.invalidateQueries({ queryKey: queryKeys.workspaceMembers(wsId) });
    }
  }, [wsId]);

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
        department: inviteDept.trim() || "General",
      };

      const res: any = wsId
        ? await api.inviteWorkspaceMember(token, wsId, payload)
        : await api.inviteTeamMember(token, payload);

      const successMsg = res.message || `Transactional invitation dispatched to ${inviteEmail}.`;
      setSuccessMessage(successMsg);
      toast.success("Invitation Sent", `Dispatched invitation to ${inviteEmail}.`);

      const tokenString = res.invite_token || (res.member && res.member.invite_token);
      if (tokenString) {
        setGeneratedInviteUrl(`${window.location.origin}/invite/accept?token=${encodeURIComponent(tokenString)}`);
      } else if (res.invite_url) {
        setGeneratedInviteUrl(res.invite_url);
      }

      queryClient.invalidateQueries({ queryKey: queryKeys.workspaceMembers(wsId) });
      setInviteEmail("");
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to dispatch invitation.");
      toast.error("Invitation Failed", err.message || "Could not dispatch invitation.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyInviteLink = () => {
    if (!generatedInviteUrl) return;
    navigator.clipboard.writeText(generatedInviteUrl);
    setCopiedLink(true);
    toast.info("Link Copied", "Invitation link copied to clipboard.");
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleOpenRoleModal = (m: WorkspaceMember) => {
    setMemberToEditRole(m);
    setSelectedNewRole((m.role as WorkspaceRole) || "viewer");
  };

  const handleSaveRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !memberToEditRole || !activeWorkspace?.id) return;
    setIsUpdatingRole(true);
    setErrorMessage(null);

    const memberIdOrEmail = memberToEditRole.id || memberToEditRole.email;

    // Optimistic UI update
    queryClient.setQueryData(queryKeys.workspaceMembers(activeWorkspace.id), (old: any) => {
      const currentList: WorkspaceMember[] = Array.isArray(old) ? old : old?.members || [];
      const updated = currentList.map((m) =>
        m.id === memberToEditRole.id || m.email === memberToEditRole.email ? { ...m, role: selectedNewRole } : m
      );
      return Array.isArray(old) ? updated : { ...old, members: updated };
    });

    try {
      await api.updateWorkspaceMemberRole(token, activeWorkspace.id, memberIdOrEmail, selectedNewRole);
      toast.success("Clearance Updated", `Updated ${memberToEditRole.name || memberToEditRole.email} to ${selectedNewRole.toUpperCase()}.`);
      setMemberToEditRole(null);
      queryClient.invalidateQueries({ queryKey: queryKeys.workspaceMembers(activeWorkspace.id) });
    } catch (err: any) {
      queryClient.invalidateQueries({ queryKey: queryKeys.workspaceMembers(activeWorkspace.id) });
      setErrorMessage(err.message || "Failed to update member role.");
      toast.error("Update Failed", err.message || "Could not update clearance.");
    } finally {
      setIsUpdatingRole(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!token || !memberToDelete) return;
    setIsDeleting(true);

    const memberIdOrEmail = memberToDelete.id || memberToDelete.email;
    const memberName = memberToDelete.name || memberToDelete.email;

    // Optimistic UI removal
    queryClient.setQueryData(queryKeys.workspaceMembers(wsId), (old: any) => {
      const currentList: WorkspaceMember[] = Array.isArray(old) ? old : old?.members || [];
      const updated = currentList.filter(
        (m) => m.email.toLowerCase() !== memberToDelete.email.toLowerCase() && m.id !== memberToDelete.id
      );
      return Array.isArray(old) ? updated : { ...old, members: updated };
    });

    try {
      if (wsId) {
        await api.removeWorkspaceMember(token, wsId, memberIdOrEmail);
      } else {
        await api.removeTeamMember(token, memberToDelete.email);
      }
      toast.success("Member Removed", `${memberName} was removed from workspace.`);
      setSuccessMessage("Member removed from workspace");
      setTimeout(() => setSuccessMessage(null), 3500);
      queryClient.invalidateQueries({ queryKey: queryKeys.workspaceMembers(wsId) });
    } catch (err: any) {
      queryClient.invalidateQueries({ queryKey: queryKeys.workspaceMembers(wsId) });
      setErrorMessage(err.message || "Failed to remove member.");
      toast.error("Removal Failed", err.message || "Could not remove member.");
    } finally {
      setIsDeleting(false);
      setMemberToDelete(null);
    }
  };

  const handleDeleteWorkspace = async () => {
    if (!activeWorkspace) return;
    setIsDeletingWs(true);
    try {
      await deleteWorkspace(activeWorkspace.id);
      toast.success("Workspace Deleted", `"${activeWorkspace.name}" was permanently removed.`);
      setIsDeleteWsOpen(false);
    } catch (err: any) {
      toast.error("Deletion Failed", err.message || "Failed to delete workspace.");
    } finally {
      setIsDeletingWs(false);
    }
  };

  const activeCount = members.filter((m) => m.status === "active").length;
  const invitedCount = members.filter((m) => m.status === "invited" || m.status === "pending").length;

  if (!activeWorkspace && workspaces.length === 0) {
    return (
      <div className="flex min-h-[65vh] items-center justify-center p-4">
        <Card className="max-w-md w-full text-center p-6 sm:p-8 border-border/80 shadow-2xl bg-card animate-in fade-in-50 zoom-in-95 duration-200">
          <CardHeader className="space-y-3 pb-2">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary mx-auto border border-primary/20 shadow-xs">
              <Building2 className="h-8 w-8" />
            </div>
            <CardTitle className="text-xl font-bold text-foreground">
              Welcome! You are not a member of any workspace yet.
            </CardTitle>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Create your first workspace to start collaborating and managing team clearances.
            </p>
          </CardHeader>
          <CardContent className="pt-4 space-y-3">
            <Button
              size="lg"
              onClick={() => setIsCreateWsOpen(true)}
              className="w-full gap-2 shadow-md text-sm font-semibold"
            >
              <Plus className="h-4 w-4" />
              <span>+ Create a Workspace</span>
            </Button>
          </CardContent>
        </Card>

        <CreateWorkspaceModal
          isOpen={isCreateWsOpen}
          onClose={() => setIsCreateWsOpen(false)}
        />
      </div>
    );
  }

  if (isLoading) {
    return <TeamManagerSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {activeWorkspace?.name ? `${activeWorkspace.name} Team` : "Workspace Team Management"}
            </h1>
            <Badge variant="outline" className="text-xs">
              Multi-Tenant Scoped
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage workspace collaborator clearances, roles, and pending invitation dispatches.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchMembers}
            className="gap-1.5"
            title="Refresh member roster"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
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
              size="sm"
            >
              <UserPlus className="h-4 w-4" />
              <span>Invite Colleague</span>
            </Button>
          )}

          {isAdmin && activeWorkspace && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsDeleteWsOpen(true)}
              className="gap-1.5 text-destructive hover:bg-destructive/10 border-destructive/30 hover:border-destructive/60"
              title="Delete workspace"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Delete Workspace</span>
            </Button>
          )}
        </div>
      </div>

      {errorMessage && (
        <div className="flex items-center gap-2 rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive font-medium">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Team Metrics Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="flex items-center justify-between p-3.5 rounded-xl border border-border/70 bg-card/60 shadow-xs">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Workspace Members</p>
            <p className="text-xl font-bold text-foreground mt-0.5">{members.length}</p>
          </div>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Building2 className="h-4 w-4" />
          </div>
        </div>

        <div className="flex items-center justify-between p-3.5 rounded-xl border border-border/70 bg-card/60 shadow-xs">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Active Roster</p>
            <p className="text-xl font-bold text-emerald-500 mt-0.5">{activeCount}</p>
          </div>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
            <CheckCircle2 className="h-4 w-4" />
          </div>
        </div>

        <div className="flex items-center justify-between p-3.5 rounded-xl border border-border/70 bg-card/60 shadow-xs">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Pending Invitations</p>
            <p className="text-xl font-bold text-amber-500 mt-0.5">{invitedCount}</p>
          </div>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500">
            <Mail className="h-4 w-4" />
          </div>
        </div>
      </div>

      {/* Member Directory Table */}
      <Card className="border-border/80 shadow-sm bg-card overflow-hidden">
        <CardHeader className="p-4 sm:p-5 pb-3">
          <CardTitle className="text-base font-bold">Workspace Members & Clearances ({members.length})</CardTitle>
          <CardDescription>Live database records of active users and pending invitations in {activeWorkspace?.name || "this workspace"}.</CardDescription>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading && members.length === 0 ? (
            <div className="flex min-h-[220px] items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-3 border-primary border-t-transparent" />
            </div>
          ) : (
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left text-xs">
                <thead className="border-y border-border/80 bg-muted/40 uppercase text-[10px] font-semibold text-muted-foreground">
                  <tr>
                    <th className="px-5 py-3">Member</th>
                    <th className="px-5 py-3">Department</th>
                    <th className="px-5 py-3">Role Badge</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Joined / Invited</th>
                    {isAdmin && <th className="px-5 py-3 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y border-border/60 divide-border/60">
                  {members.map((m) => {
                    const isSelf = m.email.toLowerCase() === user?.email?.toLowerCase();
                    const roleKey = (m.role || "viewer").toLowerCase();
                    return (
                      <tr key={m.id || m.email} className="hover:bg-muted/30 transition-colors">
                        {/* Member Column */}
                        <td className="px-5 py-3.5 flex items-center gap-3">
                          <Avatar name={m.name || m.username || m.email} src={m.avatar_url} size="sm" />
                          <div>
                            <div className="flex items-center gap-1.5">
                              <p className="font-semibold text-foreground leading-tight">
                                {m.name || (m.username ? `@${m.username}` : m.email)}
                              </p>
                              {isSelf && (
                                <span className="text-[10px] text-primary bg-primary/10 px-1.5 py-0.2 rounded font-semibold">You</span>
                              )}
                            </div>
                            <p className="text-[11px] text-muted-foreground">{m.email}</p>
                            {m.username && m.name && (
                              <p className="text-[10px] text-muted-foreground/70 font-mono">@{m.username}</p>
                            )}
                          </div>
                        </td>

                        {/* Department */}
                        <td className="px-5 py-3.5 text-foreground/80 font-medium">{m.department || "General"}</td>

                        {/* Role Badge */}
                        <td className="px-5 py-3.5">
                          <Badge variant={roleKey as any} className="uppercase text-[10px]">
                            {roleKey}
                          </Badge>
                        </td>

                        {/* Status */}
                        <td className="px-5 py-3.5">
                          {m.status === "active" ? (
                            <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20 text-[10px]">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              <span>Active</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-medium bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20 text-[10px]" title={m.expires_at ? `Expires: ${new Date(m.expires_at).toLocaleDateString()}` : undefined}>
                              <Clock className="h-3 w-3" />
                              <span>Invited / Pending</span>
                            </span>
                          )}
                        </td>

                        {/* Joined / Invited */}
                        <td className="px-5 py-3.5 text-muted-foreground">
                          {m.invited_at || m.invitedAt
                            ? `Invited ${new Date(m.invited_at || m.invitedAt!).toLocaleDateString()}`
                            : m.joined_at
                              ? `Joined ${new Date(m.joined_at).toLocaleDateString()}`
                              : "Active Member"}
                        </td>

                        {/* Actions (Admins Only) */}
                        {isAdmin && (
                          <td className="px-5 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-1">
                              {!isSelf && (
                                <>
                                  <button
                                    onClick={() => handleOpenRoleModal(m)}
                                    className="text-muted-foreground hover:text-primary transition-colors min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-xl hover:bg-primary/10 cursor-pointer"
                                    title="Change member role"
                                    aria-label={`Change role for ${m.name || m.email}`}
                                  >
                                    <Settings2 className="h-4 w-4" />
                                  </button>

                                  <button
                                    onClick={() => setMemberToDelete(m)}
                                    className="text-muted-foreground hover:text-destructive transition-colors min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-xl hover:bg-destructive/10 cursor-pointer"
                                    title="Remove member"
                                    aria-label={`Remove member ${m.name || m.email}`}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}

                  {members.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-5 py-12 text-center text-muted-foreground">
                        No team members registered in this workspace yet.
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
        title="Invite Colleague to Workspace"
        description={`Send a scoped invitation link to collaborate on ${activeWorkspace?.name || "this workspace"}.`}
      >
        <form onSubmit={handleInvite} noValidate className="space-y-4 pt-1">
          {errorMessage && (
            <div className="flex items-center gap-2 rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive font-medium">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>{successMessage}</span>
              </div>

              {generatedInviteUrl && (
                <div className="p-3 rounded-xl border border-border bg-secondary/40 space-y-1.5">
                  <span className="text-[11px] font-bold text-foreground">Direct Invitation Link:</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={generatedInviteUrl}
                      className="flex-1 text-[11px] font-mono p-1.5 bg-card border border-input rounded-lg select-all"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleCopyInviteLink}
                      className="gap-1 shrink-0"
                    >
                      {copiedLink ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
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
            placeholder="example@domain.com"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-foreground/80 tracking-wide uppercase">
                Clearance Role
              </label>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as WorkspaceRole)}
                className="flex h-10 w-full rounded-lg border border-input bg-background dark:bg-slate-900/80 px-3 py-2 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary cursor-pointer transition-colors [&>option]:bg-card dark:[&>option]:bg-slate-900 [&>option]:text-foreground"
              >
                <option value="viewer">Viewer (Read-Only)</option>
                <option value="editor">Editor (Manage Tasks)</option>
                <option value="developer">Developer (Create & Edit)</option>
                <option value="admin">Admin (Full Workspace Management)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-foreground/80 tracking-wide uppercase">
                Department
              </label>
              <select
                value={inviteDept}
                onChange={(e) => setInviteDept(e.target.value)}
                className="flex h-10 w-full rounded-lg border border-input bg-background dark:bg-slate-900/80 px-3 py-2 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary cursor-pointer transition-colors [&>option]:bg-card dark:[&>option]:bg-slate-900 [&>option]:text-foreground"
              >
                <option value="Engineering">Engineering</option>
                <option value="Product">Product</option>
                <option value="Design">Design</option>
                <option value="Security">Security</option>
                <option value="Finance">Finance</option>
                <option value="Operations">Operations</option>
                <option value="General">General</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-border/70">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsInviteOpen(false)}>
              Close
            </Button>
            <Button type="submit" size="sm" isLoading={isSubmitting} className="gap-2">
              <Send className="h-4 w-4" />
              <span>Dispatch Invitation</span>
            </Button>
          </div>
        </form>
      </Modal>

      {/* Change Role Modal */}
      <Modal
        isOpen={Boolean(memberToEditRole)}
        onClose={() => setMemberToEditRole(null)}
        title="Modify Member Clearance"
        description={`Update role permissions for ${memberToEditRole?.name || memberToEditRole?.email}.`}
      >
        <form onSubmit={handleSaveRole} className="space-y-4 pt-1">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-foreground/80 tracking-wide uppercase">
              Assigned Clearance Role
            </label>
            <select
              value={selectedNewRole}
              onChange={(e) => setSelectedNewRole(e.target.value as WorkspaceRole)}
              className="flex h-10 w-full rounded-lg border border-input bg-background dark:bg-slate-900/80 px-3 py-2 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary cursor-pointer transition-colors [&>option]:bg-card dark:[&>option]:bg-slate-900 [&>option]:text-foreground"
            >
              <option value="viewer">Viewer (Read-Only)</option>
              <option value="editor">Editor (Manage Tasks)</option>
              <option value="developer">Developer (Create & Edit Deliverables)</option>
              <option value="admin">Admin (Full Workspace Management)</option>
            </select>
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-border/70">
            <Button type="button" variant="outline" size="sm" onClick={() => setMemberToEditRole(null)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" isLoading={isUpdatingRole}>
              Update Role
            </Button>
          </div>
        </form>
      </Modal>

      {/* Member Deletion Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(memberToDelete)}
        onClose={() => setMemberToDelete(null)}
        onConfirm={handleConfirmDelete}
        isLoading={isDeleting}
        title="Remove Member from Workspace"
        description={`Are you sure you want to revoke ${memberToDelete?.name || memberToDelete?.email}'s access to "${activeWorkspace?.name || "this workspace"}"?`}
        confirmText="Remove Member"
        cancelText="Cancel"
        variant="destructive"
      />

      {/* Workspace Deletion Confirmation Dialog */}
      <ConfirmDialog
        isOpen={isDeleteWsOpen}
        onClose={() => setIsDeleteWsOpen(false)}
        onConfirm={handleDeleteWorkspace}
        isLoading={isDeletingWs}
        title="Delete Workspace"
        description={`Are you sure you want to permanently delete "${activeWorkspace?.name}"? All sprint deliverables and collaborator clearances in this workspace will be removed. This action cannot be undone.`}
        confirmText="Delete Workspace"
        cancelText="Cancel"
        variant="destructive"
      />
    </div>
  );
}

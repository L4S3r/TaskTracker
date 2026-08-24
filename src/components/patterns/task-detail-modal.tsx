"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Task, TaskPriority, TaskStatus, TeamMember } from "@/lib/tasks-store";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { api } from "@/lib/api";
import { AlertCircle, Calendar, Trash2, CheckCircle2, Clock, Users, Tag, Check, Lock } from "lucide-react";

interface TaskDetailModalProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
  onTaskUpdated: () => void;
  onTaskDeleted: (taskId: string) => void;
  members: TeamMember[];
}

const PRIORITIES: { id: TaskPriority; label: string; activeClass: string; inactiveClass: string }[] = [
  { id: "low", label: "Low", activeClass: "bg-slate-500/20 text-slate-300 border-slate-500/50 ring-1 ring-slate-500/30", inactiveClass: "bg-muted/40 text-muted-foreground border-border/60 hover:bg-muted" },
  { id: "medium", label: "Medium", activeClass: "bg-amber-500/20 text-amber-400 border-amber-500/50 ring-1 ring-amber-500/30", inactiveClass: "bg-muted/40 text-muted-foreground border-border/60 hover:bg-muted" },
  { id: "high", label: "High", activeClass: "bg-orange-500/20 text-orange-400 border-orange-500/50 ring-1 ring-orange-500/30", inactiveClass: "bg-muted/40 text-muted-foreground border-border/60 hover:bg-muted" },
  { id: "urgent", label: "Urgent", activeClass: "bg-rose-500/20 text-rose-400 border-rose-500/50 ring-1 ring-rose-500/30", inactiveClass: "bg-muted/40 text-muted-foreground border-border/60 hover:bg-muted" },
];

export function TaskDetailModal({
  task,
  isOpen,
  onClose,
  onTaskUpdated,
  onTaskDeleted,
  members,
}: TaskDetailModalProps) {
  const { token, user, activeWorkspace, isAdmin, isDeveloper, isEditor, isViewer } = useAuth();
  const { toast } = useToast();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<TaskStatus>("todo");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [dueDate, setDueDate] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [selectedAssignees, setSelectedAssignees] = useState<{ email: string; name: string; avatar_url?: string }[]>([]);

  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (task) {
      setTitle(task.title || "");
      setDescription(task.description || "");
      setStatus(task.status || "todo");
      setPriority(task.priority || "medium");
      setDueDate(task.due_date || task.dueDate || "");
      setTagsInput(task.tags ? task.tags.join(", ") : "");

      // Populate assignees
      if (task.assignees && task.assignees.length > 0) {
        setSelectedAssignees(task.assignees);
      } else if (task.assignee_email) {
        setSelectedAssignees([
          {
            email: task.assignee_email,
            name: task.assignee_name || task.assignee_email.split("@")[0],
            avatar_url: task.assignee_avatar,
          },
        ]);
      } else {
        setSelectedAssignees([]);
      }
      setError(null);
      setShowDeleteConfirm(false);
    }
  }, [task]);

  if (!task) return null;

  // RBAC Permission checks
  const canEdit = !isViewer;
  const isOwner =
    task.created_by?.toLowerCase() === user?.email?.toLowerCase() ||
    task.created_by === user?.id ||
    task.created_by === user?.username;
  const canDelete = isAdmin || ((isDeveloper || isEditor) && isOwner);

  // Resolve assigner's real username & profile photo
  const creatorMember = members.find(
    (m) => m.email.toLowerCase() === (task.created_by || "").toLowerCase() || m.id === task.created_by
  );
  const creatorDisplayName =
    creatorMember?.name ||
    (isOwner ? user?.metadata?.name || user?.username : task.created_by?.split("@")[0] || "Workspace Member");
  const creatorAvatar = creatorMember?.avatar_url || (isOwner ? user?.metadata?.avatar_url : undefined);

  const handleToggleAssignee = (member: TeamMember) => {
    if (!canEdit) return;
    const exists = selectedAssignees.some((a) => a.email.toLowerCase() === member.email.toLowerCase());
    if (exists) {
      setSelectedAssignees((prev) => prev.filter((a) => a.email.toLowerCase() !== member.email.toLowerCase()));
    } else {
      setSelectedAssignees((prev) => [
        ...prev,
        {
          email: member.email,
          name: member.name || member.email.split("@")[0],
          avatar_url: member.avatar_url,
        },
      ]);
    }
  };

  const setQuickDeadline = (preset: "today" | "tomorrow" | "friday" | "next_week") => {
    if (!canEdit) return;
    const d = new Date();
    if (preset === "today") {
      // today
    } else if (preset === "tomorrow") {
      d.setDate(d.getDate() + 1);
    } else if (preset === "friday") {
      const day = d.getDay();
      const diff = (5 - day + 7) % 7 || 7;
      d.setDate(d.getDate() + diff);
    } else if (preset === "next_week") {
      const day = d.getDay();
      const diff = (1 - day + 7) % 7 || 7;
      d.setDate(d.getDate() + diff);
    }
    const iso = d.toISOString().split("T")[0];
    setDueDate(iso);
  };

  const handleSaveChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) return;
    if (!title.trim()) {
      setError("Task title cannot be blank.");
      return;
    }
    if (!token) return;

    setIsSaving(true);
    setError(null);

    const tags = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    try {
      await api.updateTask(token, task.id, {
        title: title.trim(),
        description: description.trim(),
        status,
        priority,
        due_date: dueDate || undefined,
        tags,
        assignees: selectedAssignees,
        assignee_email: selectedAssignees.length > 0 ? selectedAssignees[0].email : undefined,
        assignee_name: selectedAssignees.length > 0 ? selectedAssignees[0].name : undefined,
      });

      toast.success("Task Updated", `Changes to "${title.trim()}" saved.`);
      onTaskUpdated();
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to update task.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!token || !canDelete) return;
    setIsDeleting(true);
    try {
      await api.deleteTask(token, task.id);
      toast.success("Task Deleted", `"${task.title}" was deleted.`);
      onTaskDeleted(task.id);
      setShowDeleteConfirm(false);
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to delete task.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Task Deliverable Details"
        description={
          canEdit
            ? "Inspect and update task specifications, assignees, deadlines, and status."
            : "Read-only view of task specifications (Viewer clearance)."
        }
      >
        <form onSubmit={handleSaveChanges} noValidate className="space-y-4 pt-1">
          {error && (
            <div className="flex items-center gap-2 rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive font-medium">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {!canEdit && (
            <div className="flex items-center gap-2 rounded-xl border border-border/80 bg-secondary/40 p-2.5 text-xs text-muted-foreground">
              <Lock className="h-3.5 w-3.5 text-muted-foreground" />
              <span>You have Viewer clearance. Task modifications are restricted.</span>
            </div>
          )}

          {/* Task Title */}
          <Input
            label="Title"
            type="text"
            required
            disabled={!canEdit}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Task title..."
          />

          {/* Priority Segmented Controls */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-foreground/80 tracking-wide uppercase">
              Priority Level
            </label>
            <div className="grid grid-cols-4 gap-2">
              {PRIORITIES.map((p) => {
                const isSelected = priority === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    disabled={!canEdit}
                    onClick={() => setPriority(p.id)}
                    className={`flex items-center justify-center py-2 px-3 rounded-lg border text-xs font-bold transition-all ${
                      canEdit ? "cursor-pointer" : "cursor-default opacity-70"
                    } ${isSelected ? p.activeClass : p.inactiveClass}`}
                  >
                    <span>{p.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Status Select */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-foreground/80 tracking-wide uppercase">
              Current Stage
            </label>
            <select
              value={status}
              disabled={!canEdit}
              onChange={(e) => setStatus(e.target.value as TaskStatus)}
              className="flex h-10 w-full rounded-lg border border-input bg-background dark:bg-slate-900/80 px-3 py-2 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary cursor-pointer transition-colors disabled:opacity-60 disabled:cursor-not-allowed [&>option]:bg-card dark:[&>option]:bg-slate-900 [&>option]:text-foreground"
            >
              <option value="todo">To Do</option>
              <option value="in_progress">In Progress</option>
              <option value="done">Completed</option>
            </select>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-foreground/80 tracking-wide uppercase">
              Description
            </label>
            <textarea
              rows={3}
              disabled={!canEdit}
              className="flex w-full rounded-lg border border-input bg-background dark:bg-slate-900/80 px-3.5 py-2 text-sm text-foreground placeholder:text-muted-foreground transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary custom-scrollbar resize-none disabled:opacity-60 disabled:cursor-not-allowed"
              placeholder="Detailed specifications, instructions, or deliverables..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Group / Multi-Assignee Selection */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-foreground/80 tracking-wide uppercase">
                Assigned Personnel ({selectedAssignees.length})
              </label>
              {canEdit && (
                <span className="text-[10px] text-muted-foreground">
                  Select {activeWorkspace?.name || "workspace"} members
                </span>
              )}
            </div>

            <div className="max-h-36 overflow-y-auto custom-scrollbar rounded-xl border border-border/80 bg-secondary/30 p-2 space-y-1">
              {members.filter((m) => m.status === "active" || !m.status).map((m) => {
                const isSelected = selectedAssignees.some((a) => a.email.toLowerCase() === m.email.toLowerCase());
                return (
                  <button
                    key={m.email}
                    type="button"
                    disabled={!canEdit}
                    onClick={() => handleToggleAssignee(m)}
                    className={`flex w-full items-center justify-between p-2 rounded-lg text-xs transition-all ${
                      canEdit ? "cursor-pointer" : "cursor-default"
                    } ${
                      isSelected
                        ? "bg-primary/10 border border-primary/40 text-foreground"
                        : "hover:bg-muted/60 border border-transparent text-foreground/80"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Avatar name={m.name || m.username || m.email} src={m.avatar_url} size="sm" />
                      <div className="text-left">
                        <p className="font-semibold text-foreground leading-tight">
                          {m.name || (m.username ? `@${m.username}` : m.email)}
                        </p>
                        <p className="text-[10px] text-muted-foreground">{m.email} &bull; {m.role}</p>
                      </div>
                    </div>

                    {isSelected && (
                      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xs">
                        <Check className="h-3 w-3" />
                      </div>
                    )}
                  </button>
                );
              })}

              {members.length === 0 && (
                <p className="text-[11px] text-muted-foreground p-3 text-center">No workspace members found.</p>
              )}
            </div>
          </div>

          {/* Target Deadline with Quick Presets */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-foreground/80 tracking-wide uppercase">
                Target Deadline
              </label>
              {canEdit && (
                <div className="flex items-center gap-1 text-[10px]">
                  <button
                    type="button"
                    onClick={() => setQuickDeadline("today")}
                    className="px-1.5 py-0.5 rounded bg-muted/80 hover:bg-primary/10 hover:text-primary transition-colors text-muted-foreground cursor-pointer font-medium"
                  >
                    Today
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickDeadline("tomorrow")}
                    className="px-1.5 py-0.5 rounded bg-muted/80 hover:bg-primary/10 hover:text-primary transition-colors text-muted-foreground cursor-pointer font-medium"
                  >
                    Tomorrow
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickDeadline("friday")}
                    className="px-1.5 py-0.5 rounded bg-muted/80 hover:bg-primary/10 hover:text-primary transition-colors text-muted-foreground cursor-pointer font-medium"
                  >
                    Friday
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickDeadline("next_week")}
                    className="px-1.5 py-0.5 rounded bg-muted/80 hover:bg-primary/10 hover:text-primary transition-colors text-muted-foreground cursor-pointer font-medium"
                  >
                    Next Mon
                  </button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                type="date"
                disabled={!canEdit}
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />

              <Input
                type="text"
                disabled={!canEdit}
                placeholder="e.g. Frontend, Auth, API"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
              />
            </div>
          </div>

          {/* Assigner & Metadata Banner */}
          <div className="rounded-xl border border-border/70 bg-secondary/30 p-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Avatar name={creatorDisplayName} src={creatorAvatar} size="sm" />
              <div>
                <p className="text-xs font-semibold text-foreground">Created By: {creatorDisplayName}</p>
                <p className="text-[10px] text-muted-foreground">
                  {task.created_at ? new Date(task.created_at).toLocaleString() : "Recently created"}
                </p>
              </div>
            </div>
            <Badge variant={task.priority as any} className="text-[10px] font-bold tracking-wider">
              {task.priority.toUpperCase()}
            </Badge>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-3 border-t border-border/70">
            <div>
              {canDelete && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="gap-1.5 text-destructive hover:bg-destructive/10 border-destructive/30 hover:border-destructive/50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Delete</span>
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={onClose}>
                {canEdit ? "Cancel" : "Close"}
              </Button>
              {canEdit && (
                <Button type="submit" size="sm" isLoading={isSaving}>
                  Save Changes
                </Button>
              )}
            </div>
          </div>
        </form>
      </Modal>

      {/* In-App Delete Confirmation Modal */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleConfirmDelete}
        isLoading={isDeleting}
        title="Delete Task Deliverable"
        description={`Are you sure you want to permanently delete "${task.title}" from this workspace? This action cannot be undone.`}
        confirmText="Delete Task"
        cancelText="Cancel"
        variant="destructive"
      />
    </>
  );
}

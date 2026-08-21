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
import { api } from "@/lib/api";
import { AlertCircle, Calendar, Trash2, CheckCircle2, Clock, Users, Tag, Check, UserPlus } from "lucide-react";

interface TaskDetailModalProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
  onTaskUpdated: () => void;
  onTaskDeleted: (taskId: string) => void;
  members: TeamMember[];
}

export function TaskDetailModal({
  task,
  isOpen,
  onClose,
  onTaskUpdated,
  onTaskDeleted,
  members,
}: TaskDetailModalProps) {
  const { token, user } = useAuth();

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
        setSelectedAssignees([{
          email: task.assignee_email,
          name: task.assignee_name || task.assignee_email.split("@")[0],
          avatar_url: task.assignee_avatar,
        }]);
      } else {
        setSelectedAssignees([]);
      }
      setError(null);
      setShowDeleteConfirm(false);
    }
  }, [task]);

  if (!task) return null;

  // Resolve assigner's real username & profile photo
  const creatorMember = members.find(
    (m) => m.email.toLowerCase() === (task.created_by || "").toLowerCase() || m.id === task.created_by
  );
  const creatorDisplayName =
    creatorMember?.name ||
    (task.created_by?.toLowerCase() === user?.email?.toLowerCase()
      ? user?.metadata?.name || user?.username
      : task.created_by?.split("@")[0] || "Workspace Member");
  const creatorAvatar =
    creatorMember?.avatar_url ||
    (task.created_by?.toLowerCase() === user?.email?.toLowerCase()
      ? user?.metadata?.avatar_url
      : undefined);

  const handleToggleAssignee = (member: TeamMember) => {
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

  const handleSaveChanges = async (e: React.FormEvent) => {
    e.preventDefault();
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
        due_date: dueDate || null,
        tags,
        assignees: selectedAssignees,
        assignee_email: selectedAssignees.length > 0 ? selectedAssignees[0].email : null,
        assignee_name: selectedAssignees.length > 0 ? selectedAssignees[0].name : null,
      });

      onTaskUpdated();
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to update task.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!token) return;
    setIsDeleting(true);
    try {
      await api.deleteTask(token, task.id);
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
        description="Inspect task specifications, assigned personnel, deadlines, and progress."
      >
        <form onSubmit={handleSaveChanges} noValidate className="space-y-4 pt-1">
          {error && (
            <div className="flex items-center gap-2 rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive font-medium">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Task Title */}
          <Input
            label="Title"
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Task title..."
          />

          {/* Status & Priority Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-foreground/80 tracking-wide uppercase">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as TaskStatus)}
                className="flex h-10 w-full rounded-lg border border-input bg-background dark:bg-slate-900/80 px-3 py-2 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary cursor-pointer transition-colors [&>option]:bg-card dark:[&>option]:bg-slate-900 [&>option]:text-foreground"
              >
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="review">In Review</option>
                <option value="done">Completed</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-foreground/80 tracking-wide uppercase">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className="flex h-10 w-full rounded-lg border border-input bg-background dark:bg-slate-900/80 px-3 py-2 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary cursor-pointer transition-colors [&>option]:bg-card dark:[&>option]:bg-slate-900 [&>option]:text-foreground"
              >
                <option value="low">Low Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="high">High Priority</option>
                <option value="urgent">Urgent Priority</option>
              </select>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-foreground/80 tracking-wide uppercase">
              Description
            </label>
            <textarea
              rows={3}
              className="flex w-full rounded-lg border border-input bg-background dark:bg-slate-900/80 px-3.5 py-2 text-sm text-foreground placeholder:text-muted-foreground transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary custom-scrollbar resize-none"
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
              <span className="text-[10px] text-muted-foreground">Select team members to collaborate</span>
            </div>

            <div className="max-h-36 overflow-y-auto custom-scrollbar rounded-xl border border-border/80 bg-secondary/30 p-2 space-y-1">
              {members.map((m) => {
                const isSelected = selectedAssignees.some((a) => a.email.toLowerCase() === m.email.toLowerCase());
                return (
                  <button
                    key={m.email}
                    type="button"
                    onClick={() => handleToggleAssignee(m)}
                    className={`flex w-full items-center justify-between p-2 rounded-lg text-xs transition-all cursor-pointer ${
                      isSelected
                        ? "bg-primary/10 border border-primary/40 text-foreground"
                        : "hover:bg-muted/60 border border-transparent text-foreground/80"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Avatar name={m.name || m.email} src={m.avatar_url} size="sm" />
                      <div className="text-left">
                        <p className="font-semibold text-foreground leading-tight">{m.name || m.email.split("@")[0]}</p>
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

          {/* Target Deadline and Tags Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Target Deadline"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />

            <Input
              label="Tags (comma separated)"
              type="text"
              placeholder="e.g. Frontend, Auth, API"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
            />
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
            <Badge variant="secondary" className="text-[10px] font-bold tracking-wider">
              {task.priority.toUpperCase()}
            </Badge>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-3 border-t border-border/70">
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

            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" size="sm" isLoading={isSaving}>
                Save Changes
              </Button>
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
        description={`Are you sure you want to permanently delete "${task.title}" from the task board? This action cannot be undone.`}
        confirmText="Delete Task"
        cancelText="Cancel"
        variant="destructive"
      />
    </>
  );
}

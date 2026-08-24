"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { TaskPriority, TaskStatus, TeamMember, WorkspaceMember } from "@/lib/tasks-store";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { api } from "@/lib/api";
import { AlertCircle, Check, Building2, Search, Calendar, Zap } from "lucide-react";

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTaskCreated: () => void;
  members: TeamMember[];
}

const PRIORITIES: { id: TaskPriority; label: string; activeClass: string; inactiveClass: string }[] = [
  { id: "low", label: "Low", activeClass: "bg-slate-500/20 text-slate-300 border-slate-500/50 ring-1 ring-slate-500/30", inactiveClass: "bg-muted/40 text-muted-foreground border-border/60 hover:bg-muted" },
  { id: "medium", label: "Medium", activeClass: "bg-amber-500/20 text-amber-400 border-amber-500/50 ring-1 ring-amber-500/30", inactiveClass: "bg-muted/40 text-muted-foreground border-border/60 hover:bg-muted" },
  { id: "high", label: "High", activeClass: "bg-orange-500/20 text-orange-400 border-orange-500/50 ring-1 ring-orange-500/30", inactiveClass: "bg-muted/40 text-muted-foreground border-border/60 hover:bg-muted" },
  { id: "urgent", label: "Urgent", activeClass: "bg-rose-500/20 text-rose-400 border-rose-500/50 ring-1 ring-rose-500/30", inactiveClass: "bg-muted/40 text-muted-foreground border-border/60 hover:bg-muted" },
];

export function TaskModal({ isOpen, onClose, onTaskCreated, members: propMembers }: TaskModalProps) {
  const { user, token, activeWorkspace, isViewer } = useAuth();
  const { toast } = useToast();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [status, setStatus] = useState<TaskStatus>("todo");
  const [dueDate, setDueDate] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [assigneeSearch, setAssigneeSearch] = useState("");
  const [selectedAssignees, setSelectedAssignees] = useState<{ email: string; name: string; avatar_url?: string }[]>([]);
  const [workspaceMembers, setWorkspaceMembers] = useState<WorkspaceMember[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Strictly fetch and populate active members for the active workspace
  useEffect(() => {
    if (!isOpen || !token) return;

    const wsId = activeWorkspace?.id;
    if (wsId) {
      setIsLoadingMembers(true);
      api
        .getWorkspaceMembers(token, wsId)
        .then((res) => {
          const rawList = res.members || [];
          const activeList = rawList.filter((m) => m.status === "active" || !m.status);
          setWorkspaceMembers(activeList.length > 0 ? activeList : rawList);
        })
        .catch(() => {
          setWorkspaceMembers(propMembers.filter((m) => m.status === "active" || !m.status));
        })
        .finally(() => {
          setIsLoadingMembers(false);
        });
    } else {
      setWorkspaceMembers(propMembers.filter((m) => m.status === "active" || !m.status));
    }
  }, [isOpen, token, activeWorkspace?.id, propMembers]);

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

  const setQuickDeadline = (preset: "today" | "tomorrow" | "friday" | "next_week") => {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isViewer) {
      setError("Viewer clearance is read-only. You cannot create tasks.");
      return;
    }
    if (!title.trim()) {
      setError("Please enter a task title.");
      return;
    }
    if (!token) return;

    setIsLoading(true);
    setError(null);

    const tags = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    const finalAssignees =
      selectedAssignees.length > 0
        ? selectedAssignees
        : user?.email
        ? [
            {
              email: user.email,
              name: user.metadata?.name || user.username || user.email.split("@")[0],
              avatar_url: user.metadata?.avatar_url,
            },
          ]
        : [];

    try {
      await api.createTask(token, {
        workspace_id: activeWorkspace?.id,
        title: title.trim(),
        description: description.trim(),
        priority,
        status,
        assignees: finalAssignees,
        assignee_email: finalAssignees.length > 0 ? finalAssignees[0].email : undefined,
        assignee_name: finalAssignees.length > 0 ? finalAssignees[0].name : undefined,
        due_date: dueDate || undefined,
        tags,
      });

      toast.success("Task Created", `"${title.trim()}" added to sprint board.`);
      onTaskCreated();
      setTitle("");
      setDescription("");
      setDueDate("");
      setTagsInput("");
      setSelectedAssignees([]);
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to create task on backend.");
    } finally {
      setIsLoading(false);
    }
  };

  const activeMembersList = workspaceMembers.length > 0 ? workspaceMembers : propMembers;
  const filteredMembers = activeMembersList.filter((m) => {
    if (!assigneeSearch.trim()) return true;
    const q = assigneeSearch.toLowerCase();
    return (m.name || "").toLowerCase().includes(q) || m.email.toLowerCase().includes(q);
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create New Sprint Task"
      description={`Add a deliverable to ${activeWorkspace?.name || "the workspace"} and assign collaborators.`}
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-4 pt-1">
        {error && (
          <div className="flex items-center gap-2 rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive font-medium">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <Input
          label="Task Title"
          type="text"
          required
          placeholder="e.g. Implement OAuth PKCE flow"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <div className="w-full space-y-1.5">
          <label className="block text-xs font-semibold text-foreground/80 tracking-wide uppercase">
            Description
          </label>
          <textarea
            rows={3}
            className="flex w-full rounded-lg border border-input bg-background dark:bg-slate-900/80 px-3.5 py-2 text-sm text-foreground placeholder:text-muted-foreground transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary custom-scrollbar resize-none"
            placeholder="Detailed requirements and objectives..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        {/* Priority Segmented Control */}
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
                  onClick={() => setPriority(p.id)}
                  className={`flex items-center justify-center py-2 px-3 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                    isSelected ? p.activeClass : p.inactiveClass
                  }`}
                >
                  <span>{p.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Initial Stage Select */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-foreground/80 tracking-wide uppercase">
            Initial Stage
          </label>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as TaskStatus)}
            className="flex h-10 w-full rounded-lg border border-input bg-background dark:bg-slate-900/80 px-3 py-2 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary cursor-pointer transition-colors [&>option]:bg-card dark:[&>option]:bg-slate-900 [&>option]:text-foreground"
          >
            <option value="todo">To Do</option>
            <option value="in_progress">In Progress</option>
            <option value="done">Completed</option>
          </select>
        </div>

        {/* Workspace Assignee Selector with Live Search */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-semibold text-foreground/80 tracking-wide uppercase">
              Assign Personnel ({selectedAssignees.length > 0 ? `${selectedAssignees.length} selected` : "Assigned to Me"})
            </label>
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Building2 className="h-3 w-3 text-primary" />
              <span>{activeWorkspace?.name || "Workspace"} Members</span>
            </span>
          </div>

          {/* Member Search Bar if > 3 members */}
          {activeMembersList.length > 3 && (
            <div className="relative mb-1.5">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                placeholder="Filter members..."
                value={assigneeSearch}
                onChange={(e) => setAssigneeSearch(e.target.value)}
                className="h-8 w-full rounded-lg border border-input bg-background pl-8 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/40"
              />
            </div>
          )}

          <div className="max-h-36 overflow-y-auto custom-scrollbar rounded-xl border border-border/80 bg-secondary/30 p-2 space-y-1">
            {isLoadingMembers ? (
              <div className="flex items-center justify-center py-4 gap-2 text-xs text-muted-foreground">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                <span>Loading {activeWorkspace?.name || "workspace"} members...</span>
              </div>
            ) : (
              filteredMembers.map((m) => {
                const isSelected = selectedAssignees.some((a) => a.email.toLowerCase() === m.email.toLowerCase());
                const roleKey = (m.role || "viewer").toLowerCase();
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
                      <Avatar name={m.name || m.username || m.email} src={m.avatar_url} size="sm" />
                      <div className="text-left">
                        <span className="font-semibold text-foreground block leading-tight">
                          {m.name || (m.username ? `@${m.username}` : m.email)}
                        </span>
                        <span className="text-[10px] text-muted-foreground">{m.email}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Badge variant={roleKey as any} className="text-[9px] px-1.5 py-0 uppercase">
                        {roleKey}
                      </Badge>
                      {isSelected && (
                        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-xs">
                          <Check className="h-3 w-3" />
                        </div>
                      )}
                    </div>
                  </button>
                );
              })
            )}

            {!isLoadingMembers && filteredMembers.length === 0 && (
              <p className="text-[11px] text-muted-foreground p-3 text-center">No matching members found.</p>
            )}
          </div>
        </div>

        {/* Deadline with Quick Presets */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-semibold text-foreground/80 tracking-wide uppercase">
              Target Deadline
            </label>
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
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />

            <Input
              type="text"
              placeholder="Tags (e.g. Auth, API)"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2.5 pt-3 border-t border-border/70">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" size="sm" isLoading={isLoading} disabled={isViewer}>
            Create Task Deliverable
          </Button>
        </div>
      </form>
    </Modal>
  );
}

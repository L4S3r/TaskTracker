"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { TaskPriority, TaskStatus, TeamMember } from "@/lib/tasks-store";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { AlertCircle, Check } from "lucide-react";

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTaskCreated: () => void;
  members: TeamMember[];
}

export function TaskModal({ isOpen, onClose, onTaskCreated, members }: TaskModalProps) {
  const { user, token } = useAuth();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [status, setStatus] = useState<TaskStatus>("todo");
  const [dueDate, setDueDate] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [selectedAssignees, setSelectedAssignees] = useState<{ email: string; name: string; avatar_url?: string }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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

    // If no assignees selected, default to assigning to oneself
    const finalAssignees = selectedAssignees.length > 0 ? selectedAssignees : (user?.email ? [{
      email: user.email,
      name: user.metadata?.name || user.username || user.email.split("@")[0],
      avatar_url: user.metadata?.avatar_url,
    }] : []);

    try {
      await api.createTask(token, {
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

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create New Team Task"
      description="Add a task to the board, schedule deliverables, and assign to one or multiple colleagues."
    >
      <form onSubmit={handleSubmit} noValidate className="space-y-4">

        {error && (
          <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive font-medium">
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
            className="flex w-full rounded-lg border border-input bg-card px-3.5 py-2 text-sm text-foreground placeholder:text-muted-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            placeholder="Detailed requirements and objectives..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-foreground/80 tracking-wide uppercase">
              Priority
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as TaskPriority)}
              className="flex h-11 w-full rounded-lg border border-input bg-card px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-foreground/80 tracking-wide uppercase">
              Initial Column
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as TaskStatus)}
              className="flex h-11 w-full rounded-lg border border-input bg-card px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="todo">To Do</option>
              <option value="in_progress">In Progress</option>
              <option value="review">Review</option>
              <option value="done">Done</option>
            </select>
          </div>
        </div>

        {/* Group Assignee Selector */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-semibold text-foreground/80 tracking-wide uppercase">
              Assign Personnel ({selectedAssignees.length > 0 ? `${selectedAssignees.length} selected` : "Assigned to Me"})
            </label>
            <span className="text-[10px] text-muted-foreground">Select one or multiple members</span>
          </div>

          <div className="max-h-32 overflow-y-auto rounded-lg border border-border bg-muted/20 p-2 space-y-1">
            {members.map((m) => {
              const isSelected = selectedAssignees.some((a) => a.email.toLowerCase() === m.email.toLowerCase());
              return (
                <button
                  key={m.email}
                  type="button"
                  onClick={() => handleToggleAssignee(m)}
                  className={`flex w-full items-center justify-between p-1.5 rounded-md text-xs transition-colors ${
                    isSelected ? "bg-primary/10 border border-primary/30" : "hover:bg-muted/50 border border-transparent"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Avatar name={m.name || m.email} src={m.avatar_url} size="sm" />
                    <span className="font-medium text-foreground">{m.name || m.email.split("@")[0]}</span>
                    <span className="text-[10px] text-muted-foreground">({m.role})</span>
                  </div>

                  {isSelected && (
                    <div className="flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <Check className="h-2.5 w-2.5" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <Input
          label="Target Deadline"
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
        />

        <Input
          label="Tags (comma separated)"
          type="text"
          placeholder="e.g. Auth, Frontend, Security"
          value={tagsInput}
          onChange={(e) => setTagsInput(e.target.value)}
        />

        <div className="flex justify-end gap-2 pt-2 border-t border-border">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isLoading}>
            Create & Notify Assignees
          </Button>
        </div>
      </form>
    </Modal>
  );
}

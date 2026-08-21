"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { Task, TaskPriority, TaskStatus, TeamMember } from "@/lib/tasks-store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { TaskModal } from "./task-modal";
import { TaskDetailModal } from "./task-detail-modal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Plus, Search, ArrowRight, Trash2, CheckCircle2, Clock, AlertTriangle, RefreshCw, Calendar, Users } from "lucide-react";


const COLUMNS: { id: TaskStatus; label: string }[] = [
  { id: "todo", label: "To Do" },
  { id: "in_progress", label: "In Progress" },
  { id: "review", label: "In Review" },
  { id: "done", label: "Completed" },
];

function getDeadlineInfo(dueDate: string | undefined, status: TaskStatus) {
  if (!dueDate) return null;
  if (status === "done") {
    return {
      type: "completed",
      label: `Completed (${dueDate})`,
      className: "bg-green-500/10 text-green-500 border-green-500/20",
    };
  }

  const targetDate = new Date(`${dueDate}T23:59:59`);
  const now = new Date();
  const diffTime = targetDate.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffTime < 0) {
    return {
      type: "overdue",
      label: `Overdue by ${Math.abs(diffDays)}d (${dueDate})`,
      className: "bg-destructive/10 text-destructive border-destructive/30 font-bold animate-pulse",
    };
  } else if (diffDays <= 2) {
    return {
      type: "due-soon",
      label: diffDays === 0 ? `Due Today (${dueDate})` : `Due in ${diffDays}d (${dueDate})`,
      className: "bg-amber-500/10 text-amber-500 border-amber-500/30 font-semibold",
    };
  } else {
    return {
      type: "upcoming",
      label: `Due ${dueDate}`,
      className: "bg-muted text-muted-foreground border-border",
    };
  }
}

export function TaskBoard() {
  const { token, user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDetailTask, setSelectedDetailTask] = useState<Task | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [deadlineFilter, setDeadlineFilter] = useState<string>("all");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTasksAndMembers = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    setError(null);

    try {
      const [tasksRes, membersRes] = await Promise.all([
        api.getTasks(token),
        api.getTeamMembers(token),
      ]);
      setTasks(tasksRes.tasks || []);
      setMembers(membersRes.members || []);
    } catch (err: any) {
      setError(err.message || "Failed to load tasks from server.");
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchTasksAndMembers();
  }, [fetchTasksAndMembers]);

  const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    if (!token) return;
    try {
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
      );
      await api.updateTask(token, taskId, { status: newStatus });
    } catch {
      fetchTasksAndMembers();
    }
  };

  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [isDeletingTask, setIsDeletingTask] = useState(false);

  const handleConfirmDeleteTask = async () => {
    if (!token || !taskToDelete) return;
    setIsDeletingTask(true);
    const targetId = taskToDelete.id;

    // Optimistic deletion
    setTasks((prev) => prev.filter((t) => t.id !== targetId));
    try {
      await api.deleteTask(token, targetId);
    } catch {
      fetchTasksAndMembers();
    } finally {
      setIsDeletingTask(false);
      setTaskToDelete(null);
    }
  };


  const filteredTasks = tasks.filter((t) => {
    const titleMatch = t.title?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false;
    const descMatch = t.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false;
    const tagsMatch = t.tags?.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase())) ?? false;

    const assigneesText = (t.assignees || [])
      .map((a) => `${a.name} ${a.email}`)
      .join(" ")
      .toLowerCase();
    const primaryAssigneeText = `${t.assignee_name || ""} ${t.assignee_email || ""}`.toLowerCase();

    const matchesSearch =
      titleMatch || descMatch || tagsMatch || assigneesText.includes(searchQuery.toLowerCase()) || primaryAssigneeText.includes(searchQuery.toLowerCase());
    const matchesPriority = priorityFilter === "all" || t.priority === priorityFilter;

    // Deadline filter
    let matchesDeadline = true;
    if (deadlineFilter !== "all") {
      const dlInfo = getDeadlineInfo(t.due_date || t.dueDate, t.status);
      if (deadlineFilter === "overdue") {
        matchesDeadline = dlInfo?.type === "overdue";
      } else if (deadlineFilter === "due-soon") {
        matchesDeadline = dlInfo?.type === "due-soon";
      } else if (deadlineFilter === "has-deadline") {
        matchesDeadline = Boolean(t.due_date || t.dueDate);
      }
    }

    return matchesSearch && matchesPriority && matchesDeadline;
  });

  const overdueCount = tasks.filter((t) => getDeadlineInfo(t.due_date || t.dueDate, t.status)?.type === "overdue").length;
  const dueSoonCount = tasks.filter((t) => getDeadlineInfo(t.due_date || t.dueDate, t.status)?.type === "due-soon").length;

  return (
    <div className="space-y-6">
      {/* Board Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Team Task Board</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Deliverables, sprint deadlines, and group collaborator assignments.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchTasksAndMembers}
            className="gap-1.5"
            title="Refresh task board"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Refresh</span>
          </Button>

          <Button onClick={() => setIsModalOpen(true)} className="gap-2 shadow-sm">
            <Plus className="h-4 w-4" />
            <span>New Task</span>
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-3 p-3 rounded-xl border border-border bg-card shadow-sm">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search tasks, assignees, tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-10 w-full rounded-lg border border-input bg-background pl-9 pr-3 text-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Priority Select */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold text-muted-foreground whitespace-nowrap uppercase">Priority:</span>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="h-9 rounded-lg border border-input bg-background px-2.5 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="all">All Priorities</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          {/* Deadline Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold text-muted-foreground whitespace-nowrap uppercase">Deadlines:</span>
            <select
              value={deadlineFilter}
              onChange={(e) => setDeadlineFilter(e.target.value)}
              className="h-9 rounded-lg border border-input bg-background px-2.5 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="all">All Deliverables</option>
              <option value="has-deadline">Has Deadline</option>
              <option value="due-soon">Due Soon {dueSoonCount > 0 ? `(${dueSoonCount})` : ""}</option>
              <option value="overdue">Overdue {overdueCount > 0 ? `(${overdueCount})` : ""}</option>
            </select>
          </div>
        </div>
      </div>

      {isLoading && tasks.length === 0 ? (
        <div className="flex min-h-[300px] items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="text-xs text-muted-foreground">Loading workspace tasks from database...</p>
          </div>
        </div>
      ) : (
        /* Kanban Columns */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {COLUMNS.map((col) => {
            const colTasks = filteredTasks.filter((t) => t.status === col.id);
            return (
              <div key={col.id} className="flex flex-col rounded-xl border border-border bg-secondary/30 p-3.5 min-h-[500px]">
                {/* Column Header */}
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-border/80">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-foreground/90">{col.label}</span>
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground">
                      {colTasks.length}
                    </span>
                  </div>
                </div>

                {/* Tasks List */}
                <div className="space-y-3 flex-1 overflow-y-auto">
                  {colTasks.map((task) => {
                    const dlInfo = getDeadlineInfo(task.due_date || task.dueDate, task.status);

                    // Resolve assignees list
                    const taskAssignees =
                      task.assignees && task.assignees.length > 0
                        ? task.assignees
                        : task.assignee_email
                        ? [{
                            email: task.assignee_email,
                            name: task.assignee_name || task.assignee_email.split("@")[0],
                            avatar_url: task.assignee_avatar,
                          }]
                        : [];

                    return (
                      <Card
                        key={task.id}
                        onClick={() => setSelectedDetailTask(task)}
                        className="border-border hover:shadow-md hover:border-primary/40 transition-all bg-card cursor-pointer group"
                      >
                        <CardHeader className="p-4 pb-2 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <Badge variant={task.priority as any}>{task.priority}</Badge>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setTaskToDelete(task);
                              }}
                              className="text-muted-foreground hover:text-destructive transition-colors p-1"
                              title="Delete task"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>

                          <CardTitle className="text-sm font-semibold leading-snug group-hover:text-primary transition-colors">
                            {task.title}
                          </CardTitle>
                        </CardHeader>

                        <CardContent className="p-4 pt-0 space-y-3">
                          {task.description && (
                            <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                              {task.description}
                            </p>
                          )}

                          {/* Deadline Badge */}
                          {dlInfo && (
                            <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-[10px] ${dlInfo.className}`}>
                              <Calendar className="h-3 w-3 shrink-0" />
                              <span>{dlInfo.label}</span>
                            </div>
                          )}

                          {task.tags && task.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {task.tags.map((tag) => (
                                <span
                                  key={tag}
                                  className="inline-block rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground"
                                >
                                  #{tag}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Card Footer: Assignee Stack & Next Stage */}
                          <div className="flex items-center justify-between pt-2 border-t border-border/60">
                            {/* Multi-Avatar Stack */}
                            <div className="flex items-center gap-2">
                              {taskAssignees.length > 0 ? (
                                <div className="flex items-center -space-x-2">
                                  {taskAssignees.slice(0, 3).map((a, i) => {
                                    const memberMatch = members.find((m) => m.email.toLowerCase() === a.email.toLowerCase());
                                    const avatarSrc = a.avatar_url || memberMatch?.avatar_url;
                                    return (
                                      <Avatar
                                        key={a.email || i}
                                        name={a.name || a.email}
                                        src={avatarSrc}
                                        size="sm"
                                        className="ring-2 ring-card"
                                      />
                                    );
                                  })}
                                  {taskAssignees.length > 3 && (
                                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground ring-2 ring-card">
                                      +{taskAssignees.length - 3}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-[11px] text-muted-foreground italic">Unassigned</span>
                              )}

                              {taskAssignees.length === 1 && (
                                <span className="text-[11px] font-medium text-foreground/80 truncate max-w-[80px]">
                                  {taskAssignees[0].name || taskAssignees[0].email.split("@")[0]}
                                </span>
                              )}
                            </div>

                            {/* Move task quick action */}
                            <div className="flex items-center gap-1">
                              {col.id !== "done" && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const nextIndex = COLUMNS.findIndex((c) => c.id === col.id) + 1;
                                    if (nextIndex < COLUMNS.length) {
                                      handleStatusChange(task.id, COLUMNS[nextIndex].id);
                                    }
                                  }}
                                  className="flex items-center gap-1 rounded bg-secondary px-2 py-1 text-[10px] font-semibold text-secondary-foreground hover:bg-primary hover:text-primary-foreground transition-colors"
                                  title="Move to next stage"
                                >
                                  <span>Next</span>
                                  <ArrowRight className="h-3 w-3" />
                                </button>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}

                  {colTasks.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-36 rounded-lg border border-dashed border-border/80 text-muted-foreground p-4 text-center">
                      <p className="text-xs">No tasks in this stage</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Task Creation Modal */}
      <TaskModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onTaskCreated={fetchTasksAndMembers}
        members={members}
      />

      {/* Task Details & Multi-Assignee Modal */}
      <TaskDetailModal
        task={selectedDetailTask}
        isOpen={Boolean(selectedDetailTask)}
        onClose={() => setSelectedDetailTask(null)}
        onTaskUpdated={fetchTasksAndMembers}
        onTaskDeleted={fetchTasksAndMembers}
        members={members}
      />

      {/* Task Deletion Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(taskToDelete)}
        onClose={() => setTaskToDelete(null)}
        onConfirm={handleConfirmDeleteTask}
        isLoading={isDeletingTask}
        title="Delete Task Deliverable"
        description={`Are you sure you want to permanently delete "${taskToDelete?.title}" from the task board?`}
        confirmText="Delete Task"
        cancelText="Keep Task"
        variant="destructive"
      />
    </div>
  );
}


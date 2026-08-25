"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useToast } from "@/lib/toast-context";
import { api } from "@/lib/api";
import { Task, TaskPriority, TaskStatus, TeamMember } from "@/lib/tasks-store";
import { useWorkspaceSocket } from "@/lib/use-workspace-socket";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { TaskModal } from "./task-modal";
import { TaskDetailModal } from "./task-detail-modal";
import { CreateWorkspaceModal } from "./create-workspace-modal";
import { SprintAnalyticsModal } from "./sprint-analytics-modal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Plus,
  Search,
  ArrowRight,
  Trash2,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RefreshCw,
  Calendar,
  Building2,
  Lock,
  ChevronDown,
  X,
  CheckSquare,
} from "lucide-react";

const COLUMNS: {
  id: TaskStatus;
  label: string;
  gradientClass: string;
  glowClass: string;
  badgeBg: string;
  dotColor: string;
  accentBorder: string;
}[] = [
  {
    id: "todo",
    label: "To Do",
    gradientClass: "kanban-gradient-todo",
    glowClass: "from-indigo-500/25 via-purple-500/10 to-transparent",
    badgeBg: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20",
    dotColor: "bg-indigo-500 shadow-xs shadow-indigo-500/50",
    accentBorder: "border-indigo-500/20 hover:border-indigo-500/40",
  },
  {
    id: "in_progress",
    label: "In Progress",
    gradientClass: "kanban-gradient-in-progress",
    glowClass: "from-blue-500/25 via-cyan-500/10 to-transparent",
    badgeBg: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20",
    dotColor: "bg-blue-500 animate-pulse shadow-xs shadow-blue-500/50",
    accentBorder: "border-blue-500/20 hover:border-blue-500/40",
  },
  {
    id: "done",
    label: "Done",
    gradientClass: "kanban-gradient-done",
    glowClass: "from-emerald-500/25 via-teal-500/10 to-transparent",
    badgeBg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20",
    dotColor: "bg-emerald-500 shadow-xs shadow-emerald-500/50",
    accentBorder: "border-emerald-500/20 hover:border-emerald-500/40",
  },
];

function getDeadlineInfo(dueDate: string | undefined, status: TaskStatus) {
  if (!dueDate) return null;
  if (status === "done") {
    return {
      type: "completed",
      label: `Completed (${dueDate})`,
      className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
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
      className: "bg-destructive/10 text-destructive border-destructive/30 font-bold",
    };
  } else if (diffDays <= 2) {
    return {
      type: "due-soon",
      label: diffDays === 0 ? `Due Today (${dueDate})` : `Due in ${diffDays}d (${dueDate})`,
      className: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 font-semibold",
    };
  } else {
    return {
      type: "upcoming",
      label: `Due ${dueDate}`,
      className: "bg-muted/70 text-muted-foreground border-border/60",
    };
  }
}

export function TaskBoard() {
  const searchParams = useSearchParams();
  const urlTaskId = searchParams?.get("task") || searchParams?.get("taskId");
  const urlWorkspaceId = searchParams?.get("workspace") || searchParams?.get("workspace_id");

  const { token, user, activeWorkspace, workspaces, switchWorkspace, userRole, isAdmin, isDeveloper, isEditor, isViewer } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreateWsOpen, setIsCreateWsOpen] = useState(false);
  const [selectedDetailTask, setSelectedDetailTask] = useState<Task | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [deadlineFilter, setDeadlineFilter] = useState<string>("all");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [isDeletingTask, setIsDeletingTask] = useState(false);
  const [transitioningTaskId, setTransitioningTaskId] = useState<string | null>(null);
  const [justArrivedTaskId, setJustArrivedTaskId] = useState<string | null>(null);

  // Drag and drop states
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [activeDropCol, setActiveDropCol] = useState<string | null>(null);

  // Sprint Analytics Modal state
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState(false);

  const handledDeepLinkRef = useRef<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // RBAC Permission resolution
  const canCreate = !isViewer;
  const canMove = !isViewer;

  // Global Keyboard Shortcuts (N = New Task, / = Search Focus)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;

      if (!isInput) {
        if (e.key === "n" || e.key === "N") {
          if (canCreate && !isModalOpen && !selectedDetailTask) {
            e.preventDefault();
            setIsModalOpen(true);
          }
        } else if (e.key === "/") {
          e.preventDefault();
          searchInputRef.current?.focus();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [canCreate, isModalOpen, selectedDetailTask]);

  const canDeleteTask = (task: Task): boolean => {
    if (isAdmin) return true;
    if (isDeveloper || isEditor) {
      const isOwner =
        task.created_by?.toLowerCase() === user?.email?.toLowerCase() ||
        task.created_by === user?.id ||
        task.created_by === user?.username;
      return isOwner;
    }
    return false;
  };

  // Deep link workspace auto-switch
  useEffect(() => {
    if (urlWorkspaceId && activeWorkspace?.id !== urlWorkspaceId && workspaces.length > 0) {
      const wsExists = workspaces.some((w) => w.id === urlWorkspaceId);
      if (wsExists) {
        switchWorkspace(urlWorkspaceId).catch(() => {});
      } else {
        // Unauthorized workspace URL access
        toast.error("Access Restricted", "You do not have access to that workspace.");
        if (typeof window !== "undefined") {
          const url = new URL(window.location.href);
          url.searchParams.delete("workspace");
          url.searchParams.delete("workspace_id");
          window.history.replaceState({}, "", url.pathname + (url.search || ""));
        }
      }
    }
  }, [urlWorkspaceId, activeWorkspace?.id, workspaces, switchWorkspace, toast]);

  // Deep link direct task modal open & card highlight
  useEffect(() => {
    if (!urlTaskId || handledDeepLinkRef.current === urlTaskId) return;

    // First check in currently loaded tasks
    const existing = tasks.find((t) => t.id === urlTaskId);
    if (existing) {
      setSelectedDetailTask(existing);
      setJustArrivedTaskId(existing.id);
      handledDeepLinkRef.current = urlTaskId;
      return;
    }

    // If not found in active list, fetch single task directly
    if (token && !isLoading) {
      api
        .getTask(token, urlTaskId)
        .then((res) => {
          if (res.task) {
            setSelectedDetailTask(res.task);
            setJustArrivedTaskId(res.task.id);
            handledDeepLinkRef.current = urlTaskId;
          }
        })
        .catch((err: any) => {
          // Task not found or permission denied (404 / 403)
          handledDeepLinkRef.current = urlTaskId;
          toast.error("Task Not Found", "The requested task deliverable could not be found or access was restricted.");
          if (typeof window !== "undefined") {
            const url = new URL(window.location.href);
            url.searchParams.delete("task");
            url.searchParams.delete("taskId");
            window.history.replaceState({}, "", url.pathname + (url.search || ""));
          }
        });
    }
  }, [urlTaskId, tasks, token, isLoading, toast]);

  const handleCloseDetailModal = useCallback(() => {
    setSelectedDetailTask(null);
    if (typeof window !== "undefined" && window.location.search) {
      const url = new URL(window.location.href);
      if (
        url.searchParams.has("task") ||
        url.searchParams.has("taskId") ||
        url.searchParams.has("workspace") ||
        url.searchParams.has("workspace_id")
      ) {
        url.searchParams.delete("task");
        url.searchParams.delete("taskId");
        url.searchParams.delete("workspace");
        url.searchParams.delete("workspace_id");
        window.history.replaceState({}, "", url.pathname + (url.search || ""));
      }
    }
  }, []);

  const fetchTasksAndMembers = useCallback(async () => {
    if (!token) return;
    setIsLoading(true);
    setError(null);

    const wsId = activeWorkspace?.id;

    try {
      const [tasksRes, membersRes] = await Promise.all([
        api.getTasks(token, { workspace_id: wsId }),
        wsId ? api.getWorkspaceMembers(token, wsId) : api.getTeamMembers(token),
      ]);
      setTasks(tasksRes.tasks || []);
      setMembers(membersRes.members || []);
    } catch (err: any) {
      setError(err.message || "Failed to load workspace deliverables.");
    } finally {
      setIsLoading(false);
    }
  }, [token, activeWorkspace?.id]);

  // Immediate cache invalidation on workspace switch: clear previous workspace's tasks & members
  useEffect(() => {
    setTasks([]);
    setMembers([]);
    setIsLoading(true);
    setError(null);
    fetchTasksAndMembers();
  }, [activeWorkspace?.id, fetchTasksAndMembers]);

  // Real-Time WebSocket Channel for Live Board Synchronization (Phase 4.1)
  const { isConnected: isWsConnected } = useWorkspaceSocket(activeWorkspace?.id, {
    onTaskCreated: (newTask) => {
      setTasks((prev) => {
        if (prev.some((t) => t.id === newTask.id)) return prev;
        return [newTask, ...prev];
      });
      toast.info("Task Created", `"${newTask.title}" was added by a team member.`);
    },
    onTaskUpdated: (updatedTask) => {
      setTasks((prev) => prev.map((t) => (t.id === updatedTask.id ? { ...t, ...updatedTask } : t)));
      setSelectedDetailTask((prev) => (prev && prev.id === updatedTask.id ? { ...prev, ...updatedTask } : prev));
    },
    onTaskDeleted: (deletedTaskId) => {
      setTasks((prev) => prev.filter((t) => t.id !== deletedTaskId));
      setSelectedDetailTask((prev) => (prev && prev.id === deletedTaskId ? null : prev));
    },
  });

  const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    if (!token || !canMove || transitioningTaskId) return;

    // 1. Trigger slide-out animation on the source column card
    setTransitioningTaskId(taskId);

    // 2. Commit status move after exit animation duration
    setTimeout(async () => {
      setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t)));
      setTransitioningTaskId(null);
      setJustArrivedTaskId(taskId);

      // 3. Reset arrival highlight state after landing
      setTimeout(() => {
        setJustArrivedTaskId((curr) => (curr === taskId ? null : curr));
      }, 350);

      const statusLabels: Record<TaskStatus, string> = {
        todo: "To Do",
        in_progress: "In Progress",
        review: "Review",
        done: "Completed",
      };
      toast.success("Task Advanced", `Moved to ${statusLabels[newStatus]}`);

      // 4. Persist to API
      try {
        await api.updateTask(token, taskId, { status: newStatus });
      } catch {
        fetchTasksAndMembers();
        toast.error("Sync Failed", "Could not persist status change. Reverting.");
      }
    }, 180);
  };

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    if (!canMove) return;
    setDraggedTaskId(taskId);
    e.dataTransfer.setData("text/plain", taskId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, colId: string) => {
    if (!canMove) return;
    e.preventDefault();
    if (activeDropCol !== colId) {
      setActiveDropCol(colId);
    }
    e.dataTransfer.dropEffect = "move";
  };

  const handleDragLeave = (e: React.DragEvent, colId: string) => {
    e.preventDefault();
    if (activeDropCol === colId) {
      setActiveDropCol(null);
    }
  };

  const handleDrop = (e: React.DragEvent, colId: string) => {
    e.preventDefault();
    const droppedId = e.dataTransfer.getData("text/plain") || draggedTaskId;
    setActiveDropCol(null);
    setDraggedTaskId(null);

    if (!droppedId || !canMove) return;
    const task = tasks.find((t) => t.id === droppedId);
    if (!task) return;

    const targetStatus: TaskStatus = colId as TaskStatus;
    if (
      task.status === targetStatus ||
      (colId === "in_progress" && (task.status === "in_progress" || task.status === "review"))
    ) {
      return;
    }

    handleStatusChange(droppedId, targetStatus);
  };

  const handleDragEnd = () => {
    setDraggedTaskId(null);
    setActiveDropCol(null);
  };

  const handleConfirmDeleteTask = async () => {
    if (!token || !taskToDelete || !canDeleteTask(taskToDelete)) return;
    setIsDeletingTask(true);
    const targetId = taskToDelete.id;
    const taskTitle = taskToDelete.title;

    // Optimistic deletion
    setTasks((prev) => prev.filter((t) => t.id !== targetId));
    try {
      await api.deleteTask(token, targetId);
      toast.success("Task Deleted", `"${taskTitle}" was removed from the sprint board.`);
    } catch {
      fetchTasksAndMembers();
      toast.error("Failed to Delete", "Could not delete task deliverable.");
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

  const todoCount = tasks.filter((t) => t.status === "todo").length;
  const inProgressCount = tasks.filter((t) => t.status === "in_progress" || t.status === "review").length;
  const doneCount = tasks.filter((t) => t.status === "done").length;

  const overdueCount = tasks.filter((t) => getDeadlineInfo(t.due_date || t.dueDate, t.status)?.type === "overdue").length;
  const dueSoonCount = tasks.filter((t) => getDeadlineInfo(t.due_date || t.dueDate, t.status)?.type === "due-soon").length;

  const hasActiveFilters = searchQuery !== "" || priorityFilter !== "all" || deadlineFilter !== "all";

  const handleResetFilters = () => {
    setSearchQuery("");
    setPriorityFilter("all");
    setDeadlineFilter("all");
  };

  if (!isLoading && (!activeWorkspace || workspaces.length === 0)) {
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
              Create your first workspace to start organizing sprint deliverables, assigning tasks, and collaborating with your team.
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

  return (
    <div className="space-y-6">
      {/* Board Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              {activeWorkspace?.name ? `${activeWorkspace.name} Sprint Board` : "Workspace Task Board"}
            </h1>
            <Badge variant={userRole as any} className="uppercase text-[10px]">
              {userRole}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {activeWorkspace?.description || "Deliverables, sprint deadlines, and multi-collaborator assignments."}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {isWsConnected && (
            <div className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold shadow-2xs transition-all duration-200">
              <span className="h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-emerald-500/20"></span>
              <span>Live Sync</span>
            </div>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={fetchTasksAndMembers}
            className="gap-1.5"
            title="Refresh sprint tasks"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </Button>

          {canCreate ? (
            <Button onClick={() => setIsModalOpen(true)} className="gap-2 shadow-sm">
              <Plus className="h-4 w-4" />
              <span>New Task</span>
              <kbd className="hidden md:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono bg-primary-foreground/20 text-primary-foreground">
                N
              </kbd>
            </Button>
          ) : (
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/80 bg-secondary/50 text-[11px] text-muted-foreground font-medium">
              <Lock className="h-3 w-3" />
              <span>Viewer (Read-Only)</span>
            </div>
          )}
        </div>
      </div>

      {/* Metrics Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="flex items-center justify-between p-3.5 rounded-xl border border-border/70 bg-card shadow-xs">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Total Tasks</p>
            <p className="text-xl font-bold text-foreground mt-0.5">{tasks.length}</p>
          </div>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <CheckSquare className="h-4 w-4" />
          </div>
        </div>

        <div className="flex items-center justify-between p-3.5 rounded-xl border border-border/70 bg-card shadow-xs">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">In Progress</p>
            <p className="text-xl font-bold text-blue-500 mt-0.5">{inProgressCount}</p>
          </div>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500">
            <Clock className="h-4 w-4" />
          </div>
        </div>

        <div className="flex items-center justify-between p-3.5 rounded-xl border border-border/70 bg-card shadow-xs">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Completed</p>
            <p className="text-xl font-bold text-emerald-500 mt-0.5">{doneCount}</p>
          </div>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
            <CheckCircle2 className="h-4 w-4" />
          </div>
        </div>

        <div className="flex items-center justify-between p-3.5 rounded-xl border border-border/70 bg-card shadow-xs">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Overdue</p>
            <p className={`text-xl font-bold mt-0.5 ${overdueCount > 0 ? "text-destructive" : "text-foreground"}`}>
              {overdueCount}
            </p>
          </div>
          <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${overdueCount > 0 ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"}`}>
            <AlertTriangle className="h-4 w-4" />
          </div>
        </div>
      </div>

      {/* Sprint Velocity Progress Bar */}
      {tasks.length > 0 && (
        <div
          onClick={() => setIsAnalyticsOpen(true)}
          className="rounded-xl border border-border/80 bg-card p-3.5 shadow-xs space-y-2 hover:border-primary/50 hover:bg-card/90 transition-all cursor-pointer group"
          title="Click to view full sprint workload & velocity analytics"
        >
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-foreground flex items-center gap-2">
              <span className="group-hover:text-primary transition-colors">Sprint Progress &amp; Velocity</span>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-muted font-medium text-muted-foreground">
                {doneCount} of {tasks.length} Completed
              </span>
            </span>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-muted-foreground group-hover:text-primary transition-colors hidden sm:inline">
                View Analytics &rarr;
              </span>
              <span className="font-bold text-primary text-sm">
                {Math.round((doneCount / tasks.length) * 100)}%
              </span>
            </div>
          </div>
          <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 transition-all duration-500 rounded-full"
              style={{ width: `${Math.round((doneCount / tasks.length) * 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-3 p-3.5 rounded-xl border border-border/80 bg-card shadow-xs">
        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search tasks, assignees, tags..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-11 min-h-[44px] w-full rounded-xl border border-input bg-background dark:bg-slate-900/80 pl-10 pr-14 text-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary transition-colors"
          />
          {searchQuery ? (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-0 top-0 bottom-0 min-h-[44px] min-w-[44px] flex items-center justify-center text-muted-foreground hover:text-foreground p-2 rounded-r-xl hover:bg-muted/70 cursor-pointer transition-colors"
              title="Clear search"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          ) : (
            <kbd className="absolute right-3 top-3 hidden md:inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono text-muted-foreground bg-muted border border-border/80 pointer-events-none">
              /
            </kbd>
          )}
        </div>

        {/* Filter Controls Group */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Priority Select */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold text-muted-foreground whitespace-nowrap uppercase tracking-wider">
              Priority:
            </span>
            <div className="relative">
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="h-11 min-h-[44px] rounded-xl border border-input bg-background dark:bg-slate-900/80 pl-3 pr-8 text-xs font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary cursor-pointer transition-colors appearance-none [&>option]:bg-card dark:[&>option]:bg-slate-900 [&>option]:text-foreground"
              >
                <option value="all">All Priorities</option>
                <option value="urgent">Urgent</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
              <ChevronDown className="absolute right-2.5 top-4 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            </div>
          </div>

          {/* Deadline Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold text-muted-foreground whitespace-nowrap uppercase tracking-wider">
              Deadlines:
            </span>
            <div className="relative">
              <select
                value={deadlineFilter}
                onChange={(e) => setDeadlineFilter(e.target.value)}
                className="h-11 min-h-[44px] rounded-xl border border-input bg-background dark:bg-slate-900/80 pl-3 pr-8 text-xs font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary cursor-pointer transition-colors appearance-none [&>option]:bg-card dark:[&>option]:bg-slate-900 [&>option]:text-foreground"
              >
                <option value="all">All Deliverables</option>
                <option value="has-deadline">Has Deadline</option>
                <option value="due-soon">Due Soon {dueSoonCount > 0 ? `(${dueSoonCount})` : ""}</option>
                <option value="overdue">Overdue {overdueCount > 0 ? `(${overdueCount})` : ""}</option>
              </select>
              <ChevronDown className="absolute right-2.5 top-4 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
            </div>
          </div>

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResetFilters}
              className="text-xs text-muted-foreground hover:text-foreground h-11 min-h-[44px] px-3 gap-1.5"
            >
              <X className="h-3.5 w-3.5" />
              <span>Reset</span>
            </Button>
          )}
        </div>
      </div>

      {isLoading && tasks.length === 0 ? (
        <div className="flex min-h-[350px] items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-3 border-primary border-t-transparent" />
            <p className="text-xs text-muted-foreground">Loading workspace tasks from database...</p>
          </div>
        </div>
      ) : filteredTasks.length === 0 && tasks.length > 0 ? (
        /* Empty Filter Results */
        <div className="flex flex-col items-center justify-center min-h-[300px] rounded-2xl border border-dashed border-border bg-card/40 p-8 text-center space-y-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted text-muted-foreground">
            <Search className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground">No tasks match your filters</p>
            <p className="text-xs text-muted-foreground max-w-sm">
              Try adjusting your search query, priority criteria, or deadline filters.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={handleResetFilters}>
            Clear Filters
          </Button>
        </div>
      ) : (
        /* Kanban Columns Grid (To Do, In Progress, Done) */
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {COLUMNS.map((col) => {
            const colTasks = filteredTasks.filter((t) => {
              if (col.id === "in_progress") {
                return t.status === "in_progress" || t.status === "review";
              }
              return t.status === col.id;
            });

            const isDroppingHere = activeDropCol === col.id && draggedTaskId !== null;

            return (
              <div
                key={col.id}
                onDragOver={(e) => handleDragOver(e, col.id)}
                onDragLeave={(e) => handleDragLeave(e, col.id)}
                onDrop={(e) => handleDrop(e, col.id)}
                className={`flex flex-col rounded-2xl border transition-all duration-200 min-h-[540px] overflow-hidden relative group/col ${
                  isDroppingHere
                    ? "border-primary/80 bg-primary/5 ring-2 ring-primary/30 shadow-lg scale-[1.008]"
                    : `border-border/80 bg-secondary/30 ${col.accentBorder}`
                }`}
              >
                {/* Moving Animated Gradient Bar Above the Column */}
                <div className="relative w-full h-[5px] overflow-hidden shrink-0">
                  <div className={`w-full h-full ${col.gradientClass}`} />
                </div>

                {/* Ambient Soft Glow bleed from top */}
                <div
                  className={`absolute top-[5px] left-0 right-0 h-14 bg-gradient-to-b ${col.glowClass} pointer-events-none opacity-60 dark:opacity-80`}
                />

                <div className="p-3.5 flex flex-col flex-1 relative z-10">
                  {/* Column Header */}
                  <div className="flex items-center justify-between pb-3 mb-3 border-b border-border/70">
                    <div className="flex items-center gap-2">
                      <span className={`h-2.5 w-2.5 rounded-full ${col.dotColor} ring-2 ring-background`} />
                      <span className="text-xs font-bold uppercase tracking-wider text-foreground/90">{col.label}</span>
                    </div>
                    <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold ${col.badgeBg}`}>
                      {colTasks.length}
                    </span>
                  </div>

                  {/* Drop Cue Indicator */}
                  {isDroppingHere && (
                    <div className="flex items-center justify-center p-3 mb-3 rounded-xl border-2 border-dashed border-primary/60 bg-primary/10 text-primary text-xs font-semibold animate-pulse">
                      <span>Drop to move to {col.label}</span>
                    </div>
                  )}

                {/* Tasks List */}
                <div className="space-y-3 flex-1 overflow-y-auto custom-scrollbar pr-0.5">
                  {colTasks.map((task) => {
                    const dlInfo = getDeadlineInfo(task.due_date || task.dueDate, task.status);
                    const canDelete = canDeleteTask(task);

                    const taskAssignees =
                      task.assignees && task.assignees.length > 0
                        ? task.assignees
                        : task.assignee_email
                        ? [
                            {
                              email: task.assignee_email,
                              name: task.assignee_name || task.assignee_email.split("@")[0],
                              avatar_url: task.assignee_avatar,
                            },
                          ]
                        : [];

                    const isTransitioning = transitioningTaskId === task.id;
                    const isJustArrived = justArrivedTaskId === task.id;
                    const isBeingDragged = draggedTaskId === task.id;

                    return (
                      <Card
                        key={task.id}
                        id={`task-card-${task.id}`}
                        draggable={canMove}
                        onDragStart={(e) => handleDragStart(e, task.id)}
                        onDragEnd={handleDragEnd}
                        onClick={() => setSelectedDetailTask(task)}
                        className={`border-border/80 hover:shadow-md hover:border-primary/40 hover:-translate-y-0.5 transition-all duration-150 bg-card cursor-pointer group ${
                          canMove ? "cursor-grab active:cursor-grabbing" : ""
                        } ${
                          isBeingDragged ? "opacity-30 scale-95 border-dashed border-primary ring-2 ring-primary/40" : ""
                        } ${
                          isTransitioning ? "animate-slide-out-right pointer-events-none opacity-0" : ""
                        } ${
                          isJustArrived ? "animate-slide-in-left ring-2 ring-primary shadow-xl bg-primary/5" : ""
                        } motion-reduce:animate-none motion-reduce:transform-none`}
                      >
                        <CardHeader className="p-3.5 pb-2 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <Badge variant={task.priority as any}>{task.priority}</Badge>
                            {canDelete && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setTaskToDelete(task);
                                }}
                                className="opacity-60 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all min-h-[44px] min-w-[44px] flex items-center justify-center -m-1.5 rounded-lg hover:bg-destructive/10 cursor-pointer"
                                title="Delete task"
                                aria-label={`Delete task ${task.title}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>

                          <CardTitle className="text-sm font-semibold leading-snug group-hover:text-primary transition-colors">
                            {task.title}
                          </CardTitle>
                        </CardHeader>

                        <CardContent className="p-3.5 pt-0 space-y-2.5">
                          {task.description && (
                            <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                              {task.description}
                            </p>
                          )}

                          {/* Deadline Badge */}
                          {dlInfo && (
                            <div className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md border text-[10px] ${dlInfo.className}`}>
                              <Calendar className="h-3 w-3 shrink-0" />
                              <span>{dlInfo.label}</span>
                            </div>
                          )}

                          {task.tags && task.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {task.tags.map((tag) => (
                                <button
                                  key={tag}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSearchQuery(tag);
                                  }}
                                  className="inline-flex items-center rounded-md bg-muted/80 hover:bg-primary/10 hover:text-primary px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground transition-colors cursor-pointer"
                                  title={`Filter by #${tag}`}
                                >
                                  #{tag}
                                </button>
                              ))}
                            </div>
                          )}

                          {/* Card Footer: Assignee Stack & Next Stage */}
                          <div className="flex items-center justify-between pt-2 border-t border-border/50">
                            {/* Multi-Avatar Stack */}
                            <div className="flex items-center gap-1.5">
                              {taskAssignees.length > 0 ? (
                                <div className="flex items-center -space-x-1.5">
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
                                        title={`${a.name || a.email} (${a.email})`}
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
                              {canMove && col.id !== "done" && (
                                <button
                                  disabled={isTransitioning}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const nextStatus: TaskStatus = col.id === "todo" ? "in_progress" : "done";
                                    handleStatusChange(task.id, nextStatus);
                                  }}
                                  className="group/btn flex items-center gap-1.5 rounded-lg bg-secondary/80 hover:bg-primary hover:text-primary-foreground min-h-[44px] px-3 py-2 text-xs font-semibold text-secondary-foreground transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                  title="Move to next stage"
                                  aria-label={`Advance task ${task.title} to next column`}
                                >
                                  <span>Next</span>
                                  <ArrowRight className="h-3.5 w-3.5 group-hover/btn:translate-x-0.5 transition-transform" />
                                </button>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}

                  {colTasks.length === 0 && !isDroppingHere && (
                    <div className="flex flex-col items-center justify-center h-36 rounded-xl border border-dashed border-border/70 text-muted-foreground p-4 text-center space-y-2 bg-muted/10">
                      <p className="text-xs">No tasks in this stage</p>
                      {canCreate && col.id === "todo" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setIsModalOpen(true)}
                          className="h-8 text-xs gap-1 shadow-2xs"
                        >
                          <Plus className="h-3 w-3" />
                          <span>Add Task</span>
                        </Button>
                      )}
                    </div>
                  )}
                </div>
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
        onClose={handleCloseDetailModal}
        onTaskUpdated={fetchTasksAndMembers}
        onTaskDeleted={() => {
          handleCloseDetailModal();
          fetchTasksAndMembers();
        }}
        members={members}
      />

      {/* Sprint Health & Workload Analytics Modal */}
      <SprintAnalyticsModal
        isOpen={isAnalyticsOpen}
        onClose={() => setIsAnalyticsOpen(false)}
        tasks={tasks}
        members={members}
        workspaceName={activeWorkspace?.name}
        onSelectTask={(task) => setSelectedDetailTask(task)}
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

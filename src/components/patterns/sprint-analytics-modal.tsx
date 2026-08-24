"use client";

import React from "react";
import { Modal } from "@/components/ui/modal";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Task, WorkspaceMember } from "@/lib/tasks-store";
import {
  TrendingUp,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Users,
  Flame,
  Calendar,
  Layers,
  ChevronRight,
  Shield,
} from "lucide-react";

interface SprintAnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: Task[];
  members: WorkspaceMember[];
  workspaceName?: string;
  onSelectTask?: (task: Task) => void;
}

export function SprintAnalyticsModal({
  isOpen,
  onClose,
  tasks,
  members,
  workspaceName,
  onSelectTask,
}: SprintAnalyticsModalProps) {
  if (!isOpen) return null;

  const totalTasks = tasks.length;
  const doneTasks = tasks.filter((t) => t.status === "done");
  const inProgressTasks = tasks.filter((t) => t.status === "in_progress" || t.status === "review");
  const todoTasks = tasks.filter((t) => t.status === "todo");

  const completionRate = totalTasks > 0 ? Math.round((doneTasks.length / totalTasks) * 100) : 0;

  // Priority Breakdown
  const urgentTasks = tasks.filter((t) => t.priority === "urgent");
  const highTasks = tasks.filter((t) => t.priority === "high");
  const mediumTasks = tasks.filter((t) => t.priority === "medium");
  const lowTasks = tasks.filter((t) => t.priority === "low");

  const urgentPct = totalTasks > 0 ? Math.round((urgentTasks.length / totalTasks) * 100) : 0;
  const highPct = totalTasks > 0 ? Math.round((highTasks.length / totalTasks) * 100) : 0;
  const mediumPct = totalTasks > 0 ? Math.round((mediumTasks.length / totalTasks) * 100) : 0;
  const lowPct = totalTasks > 0 ? Math.round((lowTasks.length / totalTasks) * 100) : 0;

  // Deadlines Analysis (Due in next 7 days or overdue)
  const now = new Date();
  const nowMs = now.getTime();
  const sevenDaysMs = nowMs + 7 * 24 * 60 * 60 * 1000;

  const deadlineTasks = tasks
    .filter((t) => t.due_date || t.dueDate)
    .map((t) => {
      const d = new Date(t.due_date || t.dueDate || "");
      const isOverdue = d.getTime() < nowMs && t.status !== "done";
      const isDueSoon = d.getTime() >= nowMs && d.getTime() <= sevenDaysMs && t.status !== "done";
      return { task: t, date: d, isOverdue, isDueSoon };
    })
    .filter((item) => item.isOverdue || item.isDueSoon)
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  // Member Workload Distribution
  const memberWorkloads = members.map((m) => {
    const email = m.email.toLowerCase();
    const assignedTasks = tasks.filter((t) => {
      if (t.assignees && t.assignees.length > 0) {
        return t.assignees.some((a) => a.email.toLowerCase() === email);
      }
      return t.assignee_email?.toLowerCase() === email;
    });

    const activeCount = assignedTasks.filter((t) => t.status !== "done").length;
    const doneCount = assignedTasks.filter((t) => t.status === "done").length;

    let workloadStatus: "Heavy" | "Optimal" | "Available" = "Optimal";
    if (activeCount >= 4) workloadStatus = "Heavy";
    else if (activeCount === 0) workloadStatus = "Available";

    return {
      member: m,
      totalAssigned: assignedTasks.length,
      activeCount,
      doneCount,
      workloadStatus,
    };
  });

  // Sort by active workload descending
  memberWorkloads.sort((a, b) => b.activeCount - a.activeCount);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Sprint Velocity & Workload Analytics"
      description={`Real-time health breakdown and capacity matrix for ${workspaceName || "active workspace"}.`}
      className="max-w-2xl"
    >
      <div className="space-y-6 text-xs max-h-[75vh] overflow-y-auto custom-scrollbar pr-1 pt-1">
        {/* Top KPIs Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-xl border border-border/80 bg-secondary/30 space-y-1">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="font-semibold uppercase tracking-wider text-[10px]">Velocity</span>
              <TrendingUp className="h-4 w-4 text-emerald-500" />
            </div>
            <p className="text-xl font-bold text-foreground">{completionRate}%</p>
            <p className="text-[10px] text-muted-foreground">{doneTasks.length} of {totalTasks} finished</p>
          </div>

          <div className="p-3.5 rounded-xl border border-border/80 bg-secondary/30 space-y-1">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="font-semibold uppercase tracking-wider text-[10px]">In Flight</span>
              <Clock className="h-4 w-4 text-blue-500" />
            </div>
            <p className="text-xl font-bold text-blue-500">{inProgressTasks.length}</p>
            <p className="text-[10px] text-muted-foreground">Active deliverables</p>
          </div>

          <div className="p-3.5 rounded-xl border border-border/80 bg-secondary/30 space-y-1">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="font-semibold uppercase tracking-wider text-[10px]">Backlog</span>
              <Layers className="h-4 w-4 text-slate-500" />
            </div>
            <p className="text-xl font-bold text-foreground">{todoTasks.length}</p>
            <p className="text-[10px] text-muted-foreground">Queued to start</p>
          </div>

          <div className="p-3.5 rounded-xl border border-border/80 bg-secondary/30 space-y-1">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="font-semibold uppercase tracking-wider text-[10px]">Urgent / Soon</span>
              <AlertTriangle className="h-4 w-4 text-amber-500" />
            </div>
            <p className="text-xl font-bold text-amber-500">{deadlineTasks.length}</p>
            <p className="text-[10px] text-muted-foreground">Due in 7 days</p>
          </div>
        </div>

        {/* Priority Distribution Matrix */}
        <div className="p-4 rounded-xl border border-border/80 bg-card space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-foreground flex items-center gap-1.5 text-xs">
              <Flame className="h-4 w-4 text-destructive" />
              <span>Priority Composition</span>
            </span>
            <span className="text-[11px] text-muted-foreground">{totalTasks} Total Deliverables</span>
          </div>

          {/* Multi-segment distribution bar */}
          <div className="h-3 w-full rounded-full bg-muted overflow-hidden flex">
            {urgentPct > 0 && (
              <div
                style={{ width: `${urgentPct}%` }}
                className="h-full bg-destructive transition-all"
                title={`Urgent: ${urgentTasks.length} (${urgentPct}%)`}
              />
            )}
            {highPct > 0 && (
              <div
                style={{ width: `${highPct}%` }}
                className="h-full bg-amber-500 transition-all"
                title={`High: ${highTasks.length} (${highPct}%)`}
              />
            )}
            {mediumPct > 0 && (
              <div
                style={{ width: `${mediumPct}%` }}
                className="h-full bg-blue-500 transition-all"
                title={`Medium: ${mediumTasks.length} (${mediumPct}%)`}
              />
            )}
            {lowPct > 0 && (
              <div
                style={{ width: `${lowPct}%` }}
                className="h-full bg-slate-400 transition-all"
                title={`Low: ${lowTasks.length} (${lowPct}%)`}
              />
            )}
          </div>

          {/* Legend Table */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
            <div className="flex items-center gap-2 p-2 rounded-lg bg-secondary/30 border border-border/60">
              <span className="h-2.5 w-2.5 rounded-full bg-destructive shrink-0" />
              <div>
                <p className="font-semibold text-foreground text-[11px]">Urgent ({urgentTasks.length})</p>
                <p className="text-[10px] text-muted-foreground">{urgentPct}% of sprint</p>
              </div>
            </div>

            <div className="flex items-center gap-2 p-2 rounded-lg bg-secondary/30 border border-border/60">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500 shrink-0" />
              <div>
                <p className="font-semibold text-foreground text-[11px]">High ({highTasks.length})</p>
                <p className="text-[10px] text-muted-foreground">{highPct}% of sprint</p>
              </div>
            </div>

            <div className="flex items-center gap-2 p-2 rounded-lg bg-secondary/30 border border-border/60">
              <span className="h-2.5 w-2.5 rounded-full bg-blue-500 shrink-0" />
              <div>
                <p className="font-semibold text-foreground text-[11px]">Medium ({mediumTasks.length})</p>
                <p className="text-[10px] text-muted-foreground">{mediumPct}% of sprint</p>
              </div>
            </div>

            <div className="flex items-center gap-2 p-2 rounded-lg bg-secondary/30 border border-border/60">
              <span className="h-2.5 w-2.5 rounded-full bg-slate-400 shrink-0" />
              <div>
                <p className="font-semibold text-foreground text-[11px]">Low ({lowTasks.length})</p>
                <p className="text-[10px] text-muted-foreground">{lowPct}% of sprint</p>
              </div>
            </div>
          </div>
        </div>

        {/* Team Workload Allocation */}
        <div className="p-4 rounded-xl border border-border/80 bg-card space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-foreground flex items-center gap-1.5 text-xs">
              <Users className="h-4 w-4 text-primary" />
              <span>Team Capacity &amp; Allocation</span>
            </span>
            <span className="text-[11px] text-muted-foreground">{members.length} Members</span>
          </div>

          <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar pr-0.5">
            {memberWorkloads.map(({ member, totalAssigned, activeCount, doneCount, workloadStatus }) => (
              <div
                key={member.email}
                className="flex items-center justify-between p-2.5 rounded-xl border border-border/60 bg-secondary/20 hover:bg-secondary/40 transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0 pr-2">
                  <Avatar name={member.name || member.username || member.email} src={member.avatar_url} size="sm" />
                  <div className="truncate">
                    <p className="font-semibold text-foreground truncate leading-tight">
                      {member.name || member.username || member.email}
                    </p>
                    <p className="text-[10px] text-muted-foreground truncate">{member.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right text-[11px]">
                    <span className="font-bold text-foreground">{activeCount}</span>
                    <span className="text-muted-foreground"> active</span>
                    <span className="text-muted-foreground/60"> • </span>
                    <span className="text-emerald-500 font-semibold">{doneCount}</span>
                    <span className="text-muted-foreground"> done</span>
                  </div>

                  <Badge
                    variant={
                      workloadStatus === "Heavy"
                        ? "destructive"
                        : workloadStatus === "Optimal"
                        ? "secondary"
                        : "outline"
                    }
                    className="text-[9px] uppercase px-1.5 py-0"
                  >
                    {workloadStatus}
                  </Badge>
                </div>
              </div>
            ))}

            {memberWorkloads.length === 0 && (
              <p className="text-center text-muted-foreground py-4 text-xs">No active members in this workspace.</p>
            )}
          </div>
        </div>

        {/* 7-Day Deadline Horizon */}
        <div className="p-4 rounded-xl border border-border/80 bg-card space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-foreground flex items-center gap-1.5 text-xs">
              <Calendar className="h-4 w-4 text-amber-500" />
              <span>Upcoming Milestones (7-Day Horizon)</span>
            </span>
            <span className="text-[11px] text-muted-foreground">{deadlineTasks.length} Upcoming</span>
          </div>

          <div className="space-y-2 max-h-44 overflow-y-auto custom-scrollbar pr-0.5">
            {deadlineTasks.map(({ task, date, isOverdue }) => (
              <div
                key={task.id}
                onClick={() => {
                  if (onSelectTask) {
                    onClose();
                    onSelectTask(task);
                  }
                }}
                className={`flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer ${
                  isOverdue
                    ? "border-destructive/30 bg-destructive/5 hover:bg-destructive/10"
                    : "border-border/60 bg-secondary/20 hover:bg-secondary/40"
                }`}
              >
                <div className="min-w-0 pr-2">
                  <p className="font-semibold text-foreground truncate">{task.title}</p>
                  <p className="text-[10px] text-muted-foreground">
                    Due: {date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant={isOverdue ? "destructive" : "warning"} className="text-[9px] uppercase">
                    {isOverdue ? "Overdue" : "Due Soon"}
                  </Badge>
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                </div>
              </div>
            ))}

            {deadlineTasks.length === 0 && (
              <div className="text-center text-muted-foreground py-3 flex items-center justify-center gap-1.5 text-xs">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <span>All upcoming deadlines are clear!</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}

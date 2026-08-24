"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  CheckSquare,
  Clock,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  RotateCcw,
  Calendar,
  Layers,
  Flame,
} from "lucide-react";

interface DemoTask {
  id: string;
  title: string;
  description: string;
  status: "todo" | "in_progress" | "done";
  priority: "urgent" | "high" | "medium" | "low";
  dueDate: string;
  tags: string[];
  assignee: { name: string; email: string };
}

const INITIAL_DEMO_TASKS: DemoTask[] = [
  {
    id: "demo-1",
    title: "Enforce TOTP 2-Factor Authentication",
    description: "Integrate RFC 6238 time-based one-time passcodes and backup recovery codes.",
    status: "in_progress",
    priority: "urgent",
    dueDate: "Today",
    tags: ["Auth", "Security"],
    assignee: { name: "Sarah Connor", email: "sarah@acme.corp" },
  },
  {
    id: "demo-2",
    title: "Real-Time WebSocket Synchronization",
    description: "Broadcast task status transitions and member invites across client sessions.",
    status: "todo",
    priority: "high",
    dueDate: "Tomorrow",
    tags: ["Backend", "Gateway"],
    assignee: { name: "Alex Chen", email: "alex@acme.corp" },
  },
  {
    id: "demo-3",
    title: "Security Telemetry CSV/JSON Export",
    description: "Allow workspace admins to download immutable audit records for SOC2 compliance.",
    status: "done",
    priority: "medium",
    dueDate: "Friday",
    tags: ["Telemetry", "Compliance"],
    assignee: { name: "Elena Rostova", email: "elena@acme.corp" },
  },
];

export function InteractiveLandingDemo() {
  const [tasks, setTasks] = useState<DemoTask[]>(INITIAL_DEMO_TASKS);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [activeDropCol, setActiveDropCol] = useState<string | null>(null);

  const doneCount = tasks.filter((t) => t.status === "done").length;
  const progressPct = Math.round((doneCount / tasks.length) * 100);

  const handleAdvance = (taskId: string) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== taskId) return t;
        const nextStatus = t.status === "todo" ? "in_progress" : "done";
        return { ...t, status: nextStatus };
      })
    );
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedId(id);
    e.dataTransfer.setData("text/plain", id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, colId: string) => {
    e.preventDefault();
    if (activeDropCol !== colId) setActiveDropCol(colId);
  };

  const handleDrop = (e: React.DragEvent, colId: "todo" | "in_progress" | "done") => {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain") || draggedId;
    setActiveDropCol(null);
    setDraggedId(null);
    if (!id) return;

    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status: colId } : t))
    );
  };

  const handleReset = () => {
    setTasks(INITIAL_DEMO_TASKS);
  };

  const columns: { id: "todo" | "in_progress" | "done"; label: string; accentColor: string; dot: string }[] = [
    { id: "todo", label: "To Do", accentColor: "border-t-indigo-500", dot: "bg-indigo-500" },
    { id: "in_progress", label: "In Progress", accentColor: "border-t-blue-500", dot: "bg-blue-500 animate-pulse" },
    { id: "done", label: "Completed", accentColor: "border-t-emerald-500", dot: "bg-emerald-500" },
  ];

  return (
    <div className="w-full max-w-4xl mx-auto my-8 rounded-2xl border border-border/80 bg-card shadow-2xl overflow-hidden text-left">
      {/* Window Titlebar */}
      <div className="px-4 py-3 border-b border-border/80 bg-secondary/40 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <span className="h-3 w-3 rounded-full bg-destructive/60" />
            <span className="h-3 w-3 rounded-full bg-amber-500/60" />
            <span className="h-3 w-3 rounded-full bg-emerald-500/60" />
          </div>
          <span className="text-xs font-semibold text-foreground/80 ml-2">
            Acme Corp &bull; Sprint Deliverables
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-semibold">
            <Sparkles className="h-3 w-3" />
            <span>Interactive Live Demo</span>
          </div>
          <Button variant="ghost" size="sm" onClick={handleReset} className="h-7 px-2 text-[11px] gap-1" title="Reset Demo Board">
            <RotateCcw className="h-3 w-3" />
            <span className="hidden sm:inline">Reset</span>
          </Button>
        </div>
      </div>

      <div className="p-4 sm:p-6 space-y-4">
        {/* Interactive Sprint Velocity Bar */}
        <div className="p-3 rounded-xl border border-border/70 bg-secondary/20 space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-foreground flex items-center gap-2">
              <span>Sprint Velocity</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted font-medium text-muted-foreground">
                {doneCount} of {tasks.length} Completed
              </span>
            </span>
            <span className="font-bold text-primary">{progressPct}%</span>
          </div>
          <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 transition-all duration-300 rounded-full"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {/* 3 Interactive Columns */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {columns.map((col) => {
            const colTasks = tasks.filter((t) => t.status === col.id);
            const isDropTarget = activeDropCol === col.id && draggedId !== null;

            return (
              <div
                key={col.id}
                onDragOver={(e) => handleDragOver(e, col.id)}
                onDrop={(e) => handleDrop(e, col.id)}
                className={`flex flex-col rounded-xl border p-3 min-h-[260px] transition-all ${
                  isDropTarget
                    ? "border-primary/80 bg-primary/5 ring-2 ring-primary/30"
                    : "border-border/70 bg-secondary/20"
                } ${col.accentColor}`}
              >
                {/* Column Header */}
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-border/60">
                  <div className="flex items-center gap-1.5">
                    <span className={`h-2 w-2 rounded-full ${col.dot}`} />
                    <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                      {col.label}
                    </span>
                  </div>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">
                    {colTasks.length}
                  </span>
                </div>

                {/* Cards Container */}
                <div className="space-y-2.5 flex-1">
                  {colTasks.map((task) => {
                    const isDragging = draggedId === task.id;

                    return (
                      <div
                        key={task.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, task.id)}
                        onDragEnd={() => {
                          setDraggedId(null);
                          setActiveDropCol(null);
                        }}
                        className={`p-3 rounded-xl border border-border/80 bg-card shadow-xs transition-all cursor-grab active:cursor-grabbing hover:border-primary/40 hover:shadow-md ${
                          isDragging ? "opacity-30 border-dashed border-primary" : ""
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1.5 mb-1.5">
                          <Badge variant={task.priority as any} className="text-[9px] uppercase px-1.5 py-0">
                            {task.priority}
                          </Badge>
                          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                            <Calendar className="h-2.5 w-2.5" />
                            <span>{task.dueDate}</span>
                          </div>
                        </div>

                        <h4 className="text-xs font-semibold text-foreground leading-snug mb-1">
                          {task.title}
                        </h4>
                        <p className="text-[11px] text-muted-foreground line-clamp-2 mb-2 leading-relaxed">
                          {task.description}
                        </p>

                        <div className="flex items-center justify-between pt-1.5 border-t border-border/40 text-[11px]">
                          <div className="flex items-center gap-1.5">
                            <Avatar name={task.assignee.name} size="sm" />
                            <span className="text-[10px] font-medium text-foreground/80 truncate max-w-[80px]">
                              {task.assignee.name.split(" ")[0]}
                            </span>
                          </div>

                          {col.id !== "done" && (
                            <button
                              type="button"
                              onClick={() => handleAdvance(task.id)}
                              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-secondary/80 hover:bg-primary hover:text-primary-foreground text-[10px] font-semibold text-secondary-foreground transition-all cursor-pointer"
                              title="Advance to next column"
                            >
                              <span>Next</span>
                              <ArrowRight className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {colTasks.length === 0 && (
                    <div className="flex items-center justify-center h-28 rounded-lg border border-dashed border-border/60 text-muted-foreground text-[11px]">
                      Drop task here
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* CTA Footer in Demo */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs border-t border-border/60">
          <p className="text-muted-foreground text-[11px] text-center sm:text-left">
            Experience end-to-end team velocity tracking, role clearances, and TOTP authentication.
          </p>
          <Link href="/register">
            <Button size="sm" className="gap-1.5 shadow-sm text-xs font-semibold">
              <span>Start Free Workspace</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

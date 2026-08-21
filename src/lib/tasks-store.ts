/**
 * Task and Team Data Models (src/lib/tasks-store.ts)
 * --------------------------------------------------
 * Type definitions for persistent database tasks and team entities.
 * Zero mock data.
 */

export type TaskStatus = "todo" | "in_progress" | "review" | "done";
export type TaskPriority = "low" | "medium" | "high" | "urgent";

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignee_email?: string;
  assignee_name?: string;
  assignee_avatar?: string;
  assignees?: {
    email: string;
    name: string;
    avatar_url?: string;
  }[];
  created_by: string;
  createdAt?: string;
  created_at?: string;
  dueDate?: string;
  due_date?: string;
  tags: string[];
}


export interface TeamMember {
  id: string;
  email: string;
  name: string;
  role: "admin" | "editor" | "viewer";
  department: string;
  avatar_url?: string;
  status: "active" | "invited";
  invited_at?: string;
  invitedAt?: string;
}


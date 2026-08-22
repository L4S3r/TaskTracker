"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth-context";
import { Building2, AlertCircle, Sparkles } from "lucide-react";

interface CreateWorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function CreateWorkspaceModal({ isOpen, onClose, onSuccess }: CreateWorkspaceModalProps) {
  const { createWorkspace } = useAuth();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleNameChange = (val: string) => {
    setName(val);
    if (!slug || slug === name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")) {
      const autoSlug = val.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      setSlug(autoSlug);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || name.trim().length < 2) {
      setError("Workspace name must be at least 2 characters.");
      return;
    }
    if (name.trim().length > 100) {
      setError("Workspace name cannot exceed 100 characters.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await createWorkspace({
        name: name.trim(),
        slug: slug.trim() || undefined,
        description: description.trim() || undefined,
      });

      setName("");
      setSlug("");
      setDescription("");
      onClose();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setError(err.message || "Failed to create workspace. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create New Workspace"
      description="Workspaces isolate team tasks, role clearances, and collaborator rosters."
    >
      <form onSubmit={handleSubmit} className="space-y-4 pt-1">
        {error && (
          <div className="flex items-center gap-2 rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive font-medium">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex items-center justify-center p-3 bg-primary/10 rounded-2xl border border-primary/20">
          <Building2 className="h-7 w-7 text-primary" />
        </div>

        <Input
          label="Workspace Name"
          type="text"
          required
          placeholder="e.g. Mobile Team, Frontend Core, Security Ops"
          value={name}
          onChange={(e) => handleNameChange(e.target.value)}
          minLength={2}
          maxLength={100}
        />

        <Input
          label="Custom URL Slug (Optional)"
          type="text"
          placeholder="e.g. mobile-team"
          value={slug}
          onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
        />

        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-foreground/80 tracking-wide uppercase">
            Description (Optional)
          </label>
          <textarea
            rows={2}
            className="flex w-full rounded-lg border border-input bg-background dark:bg-slate-900/80 px-3.5 py-2 text-sm text-foreground placeholder:text-muted-foreground transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary custom-scrollbar resize-none"
            placeholder="Sprint deliverables, target initiatives, or team scope..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div className="flex justify-end gap-2.5 pt-3 border-t border-border/70">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" size="sm" isLoading={isSubmitting} className="gap-1.5">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Create & Enter Workspace</span>
          </Button>
        </div>
      </form>
    </Modal>
  );
}

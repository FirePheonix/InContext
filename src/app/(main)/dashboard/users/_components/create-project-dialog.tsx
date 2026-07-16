"use client";

import { startTransition, useState } from "react";

import { useRouter } from "next/navigation";

import { Plus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

import { createProjectAction } from "../actions";

const initialForm = {
  architecturePath: "",
  contextPath: "",
  defaultBranch: "main",
  description: "",
  directCommitEnabled: false,
  name: "",
  repoLocalPath: "",
  repoUrl: "",
  slug: "",
};

export function CreateProjectDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [form, setForm] = useState(initialForm);

  function updateField(field: keyof typeof initialForm, value: string | boolean) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function resetForm() {
    setForm(initialForm);
  }

  function submitProject() {
    if (!form.name.trim()) {
      toast.error("Project name is required.");
      return;
    }

    setPending(true);

    startTransition(async () => {
      try {
        await createProjectAction(form);
        toast.success("Project created.");
        setOpen(false);
        resetForm();
        router.refresh();
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to create project.";
        toast.error(message);
      } finally {
        setPending(false);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus />
          New Project
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Create project</DialogTitle>
          <DialogDescription>
            Register a new project so agents can attach summaries, repo links, architecture docs, and scoped tokens.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          <Input
            placeholder="Project name"
            value={form.name}
            onChange={(event) => updateField("name", event.target.value)}
          />
          <Input
            placeholder="Slug (optional)"
            value={form.slug}
            onChange={(event) => updateField("slug", event.target.value)}
          />
          <Textarea
            placeholder="Short project summary"
            value={form.description}
            onChange={(event) => updateField("description", event.target.value)}
          />
          <Input
            placeholder="Repository URL"
            value={form.repoUrl}
            onChange={(event) => updateField("repoUrl", event.target.value)}
          />
          <Input
            placeholder="Local repo path (optional)"
            value={form.repoLocalPath}
            onChange={(event) => updateField("repoLocalPath", event.target.value)}
          />
          <div className="grid gap-3 sm:grid-cols-3">
            <Input
              placeholder="Default branch"
              value={form.defaultBranch}
              onChange={(event) => updateField("defaultBranch", event.target.value)}
            />
            <Input
              placeholder="Context path"
              value={form.contextPath}
              onChange={(event) => updateField("contextPath", event.target.value)}
            />
            <Input
              placeholder="Architecture path"
              value={form.architecturePath}
              onChange={(event) => updateField("architecturePath", event.target.value)}
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.directCommitEnabled}
              onChange={(event) => updateField("directCommitEnabled", event.target.checked)}
            />
            Enable direct local git commits for this project
          </label>
        </div>

        <DialogFooter showCloseButton>
          <Button onClick={submitProject} disabled={pending}>
            {pending ? "Creating..." : "Create project"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

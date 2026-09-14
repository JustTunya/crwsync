"use client";

import { useState, useTransition, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import { AlertCircleIcon, ArrowRight01Icon } from "@hugeicons/core-free-icons";

import { useWorkspace } from "@/providers/workspace.provider";
import { useWorkspaces } from "@/hooks/use-workspaces";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function CreateWorkspaceForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [isSlugManual, setIsSlugManual] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const { createWorkspace } = useWorkspace();
  const { data: workspaces = [] } = useWorkspaces();

  const hasExistingWorkspaces = workspaces.length > 0;

  const getTargetWorkspaceSlug = useCallback(() => {
    if (!hasExistingWorkspaces) return null;
    const lastWsId = typeof window !== "undefined" ? localStorage.getItem("crw-ws") : null;
    const lastWs = workspaces.find((w) => w.workspace_id === lastWsId);
    return lastWs?.workspace?.slug || workspaces[0]?.workspace?.slug || null;
  }, [hasExistingWorkspaces, workspaces]);

  const handleCancel = useCallback(() => {
    const targetSlug = getTargetWorkspaceSlug();
    if (targetSlug) {
      router.push(`/${targetSlug}`);
    } else {
      const webUrl = process.env.NEXT_PUBLIC_WEB_URL || "/";
      window.location.assign(webUrl);
    }
  }, [getTargetWorkspaceSlug, router]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && hasExistingWorkspaces && !pending) {
        handleCancel();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [hasExistingWorkspaces, pending, handleCancel]);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value;
    setName(newName);
    setErrorMessage(null);

    if (!isSlugManual) {
      setSlug(slugify(newName));
    }
  };

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "");
    setSlug(raw);
    setIsSlugManual(raw.length > 0);
    setErrorMessage(null);
  };

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!name.trim() || !slug.trim()) return;

    setErrorMessage(null);
    start(async () => {
      try {
        await createWorkspace({ name: name.trim(), slug: slug.trim() });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to create workspace. Please try again.";
        setErrorMessage(message);
      }
    });
  };

  const initials = (name.trim() ? `${name.trim().charAt(0)}${name.trim().charAt(1) || ""}` : "WS").toUpperCase();

  return (
    <form onSubmit={onSubmit} className="w-full space-y-5">
      {errorMessage && (
        <div
          role="alert"
          className="flex items-start gap-2.5 p-3.5 text-xs sm:text-sm text-error bg-error/10 border border-error/25 rounded-lg transition-all animate-in fade-in"
        >
          <HugeiconsIcon icon={AlertCircleIcon} size={18} strokeWidth={2} className="size-4.5 shrink-0 mt-0.5 text-error" />
          <div className="space-y-0.5">
            <p className="font-medium text-foreground">{errorMessage}</p>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label
            htmlFor="ws-name"
            className="flex items-center gap-1.5 text-xs sm:text-sm font-medium text-foreground select-none"
          >
            <span>Workspace name</span>
            <span className="text-primary">*</span>
          </label>
          <span className="text-[11px] text-muted-foreground">e.g. Acme Corp</span>
        </div>

        <div className="flex items-center gap-2.5">
          <div
            className="size-9 shrink-0 rounded-md bg-primary/10 border border-primary/25 flex items-center justify-center text-primary font-semibold text-xs tracking-wider shadow-xs select-none"
            title="Workspace avatar preview"
            aria-hidden="true"
          >
            {initials}
          </div>
          <Input
            id="ws-name"
            value={name}
            onChange={handleNameChange}
            placeholder="Acme Inc."
            autoFocus
            required
            disabled={pending}
            className="flex-1"
          />
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label
            htmlFor="ws-slug"
            className="flex items-center gap-1.5 text-xs sm:text-sm font-medium text-foreground select-none"
          >
            <span>Workspace URL slug</span>
            <span className="text-primary">*</span>
          </label>
          <span className="text-[11px] text-muted-foreground">Letters, numbers, hyphens</span>
        </div>

        <Input
          id="ws-slug"
          value={slug}
          onChange={handleSlugChange}
          placeholder="acme"
          required
          disabled={pending}
          prefix={
            <span className="text-xs text-muted-foreground font-mono select-none pr-1">
              dash.crwsync.xyz/
            </span>
          }
        />
      </div>

      <div className="pt-2 flex flex-col-reverse sm:flex-row items-center gap-2.5">
        {hasExistingWorkspaces && (
          <Button
            type="button"
            variant="outline"
            onClick={handleCancel}
            disabled={pending}
            className="w-full sm:w-auto sm:min-w-[100px]"
          >
            Cancel
          </Button>
        )}

        <Button
          type="submit"
          disabled={pending || !name.trim() || !slug.trim()}
          className="w-full sm:flex-1 group"
        >
          {pending ? (
            <span className="flex items-center gap-2">
              <span className="size-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
              <span>Creating workspace...</span>
            </span>
          ) : (
            <span className="flex items-center justify-center gap-1.5">
              <span>Create Workspace</span>
              <HugeiconsIcon
                icon={ArrowRight01Icon}
                size={16}
                strokeWidth={2}
                className="size-4 transition-transform duration-200 group-hover:translate-x-0.5"
              />
            </span>
          )}
        </Button>
      </div>
    </form>
  );
}

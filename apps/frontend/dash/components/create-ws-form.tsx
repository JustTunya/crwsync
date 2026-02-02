"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useWorkspace } from "@/providers/workspace.provider";

export function CreateWorkspaceForm() {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [pending, start] = useTransition();

  const { createWorkspace } = useWorkspace();

  const router = useRouter();

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    start(async () => {
      await createWorkspace({ name, slug }).then(() => {
        setName("");
        setSlug("");
        router.push("/");
      });
    });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-1">
        <label htmlFor="ws-name" className="text-sm text-muted-foreground">
          Workspace name
        </label>
        <input
          id="ws-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm"
          placeholder="Acme Inc."
          required
        />
      </div>

      <div className="space-y-1">
        <label htmlFor="ws-slug" className="text-sm text-muted-foreground">
          Workspace slug
        </label>
        <input
          id="ws-slug"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm"
          placeholder="acme"
          required
        />
      </div>

      <button
        type="submit"
        disabled={pending || !name || !slug}
        className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-60"
      >
        {pending ? "Creating..." : "Create Workspace"}
      </button>
    </form>
  );
}
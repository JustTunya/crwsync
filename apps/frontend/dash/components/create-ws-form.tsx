"use client";

import { useState, useTransition } from "react";

import { useWorkspace } from "@/providers/workspace.provider";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

export function CreateWorkspaceForm() {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [pending, start] = useTransition();

  const { createWorkspace } = useWorkspace();



  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    start(async () => {
      await createWorkspace({ name, slug }).then(() => {
        setName("");
        setSlug("");
      });
    });
  };

  return (
    <form onSubmit={onSubmit} className="w-full space-y-4">
      <div className="space-y-2 sm:space-y-3">
        <label 
          htmlFor="ws-name" 
          className="flex items-center gap-2 text-xs sm:text-[13px] font-light tracking-wider leading-none select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50"
        >
          Workspace name
        </label>
        <Input
          id="ws-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Acme Inc."
          required
        />
      </div>

      <div className="space-y-2 sm:space-y-3">
        <label 
          htmlFor="ws-slug" 
          className="flex items-center gap-2 text-xs sm:text-[13px] font-light tracking-wider leading-none select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50"
        >
          Workspace slug
        </label>
        <Input
          id="ws-slug"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          placeholder="acme"
          required
        />
      </div>

      <Button
        type="submit"
        disabled={pending || !name || !slug}
        className="w-full"
      >
        {pending ? "Creating..." : "Create Workspace"}
      </Button>
    </form>
  );
}
"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { m, AnimatePresence, LazyMotion, domAnimation } from "framer-motion";
import { HugeiconsIcon, HugeiconsIconProps } from "@hugeicons/react";
import {
  Cancel01Icon,
  Chat01Icon,
  KanbanIcon,
  Database01Icon,
  ArrowRight01Icon,
  ArrowLeft01Icon,
  Folder01Icon,
  PlusSignIcon,
  SparklesIcon,
} from "@hugeicons/core-free-icons";
import { useWorkspace } from "@/providers/workspace.provider";
import { useWorkspaceProjects } from "@/hooks/use-workspace-projects";
import { useCreateBoard } from "@/hooks/use-boards";
import { useCreateChatRoom } from "@/hooks/use-chat";
import { useCreateFileRoom } from "@/hooks/use-files";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

enum ModuleType {
  BOARD = "BOARD",
  CHAT = "CHAT",
  FILES = "FILES",
}

interface ModuleOption {
  type: ModuleType;
  label: string;
  tagline: string;
  description: string;
  icon: HugeiconsIconProps["icon"];
  features: string[];
  placeholder: string;
  suggestions: string[];
}

const MODULE_OPTIONS: ModuleOption[] = [
  {
    type: ModuleType.BOARD,
    label: "Task Board",
    tagline: "Kanban & Sprints",
    description: "Visual workflow to manage tasks, customizable columns, and real-time team assignments.",
    icon: KanbanIcon,
    features: ["Custom Columns", "Task Details", "Live Sync"],
    placeholder: "e.g. Sprint Backlog",
    suggestions: ["Sprint Planning", "Product Roadmap", "Bug Tracker", "Dev Backlog"],
  },
  {
    type: ModuleType.CHAT,
    label: "Chat Room",
    tagline: "Real-time Channels",
    description: "Dedicated channels for live crew discussions, instant messaging, and team presence.",
    icon: Chat01Icon,
    features: ["Instant Chat", "Live Reactions", "Rich Text"],
    placeholder: "e.g. General Discussion",
    suggestions: ["General Crew", "Engineering", "Design Review", "Announcements"],
  },
  {
    type: ModuleType.FILES,
    label: "Team Drive",
    tagline: "Cloud File Rooms",
    description: "Centralized file vault for project documents, design assets, and shared attachments.",
    icon: Database01Icon,
    features: ["File Vaults", "Asset Previews", "Crew Access"],
    placeholder: "e.g. Project Assets",
    suggestions: ["Project Assets", "Documentation", "Design Vault", "Release Builds"],
  },
];

export function AddModuleModal({
  isOpen,
  onClose,
  projectId,
}: {
  isOpen: boolean;
  onClose: () => void;
  projectId?: string;
}) {
  const { activeId } = useWorkspace();
  const { data: projects } = useWorkspaceProjects(activeId || "");
  const createBoard = useCreateBoard(activeId || "");
  const createChatRoom = useCreateChatRoom(activeId || "");
  const createFileRoom = useCreateFileRoom(activeId || "");

  const [step, setStep] = useState<"select" | "configure">("select");
  const [selectedType, setSelectedType] = useState<ModuleType | null>(null);
  const [name, setName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const currentProject = useMemo(
    () => projects?.find((p) => p.id === projectId),
    [projects, projectId]
  );

  const selectedOption = useMemo(
    () => MODULE_OPTIONS.find((o) => o.type === selectedType),
    [selectedType]
  );

  const isPending =
    createBoard.isPending || createChatRoom.isPending || createFileRoom.isPending;

  useEffect(() => {
    if (step === "configure") {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [step]);

  const handleClose = () => {
    setStep("select");
    setSelectedType(null);
    setName("");
    onClose();
  };

  const handleSelectType = (type: ModuleType) => {
    setSelectedType(type);
    setStep("configure");
  };

  const handleCreate = async () => {
    if (!name.trim() || !selectedType || isPending) return;

    try {
      if (selectedType === ModuleType.BOARD) {
        await createBoard.mutateAsync({ name: name.trim(), project_id: projectId });
      } else if (selectedType === ModuleType.CHAT) {
        await createChatRoom.mutateAsync({ name: name.trim(), project_id: projectId });
      } else if (selectedType === ModuleType.FILES) {
        await createFileRoom.mutateAsync({ name: name.trim(), project_id: projectId });
      }
      handleClose();
    } catch (error) {
      console.error("Failed to create module:", error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent
        showCloseButton={false}
        className={cn(
          "max-w-lg w-full max-h-[calc(100dvh-2rem)] flex flex-col p-0 gap-0 overflow-hidden border-[1.5px] border-base-200/90 dark:border-white/10",
          "bg-base-100/95 dark:bg-base-100/90 backdrop-blur-xl shadow-2xl shadow-black/10 rounded-2xl"
        )}
      >
        <DialogTitle className="sr-only">
          {step === "select" ? "Add Workspace Module" : `Configure ${selectedOption?.label || "Module"}`}
        </DialogTitle>
        <DialogDescription className="sr-only">
          {step === "select"
            ? "Choose a module to expand your workspace capabilities."
            : "Set a custom name for your new workspace module."}
        </DialogDescription>

        <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-primary/35 to-transparent pointer-events-none" />

        {/* MODAL HEADER */}
        <div className="flex items-start justify-between p-4 sm:p-6 pb-3 sm:pb-4 border-b border-base-200/70 shrink-0">
          <div className="flex items-start gap-2.5 sm:gap-3.5 min-w-0">
            <div className="size-8 sm:size-10 rounded-lg sm:rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0 shadow-xs">
              <HugeiconsIcon
                icon={step === "select" ? PlusSignIcon : selectedOption?.icon || PlusSignIcon}
                className="size-4 sm:size-5"
                strokeWidth={2}
              />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-bold tracking-tight text-foreground font-figtree truncate">
                {step === "select" ? "Add Module" : `Configure ${selectedOption?.label}`}
              </h2>
              <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5 leading-tight sm:leading-normal line-clamp-1 sm:line-clamp-none">
                {step === "select"
                  ? "Choose a specialized tool to enhance your crew workspace."
                  : "Give your module a clear name to help your crew stay organized."}
              </p>

              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-medium bg-base-200/80 border border-base-300/50 text-muted-foreground mt-1.5 sm:mt-2">
                {currentProject ? (
                  <>
                    {currentProject.color ? (
                      <span
                        className="size-1.5 sm:size-2 rounded-full shrink-0"
                        style={{ backgroundColor: currentProject.color }}
                      />
                    ) : (
                      <HugeiconsIcon icon={Folder01Icon} className="size-3 text-primary shrink-0" strokeWidth={2} />
                    )}
                    <span className="truncate max-w-[160px] sm:max-w-[200px]">Project: {currentProject.name}</span>
                  </>
                ) : (
                  <>
                    <span className="size-1.5 rounded-full bg-primary shrink-0" />
                    <span>Shared Module</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <button
            type="button"
            title="Close"
            onClick={handleClose}
            className="size-7 sm:size-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-base-200 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring shrink-0 cursor-pointer"
          >
            <HugeiconsIcon icon={Cancel01Icon} className="size-3.5 sm:size-4" strokeWidth={2} />
          </button>
        </div>

        {/* MODAL BODY */}
        <div className="overflow-y-auto flex-1 p-3.5 sm:p-6 pt-3 sm:pt-5 overscroll-contain">
          <LazyMotion features={domAnimation} strict>
            <AnimatePresence mode="wait" initial={false}>
              {step === "select" ? (
                <m.div
                  key="select-step"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                  className="space-y-2 sm:space-y-3"
                >
                  <div className="grid gap-2 sm:gap-2.5">
                    {MODULE_OPTIONS.map((option) => (
                      <ModuleSelectCard
                        key={option.type}
                        option={option}
                        onClick={() => handleSelectType(option.type)}
                      />
                    ))}
                  </div>
                </m.div>
              ) : (
                <m.div
                  key="configure-step"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                  className="space-y-4 sm:space-y-5"
                >
                  {selectedOption && (
                    <div className="flex items-center justify-between p-2.5 sm:p-3 rounded-xl bg-base-200/50 border border-base-300/60 shrink-0">
                      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                        <div className="size-7 sm:size-8 rounded-lg bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0">
                          <HugeiconsIcon icon={selectedOption.icon} className="size-3.5 sm:size-4" strokeWidth={2} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-foreground leading-tight whitespace-nowrap">{selectedOption.label}</p>
                          <p className="text-[10px] sm:text-[11px] text-muted-foreground leading-tight truncate">{selectedOption.tagline}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setStep("select")}
                        className="text-[11px] sm:text-xs font-semibold text-primary hover:underline px-1.5 sm:px-2 py-0.5 sm:py-1 rounded cursor-pointer shrink-0"
                      >
                        Change type
                      </button>
                    </div>
                  )}

                  <div className="space-y-1.5 sm:space-y-2">
                    <div className="flex items-center justify-between">
                      <label htmlFor="module-name-input" className="text-xs font-semibold text-foreground">
                        Module Name
                      </label>
                      <span className="text-[10px] sm:text-[11px] text-muted-foreground">Required</span>
                    </div>
                    <Input
                      id="module-name-input"
                      ref={inputRef}
                      value={name}
                      placeholder={selectedOption?.placeholder || "e.g. Project Backlog"}
                      onChange={(e) => setName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleCreate();
                        } else if (e.key === "Escape") {
                          e.preventDefault();
                          setStep("select");
                        }
                      }}
                      className="bg-base-200/60 border-base-300/80 focus-visible:border-primary focus-visible:ring-primary/25 h-9 sm:h-10 text-xs sm:text-sm"
                    />
                  </div>

                  {selectedOption && selectedOption.suggestions.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-[10px] sm:text-[11px] font-medium text-muted-foreground flex items-center gap-1">
                        <HugeiconsIcon icon={SparklesIcon} className="size-3 text-primary" strokeWidth={2} />
                        Quick suggestions
                      </p>
                      <div className="flex flex-wrap gap-1 sm:gap-1.5">
                        {selectedOption.suggestions.map((suggestion) => (
                          <button
                            key={suggestion}
                            type="button"
                            onClick={() => setName(suggestion)}
                            className={cn(
                              "text-[11px] sm:text-xs px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-lg border border-base-300/70 bg-base-200/40 hover:bg-base-200 hover:border-primary/40 transition-colors text-muted-foreground hover:text-foreground cursor-pointer font-medium whitespace-nowrap",
                              name === suggestion && "bg-primary/10 border-primary/40 text-primary font-semibold"
                            )}
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-2 sm:gap-2.5 pt-2 border-t border-base-200/70 shrink-0">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setStep("select")}
                      className="w-auto px-3 sm:px-4 h-8 sm:h-9 text-xs sm:text-sm gap-1.5"
                    >
                      <HugeiconsIcon icon={ArrowLeft01Icon} className="size-3.5 sm:size-4" strokeWidth={2} />
                      Back
                    </Button>
                    <Button
                      type="button"
                      onClick={handleCreate}
                      disabled={!name.trim() || isPending}
                      className="w-auto px-4 sm:px-6 h-8 sm:h-9 text-xs sm:text-sm font-semibold"
                    >
                      {isPending ? "Creating..." : "Create Module"}
                    </Button>
                  </div>
                </m.div>
              )}
            </AnimatePresence>
          </LazyMotion>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ModuleSelectCard({
  option,
  onClick,
}: {
  option: ModuleOption;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group relative flex items-start gap-2.5 sm:gap-3.5 p-2.5 sm:p-3.5 rounded-xl border-[1.5px] border-base-200/80",
        "bg-base-100/50 hover:bg-base-200/50 hover:border-primary/40 focus-visible:border-primary",
        "focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none transition-all duration-200",
        "text-left cursor-pointer shadow-xs hover:shadow-md w-full"
      )}
    >
      <div className="size-8 sm:size-10 rounded-lg sm:rounded-xl bg-base-200/90 border border-base-300/60 text-foreground/80 group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary group-hover:shadow-md group-hover:shadow-primary/25 flex items-center justify-center shrink-0 transition-all duration-200 mt-0.5">
        <HugeiconsIcon icon={option.icon} strokeWidth={2} className="size-4 sm:size-5" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-1.5 sm:gap-2 mb-0.5 min-w-0">
          <p className="font-bold text-xs sm:text-sm text-foreground group-hover:text-primary transition-colors font-figtree whitespace-nowrap">
            {option.label}
          </p>
          <span className="text-[9px] sm:text-[10px] font-semibold uppercase tracking-wider px-1.5 sm:px-2 py-0.2 rounded-full bg-base-200 border border-base-300/50 text-muted-foreground group-hover:border-primary/30 group-hover:text-foreground transition-colors whitespace-nowrap shrink-0">
            {option.tagline}
          </span>
        </div>
        <p className="text-[11px] sm:text-xs text-muted-foreground leading-snug sm:leading-relaxed line-clamp-2">
          {option.description}
        </p>

        <div className="flex flex-wrap items-center gap-1 mt-1.5 sm:mt-2">
          {option.features.map((feat) => (
            <span
              key={feat}
              className="text-[9px] sm:text-[10px] font-medium text-muted-foreground bg-base-200/70 border border-base-300/40 px-1.5 py-0.5 rounded-md whitespace-nowrap"
            >
              {feat}
            </span>
          ))}
        </div>
      </div>

      <div className="size-6 sm:size-7 rounded-lg flex items-center justify-center text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-0.5 group-hover:bg-primary/10 transition-all shrink-0 mt-0.5">
        <HugeiconsIcon icon={ArrowRight01Icon} className="size-3.5 sm:size-4" strokeWidth={2} />
      </div>
    </button>
  );
}

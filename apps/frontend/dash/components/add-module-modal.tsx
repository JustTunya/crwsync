"use client";

import { useState, useMemo } from "react";
import { HugeiconsIcon, HugeiconsIconProps } from "@hugeicons/react";
import { Cancel01Icon, Chat01Icon, DashboardSquare01Icon } from "@hugeicons/core-free-icons";
import { useWorkspace } from "@/providers/workspace.provider";
import { useCreateBoard } from "@/hooks/use-boards";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

enum ModuleType {
  BOARD = "BOARD",
  CHAT = "CHAT",
}

interface ModuleOption {
  type: ModuleType;
  label: string;
  description: string;
  icon: HugeiconsIconProps["icon"]
}

const MODULE_OPTIONS: ModuleOption[] = [
  {
    type: ModuleType.BOARD,
    label: "Task Board",
    description: "Track tasks and progress",
    icon: DashboardSquare01Icon,
  },
  {
    type: ModuleType.CHAT,
    label: "Chat Room",
    description: "Communicate with your crew",
    icon: Chat01Icon,
  },
];

export function AddModuleModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { activeWorkspace } = useWorkspace();
  const createBoard = useCreateBoard(activeWorkspace?.id || "");

  const [step, setStep] = useState<"select" | "configure">("select");
  const [selectedType, setSelectedType] = useState<ModuleType | null>(null);
  const [name, setName] = useState("");

  const selectedOption = useMemo(
    () => MODULE_OPTIONS.find((o) => o.type === selectedType),
    [selectedType]
  );

  const handleClose = () => {
    setStep("select");
    setSelectedType(null);
    setName("");
    onClose();
  };

  const handleCreate = async () => {
    if (!name.trim() || !selectedType) return;

    try {
      if (selectedType === ModuleType.BOARD) {
        await createBoard.mutateAsync({ name: name.trim() });
      }
      handleClose();
    } catch (error) {
      console.error("Failed to create module:", error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/50">
      <div className="bg-base-100 rounded-lg p-6 max-w-md w-full mx-4 border border-base-200 shadow-xl shadow-background/50">
        {/* HEADER */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">
              {step === "select" ? "Add Module" : `Configure ${selectedOption?.label}`}
            </h2>
            <p className="text-sm text-muted-foreground">
              {step === "select" 
                ? "Choose a tool to enhance your workspace." 
                : "Give your new module a name to get started."}
            </p>
          </div>
          <button title="Close" onClick={handleClose} className="cursor-pointer">
            <HugeiconsIcon icon={Cancel01Icon} strokeWidth={1.75} className="size-5" />
          </button>
        </div>

        {/* CONTENT */}
        <div className="space-y-4">
          {step === "select" ? (
            <div className="grid gap-3">
              {MODULE_OPTIONS.map((option) => (
                <ModuleCard
                  key={option.type}
                  option={option}
                  onClick={() => {
                    setSelectedType(option.type);
                    setStep("configure");
                  }}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="module-name" className="text-sm font-medium">Name</label>
                <Input
                  autoFocus
                  id="module-name"
                  value={name}
                  placeholder="e.g. Project Alpha"
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                />
              </div>
              
              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" onClick={() => setStep("select")}>
                  Back
                </Button>
                <Button 
                  onClick={handleCreate} 
                  disabled={!name.trim() || createBoard.isPending}
                >
                  {createBoard.isPending ? "Creating..." : "Create Module"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ModuleCard({ option, onClick }: { option: ModuleOption; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 px-3 py-2 rounded-lg border-[1.5px] border-base-200 hover:bg-base-200/50 hover:border-base-300 transition-all text-left"
    >
      <HugeiconsIcon icon={option.icon} strokeWidth={2} className="size-6 text-primary" />
      <div>
        <p className="font-semibold text-sm">{option.label}</p>
        <p className="text-xs text-muted-foreground leading-tight">{option.description}</p>
      </div>
    </button>
  );
}
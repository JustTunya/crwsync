"use client";

import { useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Cancel01Icon, DashboardSquare01Icon } from "@hugeicons/core-free-icons";
import { useWorkspace } from "@/providers/workspace.provider";
import { useCreateBoard } from "@/hooks/use-boards";

enum ModuleTypeEnum {
  BOARD = "BOARD",
}

interface AddModuleModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const MODULE_OPTIONS = [
  {
    type: ModuleTypeEnum.BOARD,
    label: "Board",
    description: "Kanban-style task board",
    icon: DashboardSquare01Icon,
  },
];

export default function AddModuleModal({ isOpen, onClose }: AddModuleModalProps) {
  const { activeWorkspace } = useWorkspace();
  const createBoard = useCreateBoard(activeWorkspace?.id || "");

  const [step, setStep] = useState<"select" | "configure">("select");
  const [selectedType, setSelectedType] = useState<ModuleTypeEnum | null>(null);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);

  const handleClose = () => {
    setStep("select");
    setSelectedType(null);
    setCreating(false);
    setName("");
    onClose();
  };

  const handleSelect = (type: ModuleTypeEnum) => {
    setSelectedType(type);
    setStep("configure");
  };

  const handleCreate = async () => {
    if (!name.trim() || !selectedType || creating) return;
    setCreating(true);

    if (selectedType === ModuleTypeEnum.BOARD) {
      const result = await createBoard.mutateAsync({ name: name.trim() });
      if (result.success) {
        handleClose();
      }
    }

    setCreating(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/50">
      <div className="bg-base-100 rounded-lg p-6 max-w-md w-full mx-4 border border-base-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold">
            {step === "select"
              ? "Add Module"
              : `New ${MODULE_OPTIONS.find((o) => o.type === selectedType)?.label}`}
          </h2>
          <HugeiconsIcon
            icon={Cancel01Icon}
            className="size-4 text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
            onClick={handleClose}
          />
        </div>

        {step === "select" && (
          <div className="flex flex-col gap-2">
            <p className="text-xs text-muted-foreground mb-2">
              Select a module type to add to your workspace.
            </p>
            {MODULE_OPTIONS.map((option) => (
              <button
                key={option.type}
                onClick={() => handleSelect(option.type)}
                className="flex items-center gap-3 p-3 rounded-lg border border-base-200 hover:border-base-300 hover:bg-base-200/50 transition-colors text-left cursor-pointer"
              >
                <HugeiconsIcon
                  icon={option.icon}
                  strokeWidth={1.75}
                  className="size-5 text-primary"
                />
                <div>
                  <p className="text-sm font-medium">{option.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {option.description}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}

        {step === "configure" && (
          <div className="flex flex-col gap-4">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter a name..."
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                className="w-full px-3 py-2 text-sm bg-base-200 rounded-lg border border-base-200 focus:border-primary focus:outline-none transition-colors"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setStep("select");
                  setName("");
                }}
                className="px-4 py-2 text-xs font-medium rounded-lg hover:bg-base-200 transition-colors cursor-pointer"
              >
                Back
              </button>
              <button
                onClick={handleCreate}
                disabled={!name.trim() || creating}
                className="px-4 py-2 text-xs font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {creating ? "Creating..." : "Create"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

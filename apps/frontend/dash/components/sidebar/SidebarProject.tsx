import { useState, useRef, useEffect } from "react";
import { useDroppable } from "@dnd-kit/core";
import { HugeiconsIcon } from "@hugeicons/react";
import { Folder02Icon, Settings02Icon, PlusSignIcon } from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";
import { WorkspaceProject } from "@crwsync/types";
import { useUpdateProject, useDeleteProject } from "@/hooks/use-workspace-projects";

interface SidebarProjectProps {
  project: WorkspaceProject;
  activeWorkspaceId: string;
  extended?: boolean;
  children: React.ReactNode;
  isActiveContext?: boolean;
  isNewlyCreated?: boolean;
  onEditComplete?: () => void;
  onAddModule?: () => void;
}

export function SidebarProject({
  project,
  activeWorkspaceId,
  extended,
  children,
  isActiveContext,
  isNewlyCreated,
  onEditComplete,
  onAddModule,
}: SidebarProjectProps) {
  const [collapsed, setCollapsed] = useState(!isActiveContext && !isNewlyCreated);
  const [isEditing, setIsEditing] = useState(!!isNewlyCreated);
  const [editName, setEditName] = useState(project.name);
  const [showSettingsBtn, setShowSettingsBtn] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const [prevIsActiveContext, setPrevIsActiveContext] = useState(isActiveContext);
  const [prevIsNewlyCreated, setPrevIsNewlyCreated] = useState(isNewlyCreated);

  if (isActiveContext !== prevIsActiveContext) {
    setPrevIsActiveContext(isActiveContext);
    if (isActiveContext) setCollapsed(false);
  }

  if (isNewlyCreated !== prevIsNewlyCreated) {
    setPrevIsNewlyCreated(isNewlyCreated);
    if (isNewlyCreated) {
      setIsEditing(true);
      setCollapsed(false);
    }
  }

  const updateProject = useUpdateProject(activeWorkspaceId);
  const deleteProject = useDeleteProject(activeWorkspaceId);
  const inputRef = useRef<HTMLInputElement>(null);

  const { setNodeRef } = useDroppable({
    id: project.id,
    data: { type: "project", project },
  });

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

  const handleSave = () => {
    if (editName.trim() !== "" && editName !== project.name) {
      updateProject.mutate({ projectId: project.id, data: { name: editName } });
    } else {
      setEditName(project.name);
    }
    setIsEditing(false);
    if (onEditComplete) onEditComplete();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSave();
    if (e.key === "Escape") {
      setEditName(project.name);
      setIsEditing(false);
    }
  };

  const handleRenameClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowSettings(false);
    setIsEditing(true);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowSettings(false);
    if (confirm("Are you sure you want to delete this project?")) {
      deleteProject.mutate(project.id);
    }
  };

  const handleSettingsClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowSettings(!showSettings);
  };

  const handleAddModuleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onAddModule) onAddModule();
  };

  return (
    <div className="flex flex-col mb-1 relative" ref={setNodeRef}>
      <div
        tabIndex={0}
        className={cn(
          "group flex flex-row items-center gap-2 p-2 mx-0.5 rounded-lg cursor-pointer hover:bg-base-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:bg-base-200 transition-colors",
          !extended && "justify-center"
        )}
        onMouseEnter={() => {
          setShowSettingsBtn(true);
          setShowSettings(false);
        }}
        onMouseLeave={() => {
          setShowSettingsBtn(false);
          setShowSettings(false);
        }}
        onClick={() => !isEditing && setCollapsed(!collapsed)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !isEditing) {
            e.preventDefault();
            e.stopPropagation();
            setCollapsed(!collapsed);
          }
        }}
      >
        <div className="flex items-center justify-center shrink-0">
          <HugeiconsIcon icon={Folder02Icon} className="size-5 text-foreground" />
        </div>

        {extended && (
          <div className="flex items-center justify-between w-full min-w-0">
            {isEditing ? (
              <div
                className="flex items-center w-full gap-1"
                onClick={(e) => e.stopPropagation()}
              >
                <input
                  ref={inputRef}
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onBlur={handleSave}
                  className="flex-1 bg-base-300 text-xs font-medium text-foreground px-2 py-1 rounded outline-none w-full min-w-0"
                />
              </div>
            ) : (
              <p className="text-foreground text-xs font-medium whitespace-nowrap overflow-hidden text-ellipsis">
                {project.name}
              </p>
            )}

            {!isEditing && showSettingsBtn && (
              <div
                className="flex items-center gap-1 z-10"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={handleAddModuleClick}
                  className="text-placeholder hover:text-foreground cursor-pointer"
                >
                  <HugeiconsIcon icon={PlusSignIcon} className="size-4" strokeWidth={2} />
                </button>
                <button
                  onClick={handleSettingsClick}
                  className="text-placeholder hover:text-foreground relative cursor-pointer"
                >
                  <HugeiconsIcon icon={Settings02Icon} className="size-4" strokeWidth={2} />
                </button>
              </div>
            )}
          </div>
        )}

        {extended && showSettings && (
          <div className="absolute right-2 top-8 flex flex-col gap-1 z-30 p-1 bg-base-100 border border-base-200 rounded-lg shadow-lg min-w-[100px]">
            <button
              onClick={handleRenameClick}
              className="w-full px-2 py-1 text-xs text-left hover:bg-base-200 rounded-md transition-colors cursor-pointer"
            >
              Rename
            </button>
            <button
              onClick={handleDelete}
              className="w-full px-2 py-1 text-xs text-left text-error hover:bg-base-200 rounded-md transition-colors cursor-pointer"
            >
              Delete
            </button>
          </div>
        )}
      </div>

      {!collapsed && extended && (
        <div className="flex flex-col ml-3 pl-2 border-l-2 border-base-200 mt-1">
          {children}
        </div>
      )}
    </div>
  );
}

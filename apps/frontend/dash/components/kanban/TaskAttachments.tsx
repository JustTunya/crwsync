"use client";

import { useRef, useState, DragEvent } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  CloudUploadIcon,
  File01Icon,
  Image01Icon,
  Pdf01Icon,
  FileZipIcon,
  Video01Icon,
  Download01Icon,
  Delete02Icon,
} from "@hugeicons/core-free-icons";
import type { Task, TaskAttachment } from "@crwsync/types";
import { useUploadTaskAttachment, useDeleteTaskAttachment } from "@/hooks/use-boards";
import { cn } from "@/lib/utils";

export interface TaskAttachmentsProps {
  task: Task;
  workspaceId: string;
  boardId: string;
}

type PendingAttachment = {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  error?: string;
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function iconForMimeType(mimeType: string) {
  if (mimeType.startsWith("image/")) return Image01Icon;
  if (mimeType.startsWith("video/")) return Video01Icon;
  if (mimeType === "application/pdf") return Pdf01Icon;
  if (mimeType.includes("zip") || mimeType.includes("compressed")) return FileZipIcon;
  return File01Icon;
}

function fileUrl(workspaceId: string, key: string): string {
  return `${process.env.NEXT_PUBLIC_API_URL}/workspaces/${workspaceId}/files/${key}`;
}

export function TaskAttachments({ task, workspaceId, boardId }: TaskAttachmentsProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const uploadAttachment = useUploadTaskAttachment(workspaceId, boardId);
  const deleteAttachment = useDeleteTaskAttachment(workspaceId, boardId);
  const [isDragOver, setIsDragOver] = useState(false);
  const [pending, setPending] = useState<PendingAttachment[]>([]);

  const attachments = task.attachments ?? [];

  const handleFiles = (files: FileList | File[]) => {
    Array.from(files).forEach((file) => {
      const pendingId = `${file.name}-${file.size}-${Date.now()}-${Math.random()}`;
      setPending((prev) => [
        ...prev,
        { id: pendingId, fileName: file.name, fileSize: file.size, mimeType: file.type },
      ]);

      uploadAttachment.mutate(
        { taskId: task.id, file },
        {
          onSettled: () => {
            setPending((prev) => prev.filter((p) => p.id !== pendingId));
          },
          onError: (error) => {
            setPending((prev) =>
              prev.map((p) =>
                p.id === pendingId ? { ...p, error: error.message || "Upload failed" } : p,
              ),
            );
          },
        },
      );
    });
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files?.length) handleFiles(e.dataTransfer.files);
  };

  const handleDelete = (attachment: TaskAttachment) => {
    deleteAttachment.mutate({ taskId: task.id, attachmentId: attachment.id });
  };

  return (
    <div className="pt-4 mt-4 border-t border-base-200">
      <label className="text-xs text-muted-foreground mb-2 block">Attachments</label>

      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        className={cn(
          "flex flex-col items-center justify-center gap-1.5 w-full py-5 text-xs text-muted-foreground border-[1.5px] border-dashed rounded-lg cursor-pointer transition-colors",
          isDragOver ? "border-primary bg-primary/5 text-primary" : "border-base-300 hover:border-muted-foreground",
        )}
      >
        <HugeiconsIcon icon={CloudUploadIcon} strokeWidth={2} className="size-5" />
        <span>Drag files here, or click to browse</span>
        <input
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {(attachments.length > 0 || pending.length > 0) && (
        <div className="flex flex-col gap-1.5 mt-2">
          {attachments.map((attachment) => (
            <div
              key={attachment.id}
              className="flex items-center gap-2.5 px-3 py-2 bg-base-200 rounded-lg border-[1.5px] border-base-300"
            >
              {attachment.mime_type.startsWith("image/") ? (
                <img
                  src={fileUrl(workspaceId, attachment.key)}
                  alt={attachment.file_name}
                  className="size-8 rounded-md object-cover shrink-0"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
              ) : (
                <div className="flex items-center justify-center size-8 rounded-md bg-base-100 shrink-0">
                  <HugeiconsIcon
                    icon={iconForMimeType(attachment.mime_type)}
                    strokeWidth={2}
                    className="size-4 text-muted-foreground"
                  />
                </div>
              )}

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate leading-tight">{attachment.file_name}</p>
              </div>

              <span className="shrink-0 px-2 py-0.5 text-xs text-muted-foreground bg-base-100 rounded-full">
                {formatFileSize(attachment.file_size)}
              </span>

              <a
                href={fileUrl(workspaceId, attachment.key)}
                target="_blank"
                rel="noreferrer"
                title="Download"
                className="shrink-0 size-6 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-base-100 transition-colors"
              >
                <HugeiconsIcon icon={Download01Icon} strokeWidth={2} className="size-3.5" />
              </a>

              <button
                type="button"
                title="Delete attachment"
                onClick={() => handleDelete(attachment)}
                className="shrink-0 size-6 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-error hover:bg-base-100 transition-colors cursor-pointer"
              >
                <HugeiconsIcon icon={Delete02Icon} strokeWidth={2} className="size-3.5" />
              </button>
            </div>
          ))}

          {pending.map((p) => (
            <div
              key={p.id}
              className="flex items-center gap-2.5 px-3 py-2 bg-base-200 rounded-lg border-[1.5px] border-base-300 opacity-60"
            >
              <div className="flex items-center justify-center size-8 rounded-md bg-base-100 shrink-0">
                <HugeiconsIcon
                  icon={iconForMimeType(p.mimeType)}
                  strokeWidth={2}
                  className="size-4 text-muted-foreground animate-pulse"
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate leading-tight">{p.fileName}</p>
                {p.error ? (
                  <p className="text-xs text-error leading-tight">{p.error}</p>
                ) : (
                  <p className="text-xs text-muted-foreground leading-tight">Uploading...</p>
                )}
              </div>
              <span className="shrink-0 px-2 py-0.5 text-xs text-muted-foreground bg-base-100 rounded-full">
                {formatFileSize(p.fileSize)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

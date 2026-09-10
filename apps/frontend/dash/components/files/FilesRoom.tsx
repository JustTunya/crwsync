"use client";

import { useState, useRef, useMemo, useCallback, DragEvent, ChangeEvent } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Search01Icon,
  GridViewIcon,
  ListViewIcon,
  CloudUploadIcon,
  Download01Icon,
  Delete02Icon,
  Folder01Icon,
  Pdf01Icon,
  Video01Icon,
  FileZipIcon,
  File01Icon,
  Image01Icon,
} from "@hugeicons/core-free-icons";
import type { WorkspaceFile } from "@crwsync/types";
import { useFileRoom, useFiles, useDeleteFile, fileKeys } from "@/hooks/use-files";
import { useFilesSocket } from "@/hooks/use-files-socket";
import { useTimeAgo } from "@/hooks/use-time-ago";
import { presignFileUpload, createWorkspaceFile } from "@/services/files.service";
import { uploadToPresignedPost } from "@/lib/upload-to-storage";
import { UserAvatar } from "@/components/user-avatar";
import { Input } from "@/components/ui/input";
import { ChatLightbox } from "@/components/chat/ChatLightbox";
import { cn } from "@/lib/utils";

const MAX_CONCURRENT_UPLOADS = 12;

interface FilesRoomProps {
  workspaceId: string;
  roomId: string;
}

function fileUrl(workspaceId: string, key: string): string {
  return `${process.env.NEXT_PUBLIC_API_URL}/workspaces/${workspaceId}/files/${key}`;
}

function iconForMimeType(mimeType: string) {
  if (mimeType.startsWith("image/")) return Image01Icon;
  if (mimeType.startsWith("video/")) return Video01Icon;
  if (mimeType === "application/pdf") return Pdf01Icon;
  if (mimeType.includes("zip") || mimeType.includes("compressed")) return FileZipIcon;
  return File01Icon;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface UploadingFile {
  id: string;
  fileName: string;
  fileSize: number;
  status: "uploading" | "error";
  error?: string;
}

export function FilesRoom({ workspaceId, roomId }: FilesRoomProps) {
  const { data: room } = useFileRoom(workspaceId, roomId);
  const { data: files = [] } = useFiles(workspaceId, roomId);
  const deleteFile = useDeleteFile(workspaceId, roomId);
  const queryClient = useQueryClient();

  useFilesSocket(roomId);

  const [view, setView] = useState<"grid" | "list">("grid");
  const [search, setSearch] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploading, setUploading] = useState<UploadingFile[]>([]);
  const [lightboxKey, setLightboxKey] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);

  const visibleFiles = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return files;
    return files.filter((f) => f.file_name.toLowerCase().includes(q));
  }, [files, search]);

  const images = useMemo(() => files.filter((f) => f.mime_type.startsWith("image/")), [files]);
  const lightboxImages = images.map((img) => ({ url: fileUrl(workspaceId, img.key), fileName: img.file_name }));
  const lightboxIndex = lightboxKey ? images.findIndex((img) => img.key === lightboxKey) : -1;

  const addToCache = useCallback((file: WorkspaceFile) => {
    queryClient.setQueryData<{ data?: WorkspaceFile[] }>(fileKeys.list(roomId), (old) => {
      if (!old?.data) return old;
      if (old.data.some((f) => f.id === file.id)) return old;
      return { ...old, data: [file, ...old.data] };
    });
  }, [queryClient, roomId]);

  const uploadFiles = useCallback((fileList: FileList | File[]) => {
    Array.from(fileList)
      .slice(0, MAX_CONCURRENT_UPLOADS)
      .forEach((file) => {
        const id = `${file.name}-${file.size}-${Date.now()}-${Math.random()}`;
        const mimeType = file.type || "application/octet-stream";

        setUploading((prev) => [...prev, { id, fileName: file.name, fileSize: file.size, status: "uploading" }]);

        (async () => {
          const { success, data: presign, message } = await presignFileUpload(workspaceId, roomId, mimeType, file.name);
          if (!success || !presign) {
            setUploading((prev) => prev.map((u) => (u.id === id ? { ...u, status: "error", error: message } : u)));
            return;
          }

          try {
            await uploadToPresignedPost(presign, file);
            const created = await createWorkspaceFile(workspaceId, roomId, {
              key: presign.key,
              file_name: file.name,
              file_size: file.size,
              mime_type: mimeType,
            });
            if (created.success && created.data) addToCache(created.data);
            setUploading((prev) => prev.filter((u) => u.id !== id));
          } catch {
            setUploading((prev) => prev.map((u) => (u.id === id ? { ...u, status: "error", error: "Upload failed" } : u)));
          }
        })();
      });
  }, [workspaceId, roomId, addToCache]);

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    dragCounter.current = 0;
    setIsDragOver(false);
    if (e.dataTransfer.files?.length) uploadFiles(e.dataTransfer.files);
  };

  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) uploadFiles(e.target.files);
    e.target.value = "";
  };

  const hasFiles = files.length > 0;
  const hasResults = visibleFiles.length > 0 || uploading.length > 0;

  return (
    <div className="size-full flex flex-col">
      <div className="flex items-center h-16 pl-16 pr-24 border-b border-base-200">
        <h1 className="text-lg font-semibold leading-tight overflow-hidden text-ellipsis shrink-0">
          {room?.name || "Files"}
        </h1>
      </div>

      <div className="flex items-center justify-between gap-3 px-6 py-3 border-b border-base-200">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search..."
          className="w-64 bg-base-200"
          prefix={<HugeiconsIcon icon={Search01Icon} strokeWidth={1.75} className="size-4 text-placeholder" />}
        />

        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-0.5 p-0.5 bg-base-200 rounded-lg">
            <button
              type="button"
              title="Grid view"
              onClick={() => setView("grid")}
              className={cn(
                "flex items-center justify-center size-7 rounded-md transition-colors cursor-pointer",
                view === "grid" ? "bg-base-100 text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <HugeiconsIcon icon={GridViewIcon} strokeWidth={2} className="size-4" />
            </button>
            <button
              type="button"
              title="List view"
              onClick={() => setView("list")}
              className={cn(
                "flex items-center justify-center size-7 rounded-md transition-colors cursor-pointer",
                view === "list" ? "bg-base-100 text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <HugeiconsIcon icon={ListViewIcon} strokeWidth={2} className="size-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 h-8 px-3 text-sm font-semibold rounded-lg bg-primary text-primary-foreground bg-linear-to-t from-foreground/15 to-transparent hover:from-foreground/30 transition-all cursor-pointer"
          >
            <HugeiconsIcon icon={CloudUploadIcon} strokeWidth={2} className="size-4" />
            Upload
          </button>
          <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileInputChange} />
        </div>
      </div>

      <div
        className="relative flex-1 overflow-y-auto scrollbar-thin"
        onDragOver={(e) => {
          e.preventDefault();
          dragCounter.current += 1;
          setIsDragOver(true);
        }}
        onDragLeave={() => {
          dragCounter.current -= 1;
          if (dragCounter.current <= 0) setIsDragOver(false);
        }}
        onDrop={handleDrop}
      >
        {isDragOver && (
          <div className="absolute inset-2 z-30 flex flex-col items-center justify-center gap-2 rounded-2xl bg-base-100/90 backdrop-blur-sm border-[1.5px] border-dashed border-primary/60 text-primary pointer-events-none">
            <HugeiconsIcon icon={CloudUploadIcon} strokeWidth={2} className="size-8" />
            <span className="text-sm font-semibold">Drop to upload</span>
          </div>
        )}

        {!hasFiles && uploading.length === 0 ? (
          <div className="size-full flex flex-col items-center justify-center gap-3 text-center px-6">
            <div className="flex items-center justify-center size-14 rounded-2xl bg-base-200">
              <HugeiconsIcon icon={Folder01Icon} strokeWidth={1.75} className="size-7 text-muted-foreground" />
            </div>
            <div className="space-y-1">
              <p className="text-base font-semibold">No files yet</p>
              <p className="text-sm text-muted-foreground max-w-xs">
                Drag and drop files here, or use the Upload button to share deliverables with your crew.
              </p>
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="mt-2 flex items-center gap-1.5 h-9 px-4 text-sm font-semibold rounded-lg bg-primary text-primary-foreground bg-linear-to-t from-foreground/15 to-transparent hover:from-foreground/30 transition-all cursor-pointer"
            >
              <HugeiconsIcon icon={CloudUploadIcon} strokeWidth={2} className="size-4" />
              Upload files
            </button>
          </div>
        ) : !hasResults ? (
          <div className="size-full flex items-center justify-center text-sm text-muted-foreground">
            No files match &ldquo;{search}&rdquo;
          </div>
        ) : view === "grid" ? (
          <div className="grid gap-4 p-6" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(168px, 1fr))" }}>
            {uploading.map((u) => (
              <UploadingCard key={u.id} upload={u} />
            ))}
            {visibleFiles.map((file) => (
              <FileCard
                key={file.id}
                file={file}
                workspaceId={workspaceId}
                onDelete={() => deleteFile.mutate(file.id)}
                onPreview={file.mime_type.startsWith("image/") ? () => setLightboxKey(file.key) : undefined}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col p-3 gap-0.5">
            {uploading.map((u) => (
              <UploadingRow key={u.id} upload={u} />
            ))}
            {visibleFiles.map((file) => (
              <FileRow
                key={file.id}
                file={file}
                workspaceId={workspaceId}
                onDelete={() => deleteFile.mutate(file.id)}
                onPreview={file.mime_type.startsWith("image/") ? () => setLightboxKey(file.key) : undefined}
              />
            ))}
          </div>
        )}
      </div>

      {lightboxIndex >= 0 && (
        <ChatLightbox
          images={lightboxImages}
          index={lightboxIndex}
          onIndexChange={(i) => setLightboxKey(images[i]?.key ?? null)}
          onClose={() => setLightboxKey(null)}
        />
      )}
    </div>
  );
}

function UploadingCard({ upload }: { upload: UploadingFile }) {
  return (
    <div className="flex flex-col rounded-xl bg-card border-[1.5px] border-base-200 overflow-hidden">
      <div className="aspect-square flex items-center justify-center bg-base-200">
        {upload.status === "uploading" ? (
          <div className="size-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        ) : (
          <span className="text-xs text-error px-2 text-center">{upload.error || "Failed"}</span>
        )}
      </div>
      <div className="p-2.5">
        <p className="text-sm font-medium truncate leading-tight">{upload.fileName}</p>
        <p className="text-xs text-muted-foreground leading-tight">{formatFileSize(upload.fileSize)}</p>
      </div>
    </div>
  );
}

function UploadingRow({ upload }: { upload: UploadingFile }) {
  return (
    <div className="flex items-center gap-3 px-3 py-2 rounded-lg">
      <div className="flex items-center justify-center size-8 rounded-md bg-base-200 shrink-0">
        {upload.status === "uploading" ? (
          <div className="size-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        ) : (
          <HugeiconsIcon icon={File01Icon} strokeWidth={2} className="size-4 text-error" />
        )}
      </div>
      <p className="flex-1 text-sm font-medium truncate">{upload.fileName}</p>
      <p className="text-xs text-muted-foreground">{upload.status === "uploading" ? "Uploading..." : upload.error}</p>
    </div>
  );
}

interface FileItemProps {
  file: WorkspaceFile;
  workspaceId: string;
  onDelete: () => void;
  onPreview?: () => void;
}

function FileCard({ file, workspaceId, onDelete, onPreview }: FileItemProps) {
  const timeAgo = useTimeAgo(file.created_at);
  const isImage = file.mime_type.startsWith("image/");

  return (
    <div className="group relative flex flex-col rounded-xl bg-card border-[1.5px] border-base-200 hover:border-base-300 transition-colors overflow-hidden">
      <button
        type="button"
        onClick={onPreview}
        disabled={!isImage}
        className={cn("aspect-square flex items-center justify-center bg-base-200 overflow-hidden", isImage && "cursor-zoom-in")}
      >
        {isImage ? (
          <img src={fileUrl(workspaceId, file.key)} alt={file.file_name} className="size-full object-cover transition-transform duration-300 group-hover:scale-105" />
        ) : (
          <HugeiconsIcon icon={iconForMimeType(file.mime_type)} strokeWidth={1.5} className="size-9 text-muted-foreground" />
        )}
      </button>

      <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <a
          href={fileUrl(workspaceId, file.key)}
          target="_blank"
          rel="noreferrer"
          title="Download"
          className="flex items-center justify-center size-7 rounded-full bg-base-100/90 backdrop-blur-sm text-muted-foreground hover:text-foreground shadow-sm transition-colors"
        >
          <HugeiconsIcon icon={Download01Icon} strokeWidth={2} className="size-3.5" />
        </a>
        <button
          type="button"
          title="Delete"
          onClick={onDelete}
          className="flex items-center justify-center size-7 rounded-full bg-base-100/90 backdrop-blur-sm text-muted-foreground hover:text-error shadow-sm transition-colors cursor-pointer"
        >
          <HugeiconsIcon icon={Delete02Icon} strokeWidth={2} className="size-3.5" />
        </button>
      </div>

      <div className="p-2.5 flex flex-col gap-1">
        <p className="text-sm font-medium truncate leading-tight" title={file.file_name}>{file.file_name}</p>
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground truncate">{formatFileSize(file.file_size)} · {timeAgo}</p>
          {file.uploader && <UserAvatar user={file.uploader} size={4.5} />}
        </div>
      </div>
    </div>
  );
}

function FileRow({ file, workspaceId, onDelete, onPreview }: FileItemProps) {
  const timeAgo = useTimeAgo(file.created_at);
  const isImage = file.mime_type.startsWith("image/");

  return (
    <div className="group flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-base-200/40 transition-colors">
      <button
        type="button"
        onClick={onPreview}
        disabled={!isImage}
        className={cn("flex items-center justify-center size-8 rounded-md bg-base-200 overflow-hidden shrink-0", isImage && "cursor-zoom-in")}
      >
        {isImage ? (
          <img src={fileUrl(workspaceId, file.key)} alt={file.file_name} className="size-full object-cover" />
        ) : (
          <HugeiconsIcon icon={iconForMimeType(file.mime_type)} strokeWidth={2} className="size-4 text-muted-foreground" />
        )}
      </button>

      <p className="flex-1 min-w-0 text-sm font-medium truncate">{file.file_name}</p>

      {file.uploader && (
        <div className="hidden sm:flex items-center gap-1.5 w-32 shrink-0">
          <UserAvatar user={file.uploader} size={5} />
          <span className="text-xs text-muted-foreground truncate">{file.uploader.firstname}</span>
        </div>
      )}

      <span className="hidden md:block w-16 shrink-0 text-xs text-muted-foreground text-right">{formatFileSize(file.file_size)}</span>
      <span className="hidden md:block w-24 shrink-0 text-xs text-muted-foreground text-right">{timeAgo}</span>

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <a
          href={fileUrl(workspaceId, file.key)}
          target="_blank"
          rel="noreferrer"
          title="Download"
          className="flex items-center justify-center size-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-base-200 transition-colors"
        >
          <HugeiconsIcon icon={Download01Icon} strokeWidth={2} className="size-4" />
        </a>
        <button
          type="button"
          title="Delete"
          onClick={onDelete}
          className="flex items-center justify-center size-7 rounded-md text-muted-foreground hover:text-error hover:bg-error/10 transition-colors cursor-pointer"
        >
          <HugeiconsIcon icon={Delete02Icon} strokeWidth={2} className="size-4" />
        </button>
      </div>
    </div>
  );
}

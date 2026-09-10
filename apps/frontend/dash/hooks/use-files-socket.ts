"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSocket } from "@/providers/socket.provider";
import { fileKeys } from "@/hooks/use-files";
import type { WorkspaceFile } from "@crwsync/types";

interface FileCreatedPayload {
  roomId: string;
  file: WorkspaceFile;
}

interface FileDeletedPayload {
  roomId: string;
  fileId: string;
}

type FileListCache = { data?: WorkspaceFile[] } | undefined;

/** Keeps the file grid/list in sync with uploads and deletions from other members. */
export function useFilesSocket(roomId: string | undefined) {
  const { socket } = useSocket();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!socket || !roomId) return;

    const onFileCreated = (payload: FileCreatedPayload) => {
      if (payload.roomId !== roomId) return;
      queryClient.setQueryData<FileListCache>(fileKeys.list(roomId), (old) => {
        if (!old?.data) return old;
        if (old.data.some((f) => f.id === payload.file.id)) return old;
        return { ...old, data: [payload.file, ...old.data] };
      });
    };

    const onFileDeleted = (payload: FileDeletedPayload) => {
      if (payload.roomId !== roomId) return;
      queryClient.setQueryData<FileListCache>(fileKeys.list(roomId), (old) => {
        if (!old?.data) return old;
        return { ...old, data: old.data.filter((f) => f.id !== payload.fileId) };
      });
    };

    socket.on("file:created", onFileCreated);
    socket.on("file:deleted", onFileDeleted);

    return () => {
      socket.off("file:created", onFileCreated);
      socket.off("file:deleted", onFileDeleted);
    };
  }, [socket, roomId, queryClient]);
}

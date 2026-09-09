"use client";

import { useRef } from "react";
import { Button } from "@/components/ui/button";

interface AvatarUploadProps {
  preview: React.ReactNode;
  isUploading: boolean;
  error?: string | null;
  onSelect: (file: File) => void;
}

export function AvatarUpload({ preview, isUploading, error, onSelect }: AvatarUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex items-center gap-4">
      {preview}
      <div className="space-y-1">
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onSelect(file);
            e.target.value = "";
          }}
        />
        <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()} disabled={isUploading}>
          {isUploading ? "Uploading..." : "Change image"}
        </Button>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    </div>
  );
}

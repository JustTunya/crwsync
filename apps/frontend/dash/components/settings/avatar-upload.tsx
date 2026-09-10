"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

interface AvatarUploadProps {
  preview: React.ReactNode;
  isUploading: boolean;
  error?: string | null;
  onSelect: (file: File) => void;
  previewClassName?: string;
}

export function AvatarUpload({ preview, isUploading, error, onSelect, previewClassName = "size-16 rounded-full object-cover" }: AvatarUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [localPreview, setLocalPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!isUploading && localPreview) {
      URL.revokeObjectURL(localPreview);
      setLocalPreview(null);
    }
  }, [isUploading, localPreview]);

  useEffect(() => {
    return () => {
      if (localPreview) URL.revokeObjectURL(localPreview);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex items-center gap-4">
      {localPreview ? <img src={localPreview} alt="Selected preview" className={previewClassName} /> : preview}
      <div className="space-y-1">
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              setLocalPreview(URL.createObjectURL(file));
              onSelect(file);
            }
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

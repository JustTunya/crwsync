"use client";

import { useEffect, useCallback } from "react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { HugeiconsIcon } from "@hugeicons/react";
import { Cancel01Icon, ArrowLeft01Icon, ArrowRight01Icon, Download01Icon } from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";

export interface LightboxImage {
  url: string;
  fileName: string;
}

interface ChatLightboxProps {
  images: LightboxImage[];
  index: number;
  onIndexChange: (index: number) => void;
  onClose: () => void;
}

export function ChatLightbox({ images, index, onIndexChange, onClose }: ChatLightboxProps) {
  const image = images[index];
  const hasMultiple = images.length > 1;

  const goPrev = useCallback(() => {
    onIndexChange((index - 1 + images.length) % images.length);
  }, [index, images.length, onIndexChange]);

  const goNext = useCallback(() => {
    onIndexChange((index + 1) % images.length);
  }, [index, images.length, onIndexChange]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [goPrev, goNext]);

  if (!image) return null;

  return (
    <DialogPrimitive.Root open onOpenChange={(open) => !open && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[100] bg-[oklch(0.16_0.02_64.35)]/96 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          onClick={(e) => e.target === e.currentTarget && onClose()}
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center outline-none p-4 sm:p-10 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-98 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-98"
        >
          <DialogPrimitive.Title className="sr-only">{image.fileName}</DialogPrimitive.Title>

          <div className="absolute top-4 right-4 sm:top-6 sm:right-6 flex items-center gap-2 z-10">
            <a
              href={image.url}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              title="Download"
              className="flex items-center justify-center size-9 rounded-full bg-white/10 text-white/90 hover:bg-white/20 hover:text-white transition-colors"
            >
              <HugeiconsIcon icon={Download01Icon} strokeWidth={2} className="size-4.5" />
            </a>
            <DialogPrimitive.Close
              title="Close"
              className="flex items-center justify-center size-9 rounded-full bg-white/10 text-white/90 hover:bg-white/20 hover:text-white transition-colors cursor-pointer"
            >
              <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} className="size-4.5" />
            </DialogPrimitive.Close>
          </div>

          {hasMultiple && (
            <button
              type="button"
              title="Previous image"
              onClick={(e) => {
                e.stopPropagation();
                goPrev();
              }}
              className="absolute left-2 sm:left-6 top-1/2 -translate-y-1/2 flex items-center justify-center size-10 rounded-full bg-white/10 text-white/90 hover:bg-white/20 hover:text-white transition-colors z-10 cursor-pointer"
            >
              <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2} className="size-5" />
            </button>
          )}

          <img
            src={image.url}
            alt={image.fileName}
            className="max-w-full max-h-full object-contain rounded-lg shadow-xl select-none"
            onClick={(e) => e.stopPropagation()}
          />

          {hasMultiple && (
            <button
              type="button"
              title="Next image"
              onClick={(e) => {
                e.stopPropagation();
                goNext();
              }}
              className="absolute right-2 sm:right-6 top-1/2 -translate-y-1/2 flex items-center justify-center size-10 rounded-full bg-white/10 text-white/90 hover:bg-white/20 hover:text-white transition-colors z-10 cursor-pointer"
            >
              <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} className="size-5" />
            </button>
          )}

          {hasMultiple && (
            <div className="absolute bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-10">
              {images.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  title={`Image ${i + 1}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onIndexChange(i);
                  }}
                  className={cn(
                    "size-1.5 rounded-full transition-all cursor-pointer",
                    i === index ? "bg-white w-4" : "bg-white/40 hover:bg-white/60",
                  )}
                />
              ))}
            </div>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

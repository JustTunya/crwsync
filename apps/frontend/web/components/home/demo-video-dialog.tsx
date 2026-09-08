"use client";

import { forwardRef, useImperativeHandle, useRef } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Cancel01Icon } from "@hugeicons/core-free-icons";

export const DemoVideoDialog = forwardRef<HTMLDialogElement>((_props, ref) => {
  const innerRef = useRef<HTMLDialogElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useImperativeHandle(ref, () => innerRef.current as HTMLDialogElement);

  const close = () => innerRef.current?.close();

  return (
    <dialog
      ref={innerRef}
      onClick={(e) => {
        if (e.target === innerRef.current) close();
      }}
      onClose={() => videoRef.current?.pause()}
      className="backdrop:bg-foreground/40 backdrop:backdrop-blur-sm bg-transparent p-0 open:flex rounded-2xl"
    >
      <div className="relative w-[min(92vw,64rem)] bg-linear-to-br from-foreground/10 via-foreground/6 to-foreground/5 border-[1.5px] border-foreground/10 backdrop-blur-md backdrop-saturate-100 shadow-xl/5 rounded-2xl overflow-hidden">
        <button
          type="button"
          onClick={close}
          aria-label="Close video"
          className="absolute top-3 right-3 z-10 p-1.5 bg-background/60 text-muted-foreground hover:text-foreground rounded-full transition-colors cursor-pointer"
        >
          <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} className="size-4" />
        </button>
        <video
          ref={videoRef}
          controls
          preload="none"
          poster="/demo/poster.jpg"
          className="w-full h-auto block"
        >
          <source src="/demo/crwsync.webm" type="video/webm" />
        </video>
      </div>
    </dialog>
  );
});

DemoVideoDialog.displayName = "DemoVideoDialog";

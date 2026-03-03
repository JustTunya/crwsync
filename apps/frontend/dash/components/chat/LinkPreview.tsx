"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { getLinkPreview, type LinkPreviewData } from "@/services/chat.service";

interface LinkPreviewProps {
  workspaceId: string;
  url: string;
}

export function LinkPreview({ workspaceId, url }: LinkPreviewProps) {
  const [data, setData] = useState<LinkPreviewData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function fetchPreview() {
      setLoading(true);
      const res = await getLinkPreview(workspaceId, url);
      if (mounted) {
        if (res.success && res.data) {
          setData(res.data);
        }
        setLoading(false);
      }
    }

    fetchPreview();

    return () => {
      mounted = false;
    };
  }, [workspaceId, url]);

  if (loading) {
    return (
      <div className="mt-2 h-20 w-full max-w-sm rounded-xl border border-base-200 bg-muted/30 animate-pulse" />
    );
  }

  if (!data || (!data.title && !data.description && !data.image)) {
    return null;
  }

  return (
    <a
      href={data.url}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-2 flex flex-col sm:flex-row overflow-hidden rounded-xl border border-base-200 bg-base-100 hover:bg-muted/30 transition-colors w-full max-w-sm text-left text-current decoration-transparent"
      onClick={(e) => e.stopPropagation()}
    >
      {data.image && (
        <div className="relative w-24 h-24 shrink-0 bg-muted overflow-hidden">
          <Image
            src={data.image}
            alt={data.title || "Preview"}
            className="w-full h-full object-cover"
            onError={(e) => (e.currentTarget.style.display = "none")}
            unoptimized
            fill
          />
        </div>
      )}
      <div className="flex flex-col flex-1 p-3 min-w-0">
        {data.title && (
          <span className="text-sm font-semibold text-foreground line-clamp-1 mb-1">
            {data.title}
          </span>
        )}
        {data.description && (
          <span className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
            {data.description}
          </span>
        )}
        {!data.description && !data.title && (
          <span className="text-[11px] text-muted-foreground line-clamp-1 break-all">
            {data.url}
          </span>
        )}
      </div>
    </a>
  );
}

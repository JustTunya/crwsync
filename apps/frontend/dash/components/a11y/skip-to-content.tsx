"use client";

import React from "react";
import { useTranslation } from "@crwsync/i18n";

export interface SkipToContentProps {
  targetId?: string;
}

export function SkipToContent({ targetId = "main-content" }: SkipToContentProps) {
  const { t } = useTranslation();

  return (
    <a
      href={`#${targetId}`}
      className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
    >
      {t("common.skipToContent") || "Skip to main content"}
    </a>
  );
}

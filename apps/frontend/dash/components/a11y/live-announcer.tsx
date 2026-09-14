"use client";

import React, { createContext, useContext, useState, useCallback } from "react";

export interface AnnounceContextValue {
  announce: (message: string) => void;
}

const AnnounceContext = createContext<AnnounceContextValue | null>(null);

export interface LiveAnnouncerProviderProps {
  children: React.ReactNode;
}

export function LiveAnnouncerProvider({ children }: LiveAnnouncerProviderProps) {
  const [message, setMessage] = useState<string>("");

  const announce = useCallback((msg: string) => {
    setMessage("");
    setTimeout(() => {
      setMessage(msg);
    }, 50); // 50ms
  }, []);

  return (
    <AnnounceContext.Provider value={{ announce }}>
      {children}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {message}
      </div>
    </AnnounceContext.Provider>
  );
}

export function useAnnounce() {
  const ctx = useContext(AnnounceContext);
  return ctx || { announce: () => {} };
}

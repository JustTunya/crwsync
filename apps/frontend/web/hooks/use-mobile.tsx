"use client";

import { useEffect, useState } from "react";

export function useMobile(breakpoint: number = 768): boolean {
  const [isMobile, setIsMobile] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const check = () => {
      setIsMobile(window.innerWidth <= breakpoint);
    };

    check();
    window.addEventListener("resize", check);

    return () => window.removeEventListener("resize", check);
  }, [breakpoint]);

  return isMobile;
}

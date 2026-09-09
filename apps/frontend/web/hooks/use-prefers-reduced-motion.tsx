"use client";

import { useEffect, useState } from "react";

export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");

    const check = () => setReduced(query.matches);

    check();
    query.addEventListener("change", check);

    return () => query.removeEventListener("change", check);
  }, []);

  return reduced;
}

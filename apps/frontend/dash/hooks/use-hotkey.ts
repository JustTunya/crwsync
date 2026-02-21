import { useEffect, useCallback } from "react";

export interface UseHotkeyOptions {
  disableOnInput?: boolean;
}

export function useHotkey(keys: string[], callback: (e: KeyboardEvent) => void, options: UseHotkeyOptions = {}) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      const requiredCtrl = keys.includes("ctrl");
      const requiredShift = keys.includes("shift");
      const requiredAlt = keys.includes("alt");

      const isCtrlPressed = event.ctrlKey || event.metaKey;
      
      if (requiredCtrl !== isCtrlPressed) return;
      if (requiredShift !== event.shiftKey) return;
      if (requiredAlt !== event.altKey) return;

      const mainKey = keys.find((k) => !["ctrl", "shift", "alt", "meta"].includes(k));
      
      if (!mainKey) return;

      if (event.key.toLowerCase() !== mainKey.toLowerCase()) return;

      if (options.disableOnInput) {
        const target = event.target as HTMLElement;
        const isInput =
          target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable;
        
        if (isInput) return;
      }

      event.preventDefault();
      callback(event);
    },
    [keys, callback, options.disableOnInput]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
}

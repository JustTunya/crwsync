"use client";

import { useState } from "react";
import { AnimatePresence, motion, cubicBezier } from "framer-motion";
import { HugeiconsIcon } from "@hugeicons/react";
import { HelpCircleIcon } from "@hugeicons/core-free-icons";
import { strengthToCount, strengthToColor } from "@/lib/utils";

interface StrengthIndicatorProps {
  visible: boolean;
  level: "weak" | "medium" | "strong" | undefined;
}

export function StrengthIndicator({ visible, level }: StrengthIndicatorProps) {
  const count = strengthToCount(level);
  const color = strengthToColor(level);

  const [hovering, setHovering] = useState(false);

  if (!visible) return null;

  const fillWidth =
    !level || count === 0 ? "0%" : `${(count / 3) * 100}%`;

  const improvementText =
    level === "weak"
      ? "Try adding more characters, uppercase letters, numbers, or symbols."
      : level === "medium"
      ? "Add more variety: uppercase, numbers, or special symbols."
      : level === "strong"
      ? "Your password looks strong!"
      : "Enter a password";

  return (
    <AnimatePresence initial={false}>
      {visible && (
        <motion.div
          key="pw-indicator"
          initial={{ height: 0, opacity: 0, y: -8 }}
          animate={{ height: "auto", opacity: 1, y: 0 }}
          exit={{ height: 0, opacity: 0, y: -8 }}
          transition={{ duration: 0.18, ease: cubicBezier(0.22, 1, 0.36, 1) }}
          aria-live="polite"
        >
          <div className="flex flex-row items-center justify-between">
            <div className="relative w-full h-[0.3rem] sm:h-[0.45rem] rounded-full bg-base-200 overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                initial={false}
                animate={{
                  width: fillWidth,
                  backgroundColor: color,
                }}
                transition={{ type: "spring", stiffness: 260, damping: 28 }}
              />
            </div>

            <div className="min-w-20 text-right flex items-center justify-end gap-2">
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.span
                  key={level ?? "none"}
                  initial={{ y: 6, opacity: 0, filter: "blur(2px)" }}
                  animate={{
                    y: 0,
                    opacity: 1,
                    filter: "blur(0px)",
                    color: color,
                  }}
                  exit={{ y: -6, opacity: 0, filter: "blur(2px)" }}
                  transition={{ duration: 0.18 }}
                  className="text-xs font-medium inline-block text-shadow-xs text-shadow-foreground/10"
                >
                  {!level && "Enter a password"}
                  {level === "weak" && "Weak"}
                  {level === "medium" && "Medium"}
                  {level === "strong" && "Strong"}
                </motion.span>
              </AnimatePresence>

              {level && (
                <div
                  onMouseEnter={() => setHovering(true)}
                  onMouseLeave={() => setHovering(false)}
                >
                  <HugeiconsIcon
                    icon={HelpCircleIcon}
                    strokeWidth={2}
                    className="size-4 text-muted-foreground hover:text-foreground cursor-help transition-colors"
                  />

                  <AnimatePresence>
                    {hovering && (
                      <motion.div
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 4 }}
                        transition={{ duration: 0.15 }}
                        className="
                          absolute right-0 mt-2 max-w-48
                          rounded-md border border-border bg-popover px-3 py-2 
                          text-xs text-left leading-tight text-foreground shadow-md z-50
                        "
                      >
                        {improvementText}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
import { strengthToCount, strengthToColor } from "@/lib/utils";
import { AnimatePresence, motion, cubicBezier } from "framer-motion";

interface StrengthIndicatorProps {
  visible: boolean;
  level: "weak" | "medium" | "strong" | undefined;
}

export function StrengthIndicator({ visible, level }: StrengthIndicatorProps) {
  const count = strengthToCount(level);
  const color = strengthToColor(level);

  if (!visible) return null;

  return (
    <AnimatePresence initial={false}>
      {visible && (
        <motion.div
          key="pw-indicator"
          initial={{ height: 0, opacity: 0, y: -8 }}
          animate={{ height: "auto", opacity: 1, y: 0 }}
          exit={{ height: 0, opacity: 0, y: -8 }}
          transition={{ duration: 0.18, ease: cubicBezier(0.22, 1, 0.36, 1) }}
          className="overflow-hidden"
          aria-live="polite"
        >
          <div className="flex flex-row items-center justify-between">
            <div className="w-[70%] flex flex-row gap-3">
              {[1, 2, 3].map((s) => {
                const active = s <= count;
                return(
                  <motion.div
                    key={s}
                    className="h-2 w-full rounded-full"
                    initial={false}
                    animate={{
                      backgroundColor: active ? color : "var(--color-base-400)"
                    }}
                    transition={{ type: "spring", stiffness: 260, damping: 28 }}
                  />
                );
              })}
            </div>

            <div className="min-w-[9rem] text-right">
              <AnimatePresence mode="popLayout" initial={false}>
                <motion.span
                  key={level ?? "none"}
                  initial={{ y: 6, opacity: 0, filter: "blur(2px)" }}
                  animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
                  exit={{ y: -6, opacity: 0, filter: "blur(2px)" }}
                  transition={{ duration: 0.18 }}
                  style={{ color: color }}
                  className="text-xs font-medium inline-block"
                >
                  {!level && "Enter a password"}
                  {level === "weak" && "Too weak"}
                  {level === "medium" && "Could be stronger"}
                  {level === "strong" && "Strong password"}
                </motion.span>
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
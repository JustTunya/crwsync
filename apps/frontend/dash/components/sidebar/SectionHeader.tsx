import { AnimatePresence, motion } from "framer-motion";
import { HugeiconsIcon } from "@hugeicons/react";
import { Add01Icon } from "@hugeicons/core-free-icons";

export function SectionHeader({
  label,
  extended,
  onAdd,
}: {
  label: string;
  extended: boolean;
  onAdd?: () => void;
}) {
  return (
    <AnimatePresence>
      {extended && (
        <motion.div
          initial={{ opacity: 0, height: 0, marginBottom: 0 }}
          animate={{ opacity: 1, height: "auto", marginBottom: "0.5rem" }}
          exit={{ opacity: 0, height: 0, marginBottom: 0 }}
          className="flex items-center justify-between overflow-hidden px-2"
        >
          <p className="text-xs text-muted-foreground">{label}</p>
          <HugeiconsIcon
            icon={Add01Icon}
            className="size-4 text-muted-foreground hover:text-foreground cursor-pointer"
            onClick={onAdd}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

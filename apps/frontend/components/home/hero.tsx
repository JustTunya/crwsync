"use client";

import { motion } from "framer-motion";
import { HugeiconsIcon } from "@hugeicons/react";
import { PlayIcon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";

const containerVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: [0.23, 0.82, 0.24, 1] as const,
      when: "beforeChildren" as const,
      staggerChildren: 0.08,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 24, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.6, ease: [0.23, 0.82, 0.24, 1] as const },
  },
};

export default function Hero() {
  return (
    <section className="mx-auto flex min-h-[80vh] max-w-6xl flex-col gap-12 px-6 pb-24 pt-24 md:min-h-[88vh] md:flex-row md:items-center md:justify-between lg:gap-20">
      <motion.div
        className="max-w-xl space-y-8"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.h1
          variants={itemVariants}
          className="text-balance text-center sm:text-left text-4xl sm:text-5xl md:text-6xl text-foreground font-bold tracking-tight"
        >
          Teamwork,
          <span className="block text-primary">
            synchronized and simplified.
          </span>
        </motion.h1>

        <motion.p
          variants={itemVariants}
          className="text-pretty text-center sm:text-left text-sm sm:text-base text-muted-foreground font-medium"
        >
          One place for your crew to stay organized and in sync, blending tasks, schedules, and updates into a simple workspace built for clarity.
        </motion.p>

        <motion.div
          variants={itemVariants}
          className="flex justify-center sm:justify-start gap-3 sm:gap-6 w-full"
        >
          <Button className="w-min">Get started</Button>
          <Button variant="outline" className="w-min">
            <HugeiconsIcon icon={PlayIcon} strokeWidth={2} className="size-5" />
            Watch demo
          </Button>
        </motion.div>
      </motion.div>

      <motion.div
        className="relative mx-auto w-full max-w-md md:mx-0"
        variants={cardVariants}
        initial="hidden"
        animate="visible"
      >
      </motion.div>
    </section>
  );
}
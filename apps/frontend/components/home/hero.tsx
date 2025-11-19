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
    <section className="flex flex-col lg:flex-row gap-12 px-12 py-24 md:items-center md:justify-between max-w-7xl mx-auto">
      <motion.div
        className="max-w-xl space-y-8"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.h1
          variants={itemVariants}
          className="text-balance text-center lg:text-left text-4xl lg:text-6xl md:text-6xl text-foreground font-bold tracking-tight"
        >
          Teamwork,
          <span className="block text-primary">
            synchronized and simplified.
          </span>
        </motion.h1>

        <motion.p
          variants={itemVariants}
          className="text-pretty text-center lg:text-left text-sm lg:text-base text-muted-foreground font-medium"
        >
          One place for your crew to stay organized and in sync, blending tasks, schedules, and updates into a simple workspace built for clarity.
        </motion.p>

        <motion.div
          variants={itemVariants}
          className="flex justify-center lg:justify-start gap-3 lg:gap-6 w-full"
        >
          <Button className="w-min">
            Join Now
          </Button>
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
        {/* PLACEHOLDER FOR DEMO CARD */}
      </motion.div>
    </section>
  );
}
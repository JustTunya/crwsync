"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowRight01Icon } from "@hugeicons/core-free-icons";

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
    <section className="flex flex-col lg:flex-row gap-12 px-12 py-24 md:items-center md:justify-between min-h-screen max-w-7xl mx-auto mt-16 lg:mt-0">
      <motion.div
        className="max-w-xl space-y-8"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.h1
          variants={itemVariants}
          className="text-balance text-center lg:text-left text-4xl sm:text-5xl md:text-6xl text-foreground font-bold tracking-tight"
        >
          Teamwork,<br/>
          <span
            className="
              block
              text-transparent
              bg-clip-text
              bg-gradient-to-tr from-primary to-primary/50
              text-shadow-lg text-shadow-primary/15
            "
          >
            synchronized and simplified.
          </span>
        </motion.h1>

        <motion.p
          variants={itemVariants}
          className="text-balance text-center lg:text-left text-sm lg:text-base text-muted-foreground font-medium"
        >
          One place for your crew to stay organized and in sync, blending tasks, schedules, and updates into a simple workspace built for clarity.
        </motion.p>

        <motion.div
          variants={itemVariants}
          className="flex justify-center items-center lg:justify-start gap-3 lg:gap-6 w-full"
        >
          <Link
            href="/auth/signup"
            className="
              bg-primary p-2 sm:px-3 sm:py-2 rounded-md
              text-sm sm:text-base text-primary-foreground font-semibold whitespace-nowrap
              hover:bg-primary/90 transition-colors"
          >
            Join Now
          </Link>
          <Link
            href="#overview"
            className="
              inline-flex items-center gap-1 border border-muted-foreground p-2 sm:px-3 sm:py-2 rounded-md
              text-sm sm:text-base text-muted-foreground font-medium whitespace-nowrap
              hover:border-foreground hover:text-foreground transition-colors"
          >
            Learn More
            <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} className="size-[20px]" />
          </Link>
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
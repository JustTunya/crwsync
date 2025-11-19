"use client";

import { useState } from "react";
import { HugeiconsIcon, HugeiconsIconProps } from "@hugeicons/react";
import { TestTube01Icon } from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";


const features = [
  {
    title: "Task Management",
    description:
      "Easily create, assign, and track tasks with due dates, priorities, and progress indicators to keep your team on the same page.",
    icon: TestTube01Icon,
  },
  {
    title: "Real-time Collaboration",
    description:
      "Work together seamlessly with real-time updates, comments, and file sharing to enhance team communication and productivity.",
    icon: TestTube01Icon,
  },
  {
    title: "Customizable Workflows",
    description:
      "Adapt the platform to fit your team's unique processes with customizable workflows, templates, and automation options.",
    icon: TestTube01Icon,
  },
];

interface FeatureProps {
  title: string;
  description: string;
  icon: HugeiconsIconProps["icon"];
  selected?: boolean;
}

function Feature({ title, description, icon, selected }: FeatureProps) {
  return (
    <div className={cn(
      "flex items-center gap-8 px-4 py-2",
      selected && "bg-primary/25 backdrop-blur-md border border-primary-foreground/50 rounded-2xl shadow-lg/10 shadow-primary overflow-hidden"
    )}>
      <div className={cn(
        "flex size-12 items-center justify-center rounded-lg",
        selected ? "bg-primary" : "bg-primary/25"
      )}>
        <HugeiconsIcon icon={icon} strokeWidth={1.5} size={24} className={selected ? "text-primary-foreground" : "text-primary"} />
      </div>

      <div className="space-y-1 max-w-lg">
        <h3 className="text-lg text-foreground font-semibold">{title}</h3>
        <p className="text-pretty text-sm text-muted-foreground leading-tight">{description}</p>
      </div>

      <div className="absolute bottom-0 left-0 -z-10 w-full min-h-16 bg-gradient-to-t from-primary-foreground/30 to-transparent" />
    </div>
  );
}

export default function Features() {
  const [select, setSelect] = useState<number>(0);

  return (
    <section className="max-w-7xl mx-auto">
      <h3 className="text-muted-foreground text-sm sm:text-base uppercase font-thin mb-2">
        Features
      </h3>
      <h2 className="text-xl sm:text-2xl text-foreground font-semibold mb-12">
        What can <span className="text-primary">crwsync</span> do for your team?
      </h2>

      <div className="grid grid-rows-1 sm:grid-cols-2">
        <div>
          {features.map((feature, index) => (
            <Feature
              key={index}
              title={feature.title}
              description={feature.description}
              icon={feature.icon}
              selected={select === index}
            />
          ))}
        </div>
        <div className="bg-red-400 h-32"></div>
      </div>
    </section>
  );
}
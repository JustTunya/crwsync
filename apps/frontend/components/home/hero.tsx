import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowRight01Icon, PlayIcon } from "@hugeicons/core-free-icons";

export default function Hero() {
  return (
    <section className="max-w-4xl mx-auto py-20 px-4 sm:px-6 lg:px-8 text-center space-y-8">
      <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold leading-tight">
        Task management, <span className="text-primary">reimagined</span>.
      </h1>
      <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
        Real-time collaboration, modular workflows, and intuitive design &mdash; everything your team needs to move fast and stay focused.
      </p>

      <div className="flex items-center justify-center gap-4">
        <Link href="https://youtu.be/dQw4w9WgXcQ?list=RDdQw4w9WgXcQ" className="text-muted-foreground hover:text-foreground transition-colors">
          Learn More
        </Link>
        <Link href="/auth/signup" className="bg-primary text-primary-foreground font-semibold px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors">
          Get Started
          <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} className="inline-block size-5 ml-1" />
        </Link>
      </div>
    </section>
  );
}
"use client";

import { useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { CancelCircleIcon, CheckmarkCircle02Icon } from "@hugeicons/core-free-icons";
import { joinWaitlist } from "@/services/waitlist.service";
import { cn } from "@/lib/utils";

const inputClass =
  "w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-placeholder transition-[border-color,box-shadow] hover:border-foreground/30 focus:border-primary focus:outline-none focus:ring-3 focus:ring-primary/20";

const teamSizes = ["1", "2-5", "6-15", "16-50", "50+"];

export function EarlyAccess() {
  const [email, setEmail] = useState("");
  const [teamSize, setTeamSize] = useState("");
  const [useCase, setUseCase] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setFeedback(null);

    const res = await joinWaitlist({ email, team_size: teamSize, ...(useCase.trim() && { use_case: useCase.trim() }) });

    setIsSubmitting(false);

    if (res.success) {
      setEmail("");
      setTeamSize("");
      setUseCase("");
      setFeedback({ type: "success", text: res.message || "You are on the list." });
    } else {
      setFeedback({ type: "error", text: res.message || "Could not join the waitlist. Try again in a minute." });
    }
  }

  return (
    <section id="early-access" aria-labelledby="early-access-title" className="border-b border-border scroll-mt-24">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-8 sm:py-24 lg:grid-cols-2 lg:border-x lg:border-border">
        <div>
          <h2 id="early-access-title" className="text-3xl sm:text-4xl font-bold tracking-tight leading-[1.1] text-balance">
            Early access
          </h2>
          <p className="mt-5 max-w-[56ch] text-base sm:text-lg text-muted-foreground text-pretty">
            crwsync is not open for general sign-up yet. Early access is free and nothing is charged today; paid plans
            for larger teams are planned. Leave your email and we will write when early access opens. We store only
            what this form collects and use it only for that.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-5 rounded-xl border border-border bg-card p-5 sm:p-6"
          aria-labelledby="waitlist-form-title"
        >
          <h3 id="waitlist-form-title" className="text-xl font-semibold">Join the waitlist</h3>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="waitlist-email" className="text-sm font-medium text-foreground/90">Email</label>
            <input
              type="email"
              id="waitlist-email"
              name="email"
              autoComplete="email"
              required
              maxLength={254}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="waitlist-team-size" className="text-sm font-medium text-foreground/90">Team size</label>
            <select
              id="waitlist-team-size"
              name="team_size"
              required
              value={teamSize}
              onChange={(e) => setTeamSize(e.target.value)}
              className={inputClass}
            >
              <option value="" disabled>Select</option>
              {teamSizes.map((size) => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="waitlist-use-case" className="text-sm font-medium text-foreground/90">
              What would you use it for? <span className="text-muted-foreground">(optional)</span>
            </label>
            <textarea
              id="waitlist-use-case"
              name="use_case"
              rows={3}
              maxLength={500}
              value={useCase}
              onChange={(e) => setUseCase(e.target.value)}
              className={cn(inputClass, "resize-y")}
            />
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={!email || !teamSize || isSubmitting}
              className="group relative inline-flex h-10 items-center rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <span className="absolute inset-0 rounded-lg bg-linear-to-t from-foreground/15 to-transparent transition-colors group-hover:from-foreground/30" />
              <span className="relative">{isSubmitting ? "Joining…" : "Join the waitlist"}</span>
            </button>
            {feedback && (
              <p role="status" className={cn("flex items-center gap-2 text-sm", feedback.type === "error" ? "text-error" : "text-success")}>
                <HugeiconsIcon icon={feedback.type === "error" ? CancelCircleIcon : CheckmarkCircle02Icon} strokeWidth={2} className="size-4" />
                {feedback.text}
              </p>
            )}
          </div>
        </form>
      </div>
    </section>
  );
}

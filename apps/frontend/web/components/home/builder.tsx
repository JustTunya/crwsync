"use client";

import { useState } from "react";
import Link from "next/link";
import { HugeiconsIcon } from "@hugeicons/react";
import { CancelCircleIcon, CheckmarkCircle02Icon } from "@hugeicons/core-free-icons";
import { submitContactMessage } from "@/services/contact.service";
import { cn } from "@/lib/utils";

const inputClass =
  "w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-placeholder transition-[border-color,box-shadow] hover:border-foreground/30 focus:border-primary focus:outline-none focus:ring-3 focus:ring-primary/20";

export function Builder() {
  return (
    <section id="contact" aria-labelledby="contact-title" className="scroll-mt-24">
      <div className="mx-auto grid max-w-6xl lg:grid-cols-2 lg:border-x lg:border-border">
        <div className="px-4 sm:px-8 py-16 sm:py-24 lg:border-r lg:border-border">
          <h2 id="contact-title" className="text-3xl sm:text-4xl font-bold tracking-tight leading-[1.1] text-balance">
            Built solo by Tunya Lénárd-Sándor
          </h2>
          <p className="mt-5 max-w-[56ch] text-base sm:text-lg text-muted-foreground text-pretty">
            Portal, dashboard, API, queues, real-time layer, and deployment, all from one keyboard. crwsync exists to show what a production-shaped system looks like when one engineer owns every layer of it.
          </p>
          <p className="mt-4 max-w-[56ch] text-base text-muted-foreground text-pretty">
            Open to full-stack and platform roles, and to contract work. If the architecture on this page is the kind you want in your team, send a message.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="https://github.com/justtunya/crwsync"
              className="inline-flex h-10 items-center rounded-lg border border-border bg-card px-4 text-sm font-semibold transition-colors hover:border-foreground/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              Read the source on GitHub
            </Link>
            <Link
              href="https://www.linkedin.com/in/lenard-tunya/"
              className="inline-flex h-10 items-center rounded-lg border border-border bg-card px-4 text-sm font-semibold transition-colors hover:border-foreground/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              LinkedIn
            </Link>
          </div>

          <dl className="mt-10 grid gap-x-8 gap-y-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="font-semibold">What is simulated</dt>
              <dd className="mt-1 text-muted-foreground">Demo data only, no real customers. Email delivery needs your own SMTP credentials.</dd>
            </div>
            <div>
              <dt className="font-semibold">What is not</dt>
              <dd className="mt-1 text-muted-foreground">Auth, queues, real-time sync, and data integrity run exactly as they would in production.</dd>
            </div>
            <div>
              <dt className="font-semibold">License</dt>
              <dd className="mt-1 text-muted-foreground">PolyForm Noncommercial 1.0.0. Read it, study it, run it for yourself. Commercial use needs a separate license.</dd>
            </div>
            <div>
              <dt className="font-semibold">Stack</dt>
              <dd className="mt-1 text-muted-foreground">Next.js 16, React 19, NestJS 11, Prisma 7, Postgres 16, Redis 7, Socket.IO, BullMQ, Turborepo, Docker Swarm.</dd>
            </div>
          </dl>
        </div>

        <div className="border-t border-border px-4 sm:px-8 py-16 sm:py-24 lg:border-t-0">
          <ContactForm />
        </div>
      </div>
    </section>
  );
}

function ContactForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!name || !email || !message) {
      setFeedback({ type: "error", text: "Fill in your name, email, and a message first." });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    const res = await submitContactMessage({ name, email, message });

    setIsSubmitting(false);

    if (res.success) {
      setName("");
      setEmail("");
      setMessage("");
      setFeedback({ type: "success", text: "Message sent. Expect a reply within a couple of days." });
      setTimeout(() => setFeedback(null), 6000);
    } else {
      setFeedback({ type: "error", text: res.message || "The message could not be sent. Try again in a minute." });
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-5 rounded-xl border border-border bg-card p-5 sm:p-6"
      aria-labelledby="contact-form-title"
    >
      <div>
        <h3 id="contact-form-title" className="text-xl font-semibold">Send a message</h3>
        <p className="mt-1 text-sm text-muted-foreground">Goes through the same API and queue the product uses.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="name" className="text-sm font-medium text-foreground/90">Name</label>
          <input type="text" id="name" name="name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="email" className="text-sm font-medium text-foreground/90">Email</label>
          <input type="email" id="email" name="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="message" className="text-sm font-medium text-foreground/90">Message</label>
        <textarea
          id="message"
          name="message"
          rows={6}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="A role, a project, or a question about how something here is built."
          className={cn(inputClass, "resize-y min-h-32")}
        />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={!name || !email || !message || isSubmitting}
          className="group relative inline-flex h-10 items-center rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <span className="absolute inset-0 rounded-lg bg-linear-to-t from-foreground/15 to-transparent transition-colors group-hover:from-foreground/30" />
          <span className="relative">{isSubmitting ? "Sending…" : "Send message"}</span>
        </button>
        {feedback && (
          <p
            role="status"
            className={cn(
              "flex items-center gap-2 text-sm",
              feedback.type === "error" ? "text-error" : "text-success"
            )}
          >
            <HugeiconsIcon icon={feedback.type === "error" ? CancelCircleIcon : CheckmarkCircle02Icon} strokeWidth={2} className="size-4" />
            {feedback.text}
          </p>
        )}
      </div>
    </form>
  );
}

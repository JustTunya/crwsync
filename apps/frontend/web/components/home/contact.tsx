"use client";

import { useState } from "react";
import { submitContactMessage } from "../../services/contact.service";
import { HugeiconsIcon } from "@hugeicons/react";
import { CancelCircleIcon, CheckmarkCircle02Icon } from "@hugeicons/core-free-icons";

export default function Contact() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!name || !email || !message) {
      setFeedback({ type: "error", text: "Please fill out all fields." });
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
      setFeedback({ type: "success", text: "Thank you! Your message has been sent." });
      setTimeout(() => setFeedback(null), 5000);
    } else {
      setFeedback({ type: "error", text: res.message || "Failed to send message." });
    }
  }   
  
  return (
    <section id="contact" className="flex flex-col items-center gap-8 px-6 sm:px-12 pt-6 pb-12">
      <div className="flex items-center justify-center px-3 py-1.5 bg-background/15 dark:bg-linear-to-br from-foreground/20 via-foreground/12 to-foreground/10 border-[1.5px] border-foreground/20 backdrop-saturate-100 shadow-md shadow-black/5 rounded-full">
        <span className="text-balanced text-center text-sm text-muted-foreground tracking-wide leading-tighter">
          Contact
        </span>
      </div>

      <div className="flex flex-col sm:flex-row justify-center gap-8 sm:gap-16 max-w-4xl w-full p-8 bg-linear-to-br from-foreground/10 via-foreground/6 to-foreground/5 border-[1.5px] border-foreground/10 backdrop-saturate-100 shadow-md shadow-black/5 rounded-xl">
        <div className="flex flex-col gap-2 w-full sm:w-1/2">
          <h1 className="text-3xl lg:text-4xl font-bold text-center sm:text-left">Get in touch with me</h1>
          <p className="text-sm lg:text-base text-muted-foreground text-balance leading-tight max-w-xl text-center sm:text-left">I&apos;m always open to new opportunities and collaborations. Feel free to reach out if you have any questions or would like to discuss potential projects.</p>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label htmlFor="name" className="text-xs sm:text-sm font-light tracking-tight">Full Name</label>
            <input type="text" id="name" name="name" placeholder="John Doe" value={name} onChange={(e) => setName(e.target.value)} className="px-3 py-1.5 text-sm bg-linear-to-br from-foreground/10 via-foreground/6 to-foreground/5 border-[1.5px] border-foreground/10 backdrop-saturate-100 shadow-md shadow-black/5 rounded-md" />
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="email" className="text-xs sm:text-sm font-light tracking-tight">Email</label>
            <input type="email" id="email" name="email" placeholder="johndoe@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="px-3 py-1.5 text-sm bg-linear-to-br from-foreground/10 via-foreground/6 to-foreground/5 border-[1.5px] border-foreground/10 backdrop-saturate-100 shadow-md shadow-black/5 rounded-md" />
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="message" className="text-xs sm:text-sm font-light tracking-tight">Message</label>
            <textarea id="message" name="message" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Share your thoughts, ideas, or any questions you may have." className="px-3 py-1.5 text-sm bg-linear-to-br from-foreground/10 via-foreground/6 to-foreground/5 border-[1.5px] border-foreground/10 backdrop-saturate-100 shadow-md shadow-black/5 rounded-md"></textarea>
          </div>
          <button type="submit" disabled={!name || !email || !message || isSubmitting} className="group relative px-3 py-1.5 text-sm text-primary-foreground font-semibold foregroundspace-nowrap bg-primary rounded-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
            <div className="absolute inset-0 size-auto bg-linear-to-t from-foreground/15 group-hover:from-foreground/30 to-transparent rounded-lg transition-colors" />
            {isSubmitting ? "Sending..." : "Send"}
          </button>
          {feedback && (
            <p className={`flex items-center justify-center gap-2 text-sm text-center py-1 border backdrop-saturate-100 rounded-md ${feedback.type === "error" ? "text-error bg-error/10 border-error" : "text-success bg-success/10 border-success"}`}>
              <HugeiconsIcon icon={feedback.type === "error" ? CancelCircleIcon : CheckmarkCircle02Icon} strokeWidth={2} className="size-4" />
              {feedback.text}
            </p>
          )}
        </form>
      </div>
    </section>
  );
}
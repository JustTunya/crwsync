import { HugeiconsIcon } from "@hugeicons/react";
import { Calendar01Icon, Chat01Icon, CheckmarkSquare02Icon, File01Icon } from "@hugeicons/core-free-icons";

const FEATURES = [
  {
    icon: Chat01Icon,
    title: "Chat summaries",
    detail: "Catch up on a busy room in a few lines instead of scrolling a day of messages.",
  },
  {
    icon: File01Icon,
    title: "Board digests",
    detail: "What moved, what is stuck, and what is due, written from the board's real activity.",
  },
  {
    icon: CheckmarkSquare02Icon,
    title: "Task drafts from messages",
    detail: "Turn a thread into draft tasks. Nothing is created until a member confirms.",
  },
  {
    icon: Calendar01Icon,
    title: "Stand-up notes",
    detail: "A short yesterday, today, and blockers note assembled from what the crew actually did.",
  },
];

export function Claude() {
  return (
    <div>
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {FEATURES.map((feature) => (
          <li key={feature.title} className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <span className="flex size-9 items-center justify-center rounded-lg bg-foreground/8 text-foreground">
              <HugeiconsIcon icon={feature.icon} className="size-5" strokeWidth={1.75} />
            </span>
            <h3 className="mt-4 text-xl font-semibold">{feature.title}</h3>
            <p className="mt-1.5 text-sm leading-snug text-muted-foreground">{feature.detail}</p>
          </li>
        ))}
      </ul>
      <p className="mt-6 max-w-[64ch] text-sm text-muted-foreground">
        Powered by Claude through the Anthropic API, called from the server only. Available in workspaces where the
        operator enables it, and it runs only when a member asks. AI output can be wrong, so check it before acting.
      </p>
    </div>
  );
}

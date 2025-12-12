"use client";

import { useState, useTransition } from "react";
import { LogOut, ShieldCheck } from "lucide-react";
import { signout } from "@/services/auth.service";
import { useUser } from "@/providers/user.provider";

export default function DashboardPage() {
  const user = useUser();
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const handleSignout = () => {
    start(async () => {
      const result = await signout();
      setMessage(result.message ?? null);
      window.location.assign(process.env.NEXT_PUBLIC_WEB_URL!);
    });
  };

  return (
    <main className="min-h-screen px-6 py-10 sm:px-10">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="flex items-center justify-between rounded-2xl border border-border bg-card px-6 py-4 shadow-lg shadow-primary/5">
          <div>
            <p className="text-sm text-muted-foreground">Signed in as</p>
            <p className="text-xl font-semibold text-foreground">{user?.username ?? "User"}</p>
          </div>
          <button
            onClick={handleSignout}
            disabled={pending}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-md shadow-primary/20 transition hover:translate-y-px hover:shadow-lg hover:shadow-primary/25 disabled:opacity-70"
          >
            <LogOut size={16} />
            Sign out
          </button>
        </header>

        <section className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-border bg-card px-5 py-4 shadow-lg shadow-primary/5">
            <div className="flex items-center gap-3">
              <ShieldCheck className="text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <p className="text-lg font-semibold text-foreground">Authenticated</p>
              </div>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              Welcome to the dashboard at dash.crwsync.com. Add widgets and product screens here.
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-card px-5 py-4 shadow-lg shadow-primary/5">
            <p className="text-sm text-muted-foreground">Next steps</p>
            <ul className="mt-2 space-y-1 text-sm text-foreground">
              <li>• Wire product data sources</li>
              <li>• Add dashboard routes under /app/(routes)</li>
              <li>• Use the shared auth client for API calls</li>
            </ul>
            {message && <p className="mt-3 text-xs text-muted-foreground">{message}</p>}
          </div>
        </section>
      </div>
    </main>
  );
}
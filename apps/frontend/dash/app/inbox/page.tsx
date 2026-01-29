export default function InboxPage() {
  return (
    <main className="min-h-screen px-6 py-10 sm:px-10">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="flex items-center justify-between rounded-2xl border border-border bg-card px-6 py-4 shadow-lg shadow-primary/5">
          <div>
            <p className="text-sm text-muted-foreground">Inbox</p>
            <p className="text-xl font-semibold text-foreground">Your Messages</p>
          </div>
        </header>

        <section className="rounded-2xl border border-border bg-card px-5 py-4 shadow-lg shadow-primary/5">
          <p className="text-sm text-muted-foreground">This is the inbox page. View and manage your messages here.</p>
        </section>
      </div>
    </main>
  );
}
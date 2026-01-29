export default function SettingsPage() {
  return (
    <main className="min-h-screen px-6 py-10 sm:px-10">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="flex items-center justify-between rounded-2xl border border-border bg-card px-6 py-4 shadow-lg shadow-primary/5">
          <div>
            <p className="text-sm text-muted-foreground">Settings</p>
            <p className="text-xl font-semibold text-foreground">User Preferences</p>
          </div>
        </header>

        <section className="rounded-2xl border border-border bg-card px-5 py-4 shadow-lg shadow-primary/5">
          <p className="text-sm text-muted-foreground">This is the settings page. Configure your user preferences here.</p>
        </section>
      </div>
    </main>
  );
}
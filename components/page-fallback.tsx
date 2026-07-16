import { AppHeader } from "./app-header";

/** Shared Suspense fallback for the protected pages. */
export function PageFallback() {
  return (
    <div className="min-h-svh bg-background">
      <AppHeader />
      <main className="mx-auto flex max-w-2xl flex-col items-center px-4 py-16">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </main>
    </div>
  );
}

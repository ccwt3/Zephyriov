import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { StudySession } from "@/components/study/study-session";
import { PageFallback } from "@/components/page-fallback";
import { getOrCreateTodaySession } from "@/lib/actions/session";

export default function StudyPage() {
  return (
    <Suspense fallback={<PageFallback />}>
      <StudyContent />
    </Suspense>
  );
}

async function StudyContent() {
  let session;
  try {
    session = await getOrCreateTodaySession();
  } catch {
    redirect("/auth/login");
  }

  return (
    <div className="min-h-svh bg-background">
      <AppHeader />
      <main className="mx-auto flex max-w-2xl flex-col items-center gap-6 px-4 py-8">
        {session.pendingItems.length === 0 ? (
          <div className="card-vintage flex flex-col items-center gap-4 p-8 text-center">
            <span className="text-4xl">♛</span>
            <h2 className="text-2xl">All done for today</h2>
            <p className="text-sm text-muted-foreground">
              {session.totalCount === 0
                ? "Nothing is due today — your reviews are all scheduled for later."
                : "Every line due today has been reviewed. Come back tomorrow."}
            </p>
            <Link
              href="/"
              className="label-vintage rounded-sm border-2 border-ink/90 bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-press-sm hover:brightness-110"
            >
              Back home
            </Link>
          </div>
        ) : (
          <StudySession
            initialItems={session.pendingItems}
            completedCount={session.completedCount}
            totalCount={session.totalCount}
          />
        )}
      </main>
    </div>
  );
}

import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { ProgressBar } from "@/components/progress-bar";
import { StreakSeal } from "@/components/streak-seal";
import { StarDivider } from "@/components/star-divider";
import { PageFallback } from "@/components/page-fallback";
import { getDashboardData } from "@/lib/queries/dashboard";

export default function HomePage() {
  return (
    <Suspense fallback={<PageFallback />}>
      <HomeContent />
    </Suspense>
  );
}

async function HomeContent() {
  let data;
  try {
    data = await getDashboardData();
  } catch {
    redirect("/auth/login");
  }

  if (!data.profile.onboarded_at) {
    redirect("/onboarding");
  }

  const { streak, todayStatus, dueCount, openings } = data;

  return (
    <div className="min-h-svh bg-background">
      <AppHeader />
      <main className="mx-auto flex max-w-2xl flex-col gap-8 px-4 py-8">
        <section className="flex flex-col items-center gap-4 text-center">
          <StreakSeal current={streak.current} best={streak.best} />

          {todayStatus === "completed" ? (
            <p className="label-vintage rounded-sm border-2 border-teal bg-teal/10 px-6 py-3 text-sm font-medium text-teal shadow-press-sm">
              ✓ Today&apos;s session is complete
            </p>
          ) : (
            <Link
              href="/study"
              className="label-vintage ribbon w-full max-w-xs bg-primary py-4 text-center text-lg font-semibold text-primary-foreground hover:brightness-110"
            >
              {todayStatus === "in_progress"
                ? "Continue daily session"
                : "Complete daily session"}
            </Link>
          )}
          {todayStatus !== "completed" && (
            <p className="label-vintage text-xs text-muted-foreground">
              {dueCount} line{dueCount === 1 ? "" : "s"} due today
            </p>
          )}
        </section>

        <section className="flex flex-col gap-4">
          <StarDivider>Your openings</StarDivider>
          {openings.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No openings yet —{" "}
              <Link href="/onboarding" className="text-primary underline">
                analyze your games
              </Link>{" "}
              to get started.
            </p>
          )}
          {openings.map((opening) => (
            <div key={opening.userOpeningId} className="card-vintage p-4">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-sm font-medium">
                  {opening.name}
                  <span className="label-vintage ml-2 text-[10px] text-muted-foreground">
                    as {opening.color}
                  </span>
                </p>
                <span className="text-xs tabular-nums text-muted-foreground">
                  {Math.round(opening.progress * 100)}%
                </span>
              </div>
              <ProgressBar value={opening.progress} />
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}

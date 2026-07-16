import { Suspense } from "react";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { ProgressBar } from "@/components/progress-bar";
import { GradeBadge } from "@/components/study/grade-badge";
import { PageFallback } from "@/components/page-fallback";
import { getDashboardData } from "@/lib/queries/dashboard";

export default function ProgressPage() {
  return (
    <Suspense fallback={<PageFallback />}>
      <ProgressContent />
    </Suspense>
  );
}

async function ProgressContent() {
  let data;
  try {
    data = await getDashboardData();
  } catch {
    redirect("/auth/login");
  }

  return (
    <div className="min-h-svh bg-background">
      <AppHeader />
      <main className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-8">
        <h1 className="text-center text-2xl">★ Progress ★</h1>

        {data.openings.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No openings selected yet.
          </p>
        )}

        {data.openings.map((opening) => (
          <section
            key={opening.userOpeningId}
            className="card-vintage p-4"
          >
            <div className="mb-1 flex items-center justify-between gap-2">
              <h2 className="text-lg">
                {opening.name}{" "}
                <span className="label-vintage font-sans text-[10px] text-muted-foreground">
                  {opening.eco} · as {opening.color}
                </span>
              </h2>
              <span className="text-sm tabular-nums text-muted-foreground">
                {Math.round(opening.progress * 100)}%
              </span>
            </div>
            <ProgressBar value={opening.progress} />

            <ul className="mt-4 flex flex-col gap-2">
              {opening.lines.map((line) => (
                <li
                  key={line.rank}
                  className="flex items-center justify-between gap-2 border-t border-dashed border-ink/30 pt-2 text-sm"
                >
                  <div>
                    <p>{line.lineName}</p>
                    <p className="text-xs text-muted-foreground">
                      {line.reps === 0
                        ? "not seen yet"
                        : `${line.unlockedMoves}/${line.totalMoves} moves · due ${line.dueDate}`}
                    </p>
                  </div>
                  {line.lastResult && <GradeBadge grade={line.lastResult} />}
                </li>
              ))}
            </ul>
          </section>
        ))}
      </main>
    </div>
  );
}

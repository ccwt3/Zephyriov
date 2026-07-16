import { Suspense } from "react";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { SettingsForm } from "@/components/settings/settings-form";
import { OpeningColorList } from "@/components/settings/opening-color-list";
import { PageFallback } from "@/components/page-fallback";
import { getDashboardData } from "@/lib/queries/dashboard";

export default function SettingsPage() {
  return (
    <Suspense fallback={<PageFallback />}>
      <SettingsContent />
    </Suspense>
  );
}

async function SettingsContent() {
  let data;
  try {
    data = await getDashboardData();
  } catch {
    redirect("/auth/login");
  }

  return (
    <div className="min-h-svh bg-background">
      <AppHeader />
      <main className="mx-auto flex max-w-2xl flex-col gap-8 px-4 py-8">
        <h1 className="text-center text-2xl">★ Settings ★</h1>

        <SettingsForm
          linesPerSession={data.profile.lines_per_session}
          movesPerBlock={data.profile.moves_per_block}
          timezone={data.profile.timezone}
          timeControls={data.profile.analysis_time_controls}
        />

        <OpeningColorList
          openings={data.openings.map((o) => ({
            userOpeningId: o.userOpeningId,
            name: o.name,
            color: o.color,
            playableColors: o.playableColors,
          }))}
        />
      </main>
    </div>
  );
}

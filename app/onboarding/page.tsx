import { Suspense } from "react";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { OnboardingFlow } from "@/components/onboarding/onboarding-flow";
import { PageFallback } from "@/components/page-fallback";
import { requireUser } from "@/lib/actions/auth-helpers";

export default function OnboardingPage() {
  return (
    <Suspense fallback={<PageFallback />}>
      <OnboardingContent />
    </Suspense>
  );
}

async function OnboardingContent() {
  let profile;
  try {
    ({ profile } = await requireUser());
  } catch {
    redirect("/auth/login");
  }

  return (
    <div className="min-h-svh bg-background">
      <AppHeader />
      <main className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-8">
        <div>
          <h1 className="text-2xl">Build your repertoire</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            We analyze your recent games and pick the 3 openings you play most
            as White and as Black. Those become your study material.
          </p>
        </div>
        <OnboardingFlow
          initialLichess={profile.lichess_username ?? ""}
          initialChesscom={profile.chesscom_username ?? ""}
        />
      </main>
    </div>
  );
}

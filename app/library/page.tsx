import { Suspense } from "react";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { PageFallback } from "@/components/page-fallback";
import { LibraryList } from "@/components/library/library-list";
import { getLibraryData } from "@/lib/queries/library";

export default function LibraryPage() {
  return (
    <Suspense fallback={<PageFallback />}>
      <LibraryContent />
    </Suspense>
  );
}

async function LibraryContent() {
  let openings;
  try {
    openings = await getLibraryData();
  } catch {
    redirect("/auth/login");
  }

  return (
    <div className="min-h-svh bg-background">
      <AppHeader />
      <main className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-8">
        <div>
          <h1 className="text-center text-2xl">★ Library ★</h1>
          <p className="mt-1 text-center text-sm text-muted-foreground">
            Every opening in the catalog. Add the ones you want to your daily
            study — removing one keeps its progress for later.
          </p>
        </div>
        <LibraryList openings={openings} />
      </main>
    </div>
  );
}

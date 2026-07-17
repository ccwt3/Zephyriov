import Link from "next/link";
import { LogoutButton } from "./logout-button";

export function AppHeader() {
  return (
    <header className="w-full border-b-4 border-double border-ink/80 bg-primary text-primary-foreground shadow-[0_3px_0_0_hsl(var(--teal))]">
      <div className="mx-auto flex h-14 max-w-2xl items-center justify-between gap-1 px-2 sm:gap-2 sm:px-4">
        <Link
          href="/"
          className="shrink-0 font-display text-base tracking-wide [text-shadow:2px_2px_0_hsl(var(--ink)/0.35)] sm:text-xl"
        >
          ♞ Zephyriov
        </Link>
        <nav className="label-vintage flex items-center gap-1.5 text-[10px] sm:gap-5 sm:text-sm">
          <Link
            href="/progress"
            className="border-b-2 border-transparent pb-0.5 text-primary-foreground/85 hover:border-gold hover:text-gold"
          >
            Progress
          </Link>
          <Link
            href="/library"
            className="border-b-2 border-transparent pb-0.5 text-primary-foreground/85 hover:border-gold hover:text-gold"
          >
            Library
          </Link>
          <Link
            href="/settings"
            className="border-b-2 border-transparent pb-0.5 text-primary-foreground/85 hover:border-gold hover:text-gold"
          >
            Settings
          </Link>
          <LogoutButton />
        </nav>
      </div>
    </header>
  );
}

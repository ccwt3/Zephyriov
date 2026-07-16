/** Section heading flanked by rules and stars, like a vintage poster divider. */
export function StarDivider({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span className="h-0.5 flex-1 bg-ink/30" aria-hidden />
      <span className="text-xs text-primary" aria-hidden>
        ★
      </span>
      <h2 className="text-lg">{children}</h2>
      <span className="text-xs text-primary" aria-hidden>
        ★
      </span>
      <span className="h-0.5 flex-1 bg-ink/30" aria-hidden />
    </div>
  );
}

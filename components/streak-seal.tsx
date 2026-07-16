/** Serrated bottle-cap seal (like a vintage brand stamp) holding the streak count. */
export function StreakSeal({ current, best }: { current: number; best: number }) {
  const points = seal(28, 70, 64);
  return (
    <div className="relative h-40 w-40 drop-shadow-[3px_3px_0_hsl(var(--ink)/0.4)]">
      <svg viewBox="0 0 140 140" className="h-full w-full" aria-hidden>
        <polygon points={points} fill="hsl(var(--teal))" />
        <circle cx="70" cy="70" r="54" fill="hsl(var(--paper))" />
        <circle
          cx="70"
          cy="70"
          r="49"
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth="2"
          strokeDasharray="4 3"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-4xl leading-none text-primary">
          {current}
        </span>
        <span className="label-vintage mt-1 text-[10px] text-muted-foreground">
          day streak
        </span>
        <span className="label-vintage text-[10px] text-teal">
          ★ best {best} ★
        </span>
      </div>
    </div>
  );
}

/** Builds the serrated polygon: `teeth` points alternating between two radii. */
function seal(teeth: number, outer: number, inner: number): string {
  const pts: string[] = [];
  for (let i = 0; i < teeth * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const angle = (Math.PI * i) / teeth;
    pts.push(`${70 + r * Math.sin(angle)},${70 - r * Math.cos(angle)}`);
  }
  return pts.join(" ");
}

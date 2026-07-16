interface Props {
  /** 0..1 */
  value: number;
}

export function ProgressBar({ value }: Props) {
  const pct = Math.round(Math.min(Math.max(value, 0), 1) * 100);
  return (
    <div
      className="h-4 w-full overflow-hidden rounded-full border-2 border-ink/80 bg-paper p-0.5"
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full rounded-full bg-teal transition-all"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

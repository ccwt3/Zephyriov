"use client";

import type { AnalysisTimeControl } from "@/lib/db/types";

const OPTIONS: { value: AnalysisTimeControl; label: string; hint: string }[] = [
  { value: "bullet", label: "Bullet", hint: "" },
  { value: "blitz", label: "Blitz", hint: "" },
  { value: "rapid", label: "Rapid", hint: "" },
  { value: "slow", label: "Slow", hint: "classical · daily" },
];

/** Chip toggles for the time controls the game analysis looks at. */
export function TimeControlPicker({
  value,
  onChange,
}: {
  value: AnalysisTimeControl[];
  onChange: (next: AnalysisTimeControl[]) => void;
}) {
  function toggle(tc: AnalysisTimeControl) {
    onChange(
      value.includes(tc) ? value.filter((v) => v !== tc) : [...value, tc],
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {OPTIONS.map((option) => {
        const selected = value.includes(option.value);
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => toggle(option.value)}
            className={`label-vintage rounded-full border-2 border-ink/80 px-3 py-1 text-xs font-medium shadow-press-sm hover:bg-gold/30 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none ${
              selected ? "bg-gold/40" : "bg-paper opacity-70"
            }`}
            title={option.hint || undefined}
          >
            {selected ? "✓ " : ""}
            {option.label}
            {option.hint && (
              <span className="ml-1 font-normal normal-case text-muted-foreground">
                ({option.hint})
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

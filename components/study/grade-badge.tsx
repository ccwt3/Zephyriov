import type { Grade } from "@/lib/srs/types";

const STYLES: Record<Grade, string> = {
  good: "bg-teal text-secondary-foreground",
  mid: "bg-gold text-accent-foreground",
  bad: "bg-destructive text-destructive-foreground",
};

const LABELS: Record<Grade, string> = {
  good: "Good",
  mid: "Mid",
  bad: "Bad",
};

export function GradeBadge({ grade }: { grade: Grade }) {
  return (
    <span
      className={`label-vintage ribbon inline-block py-1 text-sm font-semibold ${STYLES[grade]}`}
    >
      {LABELS[grade]}
    </span>
  );
}

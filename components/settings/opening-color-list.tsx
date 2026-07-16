"use client";

import { useState } from "react";
import { changeOpeningColor } from "@/lib/actions/onboarding";
import type { ChessColor } from "@/lib/db/types";

interface OpeningRow {
  userOpeningId: string;
  name: string;
  color: ChessColor;
  playableColors: ChessColor[];
}

export function OpeningColorList({ openings }: { openings: OpeningRow[] }) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSwitch(opening: OpeningRow) {
    const next: ChessColor = opening.color === "white" ? "black" : "white";
    const confirmed = window.confirm(
      `Practice ${opening.name} as ${next}? This resets the SRS progress of its lines, because the moves you are graded on change.`,
    );
    if (!confirmed) return;

    setBusyId(opening.userOpeningId);
    setError(null);
    try {
      await changeOpeningColor(opening.userOpeningId, next);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusyId(null);
    }
  }

  if (openings.length === 0) return null;

  return (
    <section className="card-vintage flex flex-col gap-3 p-4">
      <h2 className="text-lg">Your openings</h2>
      <ul className="flex flex-col gap-2">
        {openings.map((opening) => (
          <li
            key={opening.userOpeningId}
            className="flex items-center justify-between gap-2 text-sm"
          >
            <span>{opening.name}</span>
            <button
              onClick={() => handleSwitch(opening)}
              disabled={
                opening.playableColors.length < 2 ||
                busyId === opening.userOpeningId
              }
              className={`label-vintage rounded-full border-2 border-ink/80 bg-paper px-3 py-1 text-xs font-medium shadow-press-sm ${
                opening.playableColors.length > 1
                  ? "hover:bg-gold/30 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
                  : "opacity-60"
              }`}
              title={
                opening.playableColors.length > 1
                  ? "Switch the side you practice (resets this opening's progress)"
                  : "This opening is studied from one side only"
              }
            >
              {opening.color === "white" ? "♔ White" : "♚ Black"}
              {opening.playableColors.length > 1 && " ⇄"}
            </button>
          </li>
        ))}
      </ul>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </section>
  );
}

"use client";

import { useState } from "react";
import { addOpening, removeOpening } from "@/lib/actions/library";
import type { LibraryOpening } from "@/lib/queries/library";
import type { ChessColor } from "@/lib/db/types";
import { Button } from "@/components/ui/button";

export function LibraryList({ openings }: { openings: LibraryOpening[] }) {
  // Color picked for each not-yet-added opening (defaults to its main color).
  const [colors, setColors] = useState<Record<string, ChessColor>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function colorFor(opening: LibraryOpening): ChessColor {
    return colors[opening.id] ?? opening.playableColors[0];
  }

  function toggleColor(opening: LibraryOpening) {
    if (opening.playableColors.length < 2) return;
    setColors((prev) => ({
      ...prev,
      [opening.id]: colorFor(opening) === "white" ? "black" : "white",
    }));
  }

  async function handleAdd(opening: LibraryOpening) {
    setBusyId(opening.id);
    setError(null);
    try {
      await addOpening(opening.id, colorFor(opening));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusyId(null);
    }
  }

  async function handleRemove(opening: LibraryOpening) {
    if (!opening.active) return;
    const confirmed = window.confirm(
      `Remove ${opening.name} from your studies? Its lines leave the daily rotation, but your progress is kept in case you add it back.`,
    );
    if (!confirmed) return;

    setBusyId(opening.id);
    setError(null);
    try {
      await removeOpening(opening.active.userOpeningId);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {error && <p className="text-sm text-destructive">{error}</p>}

      {openings.map((opening) => {
        const color = colorFor(opening);
        return (
          <section key={opening.id} className="card-vintage p-4">
            <div className="mb-2 flex items-center justify-between gap-2">
              <h2 className="text-lg">
                {opening.name}{" "}
                <span className="label-vintage font-sans text-[10px] text-muted-foreground">
                  {opening.eco} ·{" "}
                  {opening.playableColors.length > 1
                    ? "white or black"
                    : `${opening.playableColors[0]} only`}
                </span>
              </h2>
              {opening.active && (
                <span className="label-vintage whitespace-nowrap rounded-full border-2 border-teal bg-teal/10 px-3 py-1 text-[10px] font-medium text-teal">
                  In your studies · as {opening.active.color}
                </span>
              )}
            </div>

            <ul className="flex flex-col gap-2">
              {opening.lines.map((line) => (
                <li
                  key={line.rank}
                  className="border-t border-dashed border-ink/30 pt-2 text-sm"
                >
                  <p>{line.name}</p>
                  <p className="font-mono text-xs text-muted-foreground">
                    {line.notation}
                  </p>
                </li>
              ))}
            </ul>

            <div className="mt-4 flex items-center justify-end gap-2">
              {opening.active ? (
                <Button
                  variant="outline"
                  onClick={() => handleRemove(opening)}
                  disabled={busyId !== null}
                >
                  {busyId === opening.id ? "Removing…" : "Remove from studies"}
                </Button>
              ) : (
                <>
                  <button
                    onClick={() => toggleColor(opening)}
                    disabled={opening.playableColors.length < 2}
                    className={`label-vintage rounded-full border-2 border-ink/80 bg-paper px-3 py-1 text-xs font-medium shadow-press-sm ${
                      opening.playableColors.length > 1
                        ? "hover:bg-gold/30 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
                        : "opacity-60"
                    }`}
                    title={
                      opening.playableColors.length > 1
                        ? "Click to switch color"
                        : "This opening is studied from one side only"
                    }
                  >
                    {color === "white" ? "♔ White" : "♚ Black"}
                    {opening.playableColors.length > 1 && " ⇄"}
                  </button>
                  <Button
                    onClick={() => handleAdd(opening)}
                    disabled={busyId !== null}
                  >
                    {busyId === opening.id ? "Adding…" : "Add to my studies"}
                  </Button>
                </>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}

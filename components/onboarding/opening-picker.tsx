"use client";

import type { LibraryOpening } from "@/lib/queries/library";
import type { ChessColor } from "@/lib/db/types";
import { Checkbox } from "@/components/ui/checkbox";

interface Props {
  catalog: LibraryOpening[];
  /** Openings currently selected, keyed by opening id. */
  selected: Map<string, ChessColor>;
  onToggle: (opening: LibraryOpening) => void;
  onColorChange: (opening: LibraryOpening) => void;
}

/** Compact catalog browser for picking a repertoire by hand. */
export function OpeningPicker({
  catalog,
  selected,
  onToggle,
  onColorChange,
}: Props) {
  return (
    <ul className="flex flex-col gap-2">
      {catalog.map((opening) => {
        const color = selected.get(opening.id);
        const isSelected = color !== undefined;
        return (
          <li key={opening.id} className="card-vintage flex flex-col gap-2 p-3">
            <div className="flex items-center justify-between gap-2">
              <label className="flex cursor-pointer items-center gap-3 text-sm font-medium">
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => onToggle(opening)}
                />
                {opening.name}
                <span className="label-vintage text-[10px] font-normal text-muted-foreground">
                  {opening.eco}
                </span>
              </label>
              {isSelected && (
                <button
                  onClick={() => onColorChange(opening)}
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
              )}
            </div>
            <details>
              <summary className="cursor-pointer text-xs text-muted-foreground">
                {opening.lines.length} lines
              </summary>
              <ul className="mt-2 flex flex-col gap-1">
                {opening.lines.map((line) => (
                  <li key={line.rank} className="text-xs">
                    <span className="font-medium">{line.name}</span>{" "}
                    <span className="font-mono text-muted-foreground">
                      {line.notation}
                    </span>
                  </li>
                ))}
              </ul>
            </details>
          </li>
        );
      })}
    </ul>
  );
}

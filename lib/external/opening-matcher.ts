import type { AnalyzedGame } from "./types";

export interface CatalogOpening {
  id: string;
  slug: string;
  name: string;
  playable_colors: ("white" | "black")[];
  detection_keys: string[];
}

export interface OpeningSuggestion {
  openingId: string;
  slug: string;
  name: string;
  color: "white" | "black";
  gamesCount: number;
  playableColors: ("white" | "black")[];
}

/** Lowercase and strip everything but letters/digits, so "Caro-Kann Defense:"
 *  and "Caro Kann Defense" (Chess.com URL style) normalize identically. */
function normalize(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * Matches a game's opening tag against the catalog. When several openings
 * match (e.g. "Caro-Kann" and "Fantasy Variation"), the longest matched key
 * wins — the most specific opening takes priority.
 */
export function matchOpening(
  openingName: string,
  catalog: CatalogOpening[],
): CatalogOpening | null {
  const normalized = normalize(openingName);
  let best: CatalogOpening | null = null;
  let bestKeyLength = 0;

  for (const opening of catalog) {
    for (const key of opening.detection_keys) {
      const normalizedKey = normalize(key);
      if (
        normalizedKey.length > bestKeyLength &&
        normalized.includes(normalizedKey)
      ) {
        best = opening;
        bestKeyLength = normalizedKey.length;
      }
    }
  }
  return best;
}

/**
 * Counts games per (opening, color) and returns the top `perColor` openings
 * the user actually plays with each color, restricted to colors the catalog
 * marks as playable for that opening.
 */
export function suggestOpenings(
  games: AnalyzedGame[],
  catalog: CatalogOpening[],
  perColor = 3,
): OpeningSuggestion[] {
  const counts = new Map<string, OpeningSuggestion>();

  for (const game of games) {
    const opening = matchOpening(game.openingName, catalog);
    if (!opening) continue;
    if (!opening.playable_colors.includes(game.color)) continue;

    const key = `${opening.id}:${game.color}`;
    const existing = counts.get(key);
    if (existing) {
      existing.gamesCount++;
    } else {
      counts.set(key, {
        openingId: opening.id,
        slug: opening.slug,
        name: opening.name,
        color: game.color,
        gamesCount: 1,
        playableColors: opening.playable_colors,
      });
    }
  }

  const sorted = [...counts.values()].sort(
    (a, b) => b.gamesCount - a.gamesCount,
  );
  const white = sorted.filter((s) => s.color === "white").slice(0, perColor);
  const whiteIds = new Set(white.map((s) => s.openingId));
  // The same opening can't be studied from both colors at once.
  const black = sorted
    .filter((s) => s.color === "black" && !whiteIds.has(s.openingId))
    .slice(0, perColor);

  return [...white, ...black];
}

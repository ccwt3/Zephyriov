import type { AnalyzedGame } from "./types";
import { userAgent } from "./user-agent";

const MAX_ARCHIVES = 3; // ~3 most recent months
const MAX_GAMES = 300;
const TIME_CLASSES = new Set(["blitz", "rapid", "daily"]);

interface ChesscomGame {
  pgn?: string;
  time_class?: string;
  white?: { username?: string };
  black?: { username?: string };
}

/**
 * Fetches the user's recent Chess.com games from the public monthly
 * archives and extracts the opening from the PGN headers.
 */
export async function fetchChesscomGames(
  username: string,
): Promise<AnalyzedGame[]> {
  // Archives are fetched serially (see the loop below): Chess.com rate-limits
  // parallel requests but leaves serial access unlimited.
  const headers = { "User-Agent": userAgent() };

  const archivesRes = await fetch(
    `https://api.chess.com/pub/player/${encodeURIComponent(username.toLowerCase())}/games/archives`,
    { headers, cache: "no-store" },
  );
  if (!archivesRes.ok) {
    throw new Error(
      `Chess.com API error for "${username}": ${archivesRes.status}`,
    );
  }

  const { archives = [] } = (await archivesRes.json()) as {
    archives?: string[];
  };
  const recent = archives.slice(-MAX_ARCHIVES).reverse();

  const games: AnalyzedGame[] = [];
  const lowerUser = username.toLowerCase();

  for (const archiveUrl of recent) {
    if (games.length >= MAX_GAMES) break;
    const res = await fetch(archiveUrl, { headers, cache: "no-store" });
    if (!res.ok) continue;
    const { games: monthGames = [] } = (await res.json()) as {
      games?: ChesscomGame[];
    };

    for (const game of monthGames) {
      if (games.length >= MAX_GAMES) break;
      if (!game.time_class || !TIME_CLASSES.has(game.time_class)) continue;
      const opening = extractOpening(game.pgn ?? "");
      if (!opening.name) continue;

      const color =
        game.white?.username?.toLowerCase() === lowerUser ? "white" : "black";
      games.push({ openingName: opening.name, eco: opening.eco, color });
    }
  }
  return games;
}

/** Reads the ECO / ECOUrl PGN headers, e.g. ".../openings/Sicilian-Defense-Dragon-Variation". */
function extractOpening(pgn: string): { name: string | null; eco: string | null } {
  const eco = pgn.match(/\[ECO "([^"]+)"\]/)?.[1] ?? null;
  const ecoUrl = pgn.match(/\[ECOUrl "([^"]+)"\]/)?.[1];
  if (!ecoUrl) return { name: null, eco };
  const slug = ecoUrl.split("/openings/")[1];
  if (!slug) return { name: null, eco };
  return { name: slug.replaceAll("-", " "), eco };
}

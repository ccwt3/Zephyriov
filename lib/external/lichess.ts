import type { AnalyzedGame } from "./types";
import type { AnalysisTimeControl } from "@/lib/db/types";
import { userAgent } from "./user-agent";

const MAX_GAMES = 300;

// "slow" means classical here; correspondence is deliberately left out.
const PERF_TYPE: Record<AnalysisTimeControl, string> = {
  bullet: "bullet",
  blitz: "blitz",
  rapid: "rapid",
  slow: "classical",
};

interface LichessGame {
  players?: {
    white?: { user?: { name?: string } };
    black?: { user?: { name?: string } };
  };
  opening?: { eco?: string; name?: string };
}

/**
 * Fetches the user's recent Lichess games in the requested time controls,
 * with opening tags. Public endpoint, no token required.
 */
export async function fetchLichessGames(
  username: string,
  timeControls: AnalysisTimeControl[],
): Promise<AnalyzedGame[]> {
  const perfType = timeControls.map((tc) => PERF_TYPE[tc]).join(",");
  const url =
    `https://lichess.org/api/games/user/${encodeURIComponent(username)}` +
    `?max=${MAX_GAMES}&opening=true&perfType=${perfType}`;

  const res = await fetch(url, {
    headers: {
      Accept: "application/x-ndjson",
      "User-Agent": userAgent(),
    },
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Lichess API error for "${username}": ${res.status}`);
  }

  const text = await res.text();
  const games: AnalyzedGame[] = [];
  const lowerUser = username.toLowerCase();

  for (const line of text.split("\n")) {
    if (!line.trim()) continue;
    let game: LichessGame;
    try {
      game = JSON.parse(line);
    } catch {
      continue;
    }
    const openingName = game.opening?.name;
    if (!openingName) continue;

    // Match the user on either side; skip games where neither side matches
    // (e.g. anonymous players) instead of guessing the color.
    const whiteName = game.players?.white?.user?.name?.toLowerCase();
    const blackName = game.players?.black?.user?.name?.toLowerCase();
    let color: "white" | "black";
    if (whiteName === lowerUser) color = "white";
    else if (blackName === lowerUser) color = "black";
    else continue;

    games.push({ openingName, eco: game.opening?.eco ?? null, color });
  }
  return games;
}

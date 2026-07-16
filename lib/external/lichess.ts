import type { AnalyzedGame } from "./types";
import { userAgent } from "./user-agent";

const MAX_GAMES = 300;

interface LichessGame {
  players?: {
    white?: { user?: { name?: string } };
    black?: { user?: { name?: string } };
  };
  opening?: { eco?: string; name?: string };
}

/**
 * Fetches the user's recent Lichess games (blitz/rapid/classical) with
 * opening tags. Public endpoint, no token required.
 */
export async function fetchLichessGames(
  username: string,
): Promise<AnalyzedGame[]> {
  const url =
    `https://lichess.org/api/games/user/${encodeURIComponent(username)}` +
    `?max=${MAX_GAMES}&opening=true&perfType=blitz,rapid,classical`;

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

    const whiteName = game.players?.white?.user?.name?.toLowerCase();
    const color = whiteName === lowerUser ? "white" : "black";
    games.push({ openingName, eco: game.opening?.eco ?? null, color });
  }
  return games;
}

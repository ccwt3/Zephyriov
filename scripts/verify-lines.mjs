// Checks catalog lines against real opening theory: walks every line
// position-by-position through the Lichess Masters database (OTB master games,
// https://explorer.lichess.ovh/masters) and reports, per move, whether the
// move is played at that position and with what frequency. This is the
// mechanical arm of the curation methodology in README ("Metodología de
// curaduría"): generate-seed.mjs proves a line is *legal*; this script shows
// whether it matches what masters actually play.
//
// Usage:
//   node scripts/verify-lines.mjs                 # verify the whole catalog
//   node scripts/verify-lines.mjs ruy-lopez ...   # verify specific slugs
//   node scripts/verify-lines.mjs --explore "e4 c5 Nf3 g6"
//       # print the masters' top responses after a SAN sequence (line research)
//
// Results are cached on disk (node_modules/.cache/) so re-runs are free.
import { Chess } from "chess.js";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { catalog } from "./catalog/index.mjs";

const API = "https://explorer.lichess.ovh/masters";
const REQUEST_DELAY_MS = 700; // be polite: unauthenticated public API
// Below this many master games a position is effectively "out of book";
// deeper moves can't be frequency-checked and are only reported.
const BOOK_THRESHOLD = 5;

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const cacheFile = join(root, "node_modules", ".cache", "verify-lines.json");

let cache = {};
try {
  cache = JSON.parse(readFileSync(cacheFile, "utf8"));
} catch {
  // no cache yet
}

let lastRequestAt = 0;

async function fetchPosition(fen) {
  if (cache[fen]) return cache[fen];

  const wait = lastRequestAt + REQUEST_DELAY_MS - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastRequestAt = Date.now();

  const res = await fetch(`${API}?fen=${encodeURIComponent(fen)}`);
  if (!res.ok) {
    throw new Error(`Lichess explorer HTTP ${res.status} for FEN: ${fen}`);
  }
  const data = await res.json();
  // Keep only what we use so the cache stays small.
  cache[fen] = {
    total: data.white + data.draws + data.black,
    moves: data.moves.map((m) => ({
      san: m.san,
      games: m.white + m.draws + m.black,
    })),
  };
  saveCache();
  return cache[fen];
}

function saveCache() {
  mkdirSync(dirname(cacheFile), { recursive: true });
  writeFileSync(cacheFile, JSON.stringify(cache));
}

function pct(part, total) {
  return total ? ((100 * part) / total).toFixed(1) + "%" : "-";
}

async function verifyLine(opening, line) {
  const chess = new Chess();
  const rows = [];
  let warnings = 0;
  let outOfBookAt = null;

  for (let i = 0; i < line.moves.length; i++) {
    const san = line.moves[i][0];
    const pos = await fetchPosition(chess.fen());

    if (pos.total < BOOK_THRESHOLD) {
      if (outOfBookAt === null) outOfBookAt = i + 1;
      chess.move(san);
      continue;
    }

    const ranked = [...pos.moves].sort((a, b) => b.games - a.games);
    const idx = ranked.findIndex((m) => m.san === san);
    const move = idx >= 0 ? ranked[idx] : null;
    const share = move ? move.games / pos.total : 0;

    if (!move) {
      rows.push(`    ply ${i + 1} ${san}: NOT FOUND in masters DB (${pos.total} games at position)`);
      warnings++;
    } else if (share < 0.01) {
      rows.push(`    ply ${i + 1} ${san}: rare (${pct(move.games, pos.total)}, #${idx + 1} of ${ranked.length})`);
      warnings++;
    } else {
      rows.push(`    ply ${i + 1} ${san}: ok (${pct(move.games, pos.total)}, #${idx + 1})`);
    }
    chess.move(san);
  }

  const depth = outOfBookAt === null ? "full book depth" : `book to ply ${outOfBookAt - 1}, then out of masters DB`;
  console.log(`  [${warnings === 0 ? "OK" : `${warnings} WARNING(S)`}] rank ${line.rank} "${line.name}" — ${depth}`);
  for (const r of rows) {
    if (process.env.VERBOSE || r.includes("NOT FOUND") || r.includes("rare")) console.log(r);
  }
  return warnings;
}

async function explore(sans) {
  const chess = new Chess();
  for (const san of sans) chess.move(san);
  const pos = await fetchPosition(chess.fen());
  console.log(`Position after: ${sans.join(" ")} (${pos.total} master games)`);
  const ranked = [...pos.moves].sort((a, b) => b.games - a.games);
  for (const [i, m] of ranked.entries()) {
    console.log(`  #${i + 1} ${m.san} — ${m.games} games (${pct(m.games, pos.total)})`);
  }
}

const args = process.argv.slice(2);

if (args[0] === "--explore") {
  await explore(args[1].trim().split(/\s+/));
} else {
  const slugs = args.length ? args : catalog.map((o) => o.slug);
  let totalWarnings = 0;
  for (const slug of slugs) {
    const opening = catalog.find((o) => o.slug === slug);
    if (!opening) {
      console.error(`Unknown slug: ${slug}`);
      process.exit(1);
    }
    console.log(`${opening.name} (${opening.eco})`);
    for (const line of opening.lines) {
      totalWarnings += await verifyLine(opening, line);
    }
  }
  console.log(totalWarnings === 0 ? "\nAll lines clean." : `\n${totalWarnings} warning(s) — review above.`);
}

// Engine audit of the opening catalog: walks every line with chess.js and
// evaluates every position with Stockfish (UCI). Complements verify-lines.mjs
// (masters-DB frequency) with objective evaluation. Reports, per line:
//   - per-move loss: how much a played move loses vs the engine's evaluation
//     of the position (flags moves losing > LOSS_LIMIT — likely blunders),
//   - final evaluation, flagged when the studied side stands worse than
//     EVAL_LIMIT (gambit lines are expected to flirt with the limit; the
//     point is to catch outright material drops like hanging a center pawn).
//
// Usage:
//   STOCKFISH_PATH="C:\path\to\stockfish.exe" node scripts/audit-lines.mjs [slugs...]
//   node scripts/audit-lines.mjs --explore "e4 e6 Nc3 d5"   # engine top moves there
//   AUDIT_DEPTH=18 (default 16)
//
// Evals are cached by FEN+depth (node_modules/.cache/audit-evals.json) so
// re-runs after editing a few lines only re-evaluate new positions.
import { Chess } from "chess.js";
import { spawn } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createInterface } from "node:readline";
import { catalog } from "./catalog/index.mjs";

const ENGINE = process.env.STOCKFISH_PATH;
if (!ENGINE) {
  console.error("Set STOCKFISH_PATH to the Stockfish binary.");
  process.exit(1);
}
const DEPTH = Number(process.env.AUDIT_DEPTH ?? 16);
const LOSS_LIMIT = 0.55; // pawns a single move may lose vs the position eval
const EVAL_LIMIT = 0.7; // max final disadvantage for the studied side

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const cacheFile = join(root, "node_modules", ".cache", "audit-evals.json");
let cache = {};
try {
  cache = JSON.parse(readFileSync(cacheFile, "utf8"));
} catch {
  // no cache yet
}

// --- Minimal UCI driver -----------------------------------------------------
const engine = spawn(ENGINE);
const lines = createInterface({ input: engine.stdout });
let resolver = null;
let lastScore = null;
let multipv = []; // [{pv, score}] from the current search, index = multipv - 1

lines.on("line", (l) => {
  if (l.startsWith("info") && l.includes(" score ")) {
    const m = l.match(/score (cp|mate) (-?\d+)/);
    if (m) lastScore = m[1] === "cp" ? Number(m[2]) / 100 : (Number(m[2]) > 0 ? 99 : -99);
    const mp = l.match(/multipv (\d+).* pv (.+)$/);
    if (mp && m) {
      multipv[Number(mp[1]) - 1] = {
        score: m[1] === "cp" ? Number(m[2]) / 100 : (Number(m[2]) > 0 ? 99 : -99),
        pv: mp[2],
      };
    }
  } else if (l.startsWith("bestmove") && resolver) {
    const r = resolver;
    resolver = null;
    r(lastScore);
  } else if ((l === "uciok" || l === "readyok") && resolver) {
    const r = resolver;
    resolver = null;
    r();
  }
});

function send(cmd) {
  engine.stdin.write(cmd + "\n");
}
function waitReply(cmd) {
  return new Promise((resolve) => {
    resolver = resolve;
    send(cmd);
  });
}

// Returns the eval in pawns from WHITE's perspective.
async function evaluate(fen) {
  const key = `${fen}#${DEPTH}`;
  if (key in cache) return cache[key];
  lastScore = null;
  send(`position fen ${fen}`);
  const score = await waitReply(`go depth ${DEPTH}`);
  const whitePov = fen.includes(" w ") ? score : -score;
  cache[key] = whitePov;
  return whitePov;
}

function fmt(v) {
  return (v >= 0 ? "+" : "") + v.toFixed(2);
}

async function auditLine(opening, line) {
  const chess = new Chess();
  const evals = [await evaluate(chess.fen())];
  for (const [san] of line.moves) {
    chess.move(san);
    evals.push(await evaluate(chess.fen()));
  }

  const issues = [];
  for (let i = 0; i < line.moves.length; i++) {
    const mover = i % 2 === 0 ? 1 : -1; // white on odd plies
    const loss = (evals[i] - evals[i + 1]) * mover;
    if (loss > LOSS_LIMIT) {
      issues.push(
        `ply ${i + 1} ${line.moves[i][0]}: loses ${loss.toFixed(2)} (${fmt(evals[i])} -> ${fmt(evals[i + 1])})`,
      );
    }
  }

  const final = evals[evals.length - 1];
  const sides = opening.playableColors;
  const finalBad =
    (sides.includes("white") && final < -EVAL_LIMIT) ||
    (sides.includes("black") && final > EVAL_LIMIT);
  if (finalBad) {
    issues.push(`final eval ${fmt(final)} outside ±${EVAL_LIMIT} for [${sides}]`);
  }

  const tag = issues.length ? `${issues.length} ISSUE(S)` : "OK";
  console.log(`  [${tag}] rank ${line.rank} "${line.name}" — final ${fmt(final)}`);
  for (const s of issues) console.log(`    ${s}`);
  return issues.length;
}

await waitReply("uci");
send("setoption name Threads value 4");
send("setoption name Hash value 256");
await waitReply("isready");

// --explore "e4 e6 Nc3": print the engine's top candidates at that position,
// each with its eval (side-to-move POV) and PV in SAN. Line research helper.
if (process.argv[2] === "--explore") {
  const sans = (process.argv[3] ?? "").trim().split(/\s+/).filter(Boolean);
  const chess = new Chess();
  for (const san of sans) chess.move(san);
  send("setoption name MultiPV value 4");
  multipv = [];
  send(`position fen ${chess.fen()}`);
  await waitReply(`go depth ${Math.max(DEPTH, 20)}`);
  console.log(`After: ${sans.join(" ") || "(start)"} — ${chess.turn() === "w" ? "White" : "Black"} to move`);
  for (const cand of multipv.filter(Boolean)) {
    const probe = new Chess(chess.fen());
    const sanPv = [];
    for (const uci of cand.pv.split(" ").slice(0, 8)) {
      try {
        sanPv.push(probe.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] }).san);
      } catch {
        break;
      }
    }
    console.log(`  ${fmt(cand.score)}  ${sanPv.join(" ")}`);
  }
  send("quit");
  process.exit(0);
}

const slugs = process.argv.slice(2);
const selected = slugs.length
  ? catalog.filter((o) => slugs.includes(o.slug))
  : catalog;

let total = 0;
for (const opening of selected) {
  console.log(`${opening.name} (${opening.eco}) [${opening.playableColors}]`);
  for (const line of opening.lines) {
    total += await auditLine(opening, line);
  }
  mkdirSync(dirname(cacheFile), { recursive: true });
  writeFileSync(cacheFile, JSON.stringify(cache));
}

send("quit");
console.log(total === 0 ? "\nAll lines clean at this depth." : `\n${total} issue(s) — review above.`);

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  analyzeOpenings,
  confirmOpenings,
  type AnalyzeResult,
} from "@/lib/actions/onboarding";
import type { ChessColor } from "@/lib/db/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Selection {
  openingId: string;
  name: string;
  color: ChessColor;
  gamesCount: number;
  playableColors: ChessColor[];
}

export function OnboardingFlow({
  initialLichess,
  initialChesscom,
}: {
  initialLichess: string;
  initialChesscom: string;
}) {
  const router = useRouter();
  const [lichess, setLichess] = useState(initialLichess);
  const [chesscom, setChesscom] = useState(initialChesscom);
  const [analysis, setAnalysis] = useState<AnalyzeResult | null>(null);
  const [selections, setSelections] = useState<Selection[]>([]);
  const [busy, setBusy] = useState<"analyze" | "confirm" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleAnalyze() {
    setBusy("analyze");
    setError(null);
    try {
      const result = await analyzeOpenings(lichess, chesscom);
      setAnalysis(result);
      setSelections(
        result.suggestions.map((s) => ({
          openingId: s.openingId,
          name: s.name,
          color: s.color,
          gamesCount: s.gamesCount,
          playableColors: s.playableColors,
        })),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  async function handleConfirm() {
    setBusy("confirm");
    setError(null);
    try {
      await confirmOpenings(
        selections.map(({ openingId, color, gamesCount }) => ({
          openingId,
          color,
          gamesCount,
        })),
      );
      router.push("/");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setBusy(null);
    }
  }

  function toggleColor(openingId: string) {
    setSelections((prev) =>
      prev.map((s) =>
        s.openingId === openingId && s.playableColors.length > 1
          ? { ...s, color: s.color === "white" ? "black" : "white" }
          : s,
      ),
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="card-vintage flex flex-col gap-4 p-4">
        <div className="grid gap-2">
          <Label htmlFor="lichess">Lichess username</Label>
          <Input
            id="lichess"
            value={lichess}
            onChange={(e) => setLichess(e.target.value)}
            placeholder="e.g. DrNykterstein"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="chesscom">Chess.com username</Label>
          <Input
            id="chesscom"
            value={chesscom}
            onChange={(e) => setChesscom(e.target.value)}
            placeholder="e.g. MagnusCarlsen"
          />
        </div>
        <Button
          onClick={handleAnalyze}
          disabled={busy !== null || (!lichess.trim() && !chesscom.trim())}
        >
          {busy === "analyze" ? "Analyzing your games…" : "Analyze my games"}
        </Button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {analysis && (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            {analysis.gamesAnalyzed} games analyzed
            {analysis.sourceErrors.length > 0 &&
              ` (some sources failed: ${analysis.sourceErrors.join("; ")})`}
            . These are your most played openings — flip the color where you
            prefer to study the other side.
          </p>

          {selections.length === 0 && (
            <p className="text-sm text-destructive">
              None of your openings matched the catalog. Check the usernames or
              play a few more games.
            </p>
          )}

          <ul className="flex flex-col gap-2">
            {selections.map((s) => (
              <li
                key={s.openingId}
                className="card-vintage flex items-center justify-between gap-2 p-3"
              >
                <div>
                  <p className="text-sm font-medium">{s.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {s.gamesCount} game{s.gamesCount === 1 ? "" : "s"}
                  </p>
                </div>
                <button
                  onClick={() => toggleColor(s.openingId)}
                  disabled={s.playableColors.length < 2}
                  className={`label-vintage rounded-full border-2 border-ink/80 bg-paper px-3 py-1 text-xs font-medium shadow-press-sm ${
                    s.playableColors.length > 1
                      ? "hover:bg-gold/30 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none"
                      : "opacity-60"
                  }`}
                  title={
                    s.playableColors.length > 1
                      ? "Click to switch color"
                      : "This opening is studied from one side only"
                  }
                >
                  {s.color === "white" ? "♔ White" : "♚ Black"}
                  {s.playableColors.length > 1 && " ⇄"}
                </button>
              </li>
            ))}
          </ul>

          {selections.length > 0 && (
            <Button onClick={handleConfirm} disabled={busy !== null}>
              {busy === "confirm" ? "Setting up…" : "Start training"}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

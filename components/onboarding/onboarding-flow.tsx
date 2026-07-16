"use client";

import { useState } from "react";
import {
  analyzeOpenings,
  confirmOpenings,
  type AnalyzeResult,
} from "@/lib/actions/onboarding";
import type { AnalysisTimeControl, ChessColor } from "@/lib/db/types";
import type { LibraryOpening } from "@/lib/queries/library";
import { OpeningPicker } from "@/components/onboarding/opening-picker";
import { TimeControlPicker } from "@/components/time-control-picker";
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

/**
 * A server action that calls redirect() also rejects on the client with this
 * error, purely to stop the code after the call. The router performs the
 * navigation on its own, so this is not a failure: swallow it and leave the
 * pending state alone — a setState here aborts the in-flight navigation.
 */
function isRedirectError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof (error as { digest: unknown }).digest === "string" &&
    (error as { digest: string }).digest.startsWith("NEXT_REDIRECT")
  );
}

export function OnboardingFlow({
  initialLichess,
  initialChesscom,
  initialTimeControls,
  catalog,
}: {
  initialLichess: string;
  initialChesscom: string;
  initialTimeControls: AnalysisTimeControl[];
  catalog: LibraryOpening[];
}) {
  const [mode, setMode] = useState<"analyze" | "manual">("analyze");
  const [lichess, setLichess] = useState(initialLichess);
  const [chesscom, setChesscom] = useState(initialChesscom);
  const [timeControls, setTimeControls] =
    useState<AnalysisTimeControl[]>(initialTimeControls);
  const [analysis, setAnalysis] = useState<AnalyzeResult | null>(null);
  const [selections, setSelections] = useState<Selection[]>([]);
  const [busy, setBusy] = useState<"analyze" | "confirm" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleAnalyze() {
    setBusy("analyze");
    setError(null);
    try {
      const result = await analyzeOpenings(lichess, chesscom, timeControls);
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
      // Redirects to Home on success, so nothing runs after this.
      await confirmOpenings(
        selections.map(({ openingId, color, gamesCount }) => ({
          openingId,
          color,
          gamesCount,
        })),
      );
    } catch (e) {
      if (isRedirectError(e)) return;
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

  // Manual mode adds/removes entries in the same `selections` the analyzer
  // fills, so mixing both paths just works.
  function togglePick(opening: LibraryOpening) {
    setSelections((prev) =>
      prev.some((s) => s.openingId === opening.id)
        ? prev.filter((s) => s.openingId !== opening.id)
        : [
            ...prev,
            {
              openingId: opening.id,
              name: opening.name,
              color: opening.playableColors[0],
              gamesCount: 0,
              playableColors: opening.playableColors,
            },
          ],
    );
  }

  const selectedColors = new Map(
    selections.map((s) => [s.openingId, s.color]),
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="label-vintage flex gap-2 text-sm">
        {(
          [
            ["analyze", "Analyze my games"],
            ["manual", "Build my own"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            onClick={() => setMode(value)}
            className={`rounded-sm border-2 border-ink/80 px-4 py-2 font-medium shadow-press-sm ${
              mode === value
                ? "bg-primary text-primary-foreground"
                : "bg-paper hover:bg-gold/30"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {mode === "analyze" && (
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
          <p className="text-xs text-muted-foreground">
            Leave a field blank to skip that platform.
          </p>
          <div className="grid gap-2">
            <Label>Time controls to analyze</Label>
            <TimeControlPicker value={timeControls} onChange={setTimeControls} />
          </div>
          <Button
            onClick={handleAnalyze}
            disabled={
              busy !== null ||
              (!lichess.trim() && !chesscom.trim()) ||
              timeControls.length === 0
            }
          >
            {busy === "analyze" ? "Analyzing your games…" : "Analyze my games"}
          </Button>
        </div>
      )}

      {mode === "manual" && (
        <OpeningPicker
          catalog={catalog}
          selected={selectedColors}
          onToggle={togglePick}
          onColorChange={(opening) => toggleColor(opening.id)}
        />
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      {mode === "analyze" && analysis && (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            {analysis.gamesAnalyzed} games analyzed
            {analysis.sourceErrors.length > 0 &&
              ` (some sources failed: ${analysis.sourceErrors.join("; ")})`}
            . These are your most played openings — flip the color where you
            prefer to study the other side. You can also add more by hand from
            the &quot;Build my own&quot; tab.
          </p>

          {selections.length === 0 && (
            <p className="text-sm text-destructive">
              None of your openings matched the catalog. Check the usernames,
              play a few more games, or build your repertoire by hand.
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
                    {s.gamesCount > 0
                      ? `${s.gamesCount} game${s.gamesCount === 1 ? "" : "s"}`
                      : "picked by hand"}
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
        </div>
      )}

      {selections.length > 0 && (
        <Button onClick={handleConfirm} disabled={busy !== null}>
          {busy === "confirm"
            ? "Setting up…"
            : `Start training (${selections.length} opening${
                selections.length === 1 ? "" : "s"
              })`}
        </Button>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { updateSettings } from "@/lib/actions/settings";
import type { AnalysisTimeControl } from "@/lib/db/types";
import { TimeControlPicker } from "@/components/time-control-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Props {
  linesPerSession: number;
  movesPerBlock: number;
  timezone: string;
  timeControls: AnalysisTimeControl[];
}

export function SettingsForm(props: Props) {
  const [linesPerSession, setLinesPerSession] = useState(props.linesPerSession);
  const [movesPerBlock, setMovesPerBlock] = useState(props.movesPerBlock);
  const [timezone, setTimezone] = useState(props.timezone);
  const [timeControls, setTimeControls] = useState(props.timeControls);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    try {
      await updateSettings({
        linesPerSession,
        movesPerBlock,
        timezone,
        timeControls,
      });
      setMessage("Saved.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="card-vintage flex flex-col gap-4 p-4">
      <h2 className="text-lg">Session</h2>

      <div className="grid gap-2">
        <Label htmlFor="lines">New lines per session</Label>
        <Input
          id="lines"
          type="number"
          min={1}
          max={12}
          value={linesPerSession}
          onChange={(e) => setLinesPerSession(Number(e.target.value))}
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="moves">Moves per block</Label>
        <Input
          id="moves"
          type="number"
          min={2}
          max={10}
          value={movesPerBlock}
          onChange={(e) => setMovesPerBlock(Number(e.target.value))}
        />
        <p className="text-xs text-muted-foreground">
          How many of your moves each line asks per review, and how much depth
          a clean &quot;good&quot; unlocks.
        </p>
      </div>

      <div className="grid gap-2">
        <Label>Time controls to analyze</Label>
        <TimeControlPicker value={timeControls} onChange={setTimeControls} />
        <p className="text-xs text-muted-foreground">
          Applies the next time you re-analyze your games.
        </p>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="tz">Timezone</Label>
        <Input
          id="tz"
          value={timezone}
          onChange={(e) => setTimezone(e.target.value)}
          placeholder="e.g. America/Mexico_City"
        />
        <p className="text-xs text-muted-foreground">
          Defines when &quot;today&quot; rolls over for sessions and streaks.
        </p>
      </div>

      <Button onClick={handleSave} disabled={saving}>
        {saving ? "Saving…" : "Save settings"}
      </Button>
      {message && <p className="text-sm text-muted-foreground">{message}</p>}

      <p className="border-t border-dashed border-ink/30 pt-3 text-sm text-muted-foreground">
        Want different openings?{" "}
        <Link href="/onboarding" className="text-primary underline">
          Re-analyze your games
        </Link>{" "}
        or browse the{" "}
        <Link href="/library" className="text-primary underline">
          opening library
        </Link>{" "}
        to add or remove openings by hand. Openings that stay selected keep
        their progress.
      </p>
    </section>
  );
}

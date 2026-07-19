"use server";

import { revalidatePath } from "next/cache";
import { isValidTimezone } from "@/lib/dates";
import type { AnalysisTimeControl } from "@/lib/db/types";
import { requireUser } from "./auth-helpers";

const TIME_CONTROLS: AnalysisTimeControl[] = ["bullet", "blitz", "rapid", "slow"];

export interface SettingsInput {
  linesPerSession: number;
  movesPerBlock: number;
  timezone: string;
  timeControls: AnalysisTimeControl[];
}

export async function updateSettings(input: SettingsInput): Promise<void> {
  const { supabase, userId } = await requireUser();

  const linesPerSession = Math.min(Math.max(Math.round(input.linesPerSession), 1), 12);
  const movesPerBlock = Math.min(Math.max(Math.round(input.movesPerBlock), 2), 10);
  const timeControls = TIME_CONTROLS.filter((tc) =>
    input.timeControls.includes(tc),
  );
  if (timeControls.length === 0) {
    throw new Error("Select at least one time control");
  }
  const timezone = input.timezone.trim() || "UTC";
  if (!isValidTimezone(timezone)) {
    throw new Error(
      `Unknown timezone "${timezone}" — use an IANA name like America/Mexico_City`,
    );
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      lines_per_session: linesPerSession,
      moves_per_block: movesPerBlock,
      timezone,
      analysis_time_controls: timeControls,
    })
    .eq("user_id", userId);
  if (error) throw new Error(error.message);

  revalidatePath("/", "layout");
}

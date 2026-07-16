"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "./auth-helpers";

export interface SettingsInput {
  linesPerSession: number;
  movesPerBlock: number;
  timezone: string;
}

export async function updateSettings(input: SettingsInput): Promise<void> {
  const { supabase, userId } = await requireUser();

  const linesPerSession = Math.min(Math.max(Math.round(input.linesPerSession), 1), 12);
  const movesPerBlock = Math.min(Math.max(Math.round(input.movesPerBlock), 2), 10);

  const { error } = await supabase
    .from("profiles")
    .update({
      lines_per_session: linesPerSession,
      moves_per_block: movesPerBlock,
      timezone: input.timezone || "UTC",
    })
    .eq("user_id", userId);
  if (error) throw new Error(error.message);

  revalidatePath("/", "layout");
}

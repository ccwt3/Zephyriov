import type { Grade, LineState } from "@/lib/srs/types";

export type ChessColor = "white" | "black";

export interface Profile {
  user_id: string;
  lichess_username: string | null;
  chesscom_username: string | null;
  lines_per_session: number;
  moves_per_block: number;
  timezone: string;
  onboarded_at: string | null;
}

export interface Opening {
  id: string;
  slug: string;
  name: string;
  eco: string;
  playable_colors: ChessColor[];
  detection_keys: string[];
}

export interface OpeningLine {
  id: string;
  opening_id: string;
  name: string;
  rank: number;
}

export interface LineMove {
  id: string;
  line_id: string;
  ply: number;
  san: string;
  explanation: string;
}

export interface UserOpening {
  id: string;
  user_id: string;
  opening_id: string;
  color: ChessColor;
  games_count: number;
  is_active: boolean;
}

export interface UserLine {
  id: string;
  user_id: string;
  line_id: string;
  state: LineState;
  unlocked_moves: number;
  interval_days: number;
  due_date: string;
  reps: number;
  lapses: number;
  last_result: Grade | null;
}

export interface StudySession {
  id: string;
  user_id: string;
  session_date: string;
  status: "in_progress" | "completed";
  started_at: string;
  completed_at: string | null;
}

export interface SessionItem {
  id: string;
  session_id: string;
  user_line_id: string;
  sort_order: number;
  item_type: "new" | "review";
  attempt_number: number;
  result: Grade | null;
  completed_at: string | null;
}

export interface UserStreak {
  user_id: string;
  current_streak: number;
  best_streak: number;
  last_active_date: string | null;
}

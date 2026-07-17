"use server";

import { revalidatePath } from "next/cache";
import { gradeBlock } from "@/lib/srs/grading";
import { applyGrade, addDays } from "@/lib/srs/scheduler";
import { buildSession } from "@/lib/srs/session-builder";
import type { CardState } from "@/lib/srs/types";
import { getToday } from "@/lib/dates";
import type {
  ChessColor,
  SessionItem,
  StudySession,
  UserLine,
} from "@/lib/db/types";
import type {
  StudyItem,
  StudyMoveResult,
  SubmitResult,
} from "@/lib/study-types";
import { fetchAllRows } from "@/lib/supabase/paginate";
import { requireUser } from "./auth-helpers";

/** Minimum distinct new lines reviewed in a day to keep the streak (spec 10). */
const STREAK_NEW_LINES = 3;

interface LineContext {
  userLine: UserLine;
  lineName: string;
  openingName: string;
  openingId: string;
  studentColor: ChessColor;
  totalStudentMoves: number;
}

/** Plies needed so the student plays `studentMoves` moves of their color. */
function pliesForBlock(studentMoves: number, color: ChessColor): number {
  return color === "white" ? studentMoves * 2 - 1 : studentMoves * 2;
}

/** Whole days between two yyyy-mm-dd dates (UTC-pure, DST-proof). */
function diffDays(from: string, to: string): number {
  return Math.round(
    (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) /
      86_400_000,
  );
}

async function loadLineContexts(
  supabase: Awaited<ReturnType<typeof requireUser>>["supabase"],
  userId: string,
): Promise<Map<string, LineContext>> {
  const [{ data: userOpenings }, { data: userLines }] = await Promise.all([
    supabase
      .from("user_openings")
      .select("opening_id, color, openings(name)")
      .eq("user_id", userId)
      .eq("is_active", true),
    supabase
      .from("user_lines")
      .select("*, opening_lines(id, opening_id, name)")
      .eq("user_id", userId),
  ]);

  const openingById = new Map(
    (userOpenings ?? []).map((uo) => [
      uo.opening_id as string,
      {
        color: uo.color as ChessColor,
        name: (uo.openings as unknown as { name: string })?.name ?? "",
      },
    ]),
  );

  // Count each line's total student moves from the catalog.
  const lineIds = (userLines ?? []).map((ul) => ul.line_id as string);
  const moveCounts = lineIds.length
    ? await fetchAllRows<{ line_id: string; ply: number }>((from, to) =>
        supabase
          .from("line_moves")
          .select("line_id, ply")
          .in("line_id", lineIds)
          .order("id")
          .range(from, to),
      )
    : [];
  const maxPlyByLine = new Map<string, number>();
  for (const row of moveCounts) {
    const current = maxPlyByLine.get(row.line_id) ?? 0;
    if (row.ply > current) maxPlyByLine.set(row.line_id, row.ply);
  }

  const contexts = new Map<string, LineContext>();
  for (const ul of userLines ?? []) {
    const line = ul.opening_lines as unknown as {
      id: string;
      opening_id: string;
      name: string;
    } | null;
    if (!line) continue;
    const opening = openingById.get(line.opening_id);
    if (!opening) continue; // line belongs to a deactivated opening

    const maxPly = maxPlyByLine.get(line.id) ?? 0;
    const totalStudentMoves =
      opening.color === "white" ? Math.ceil(maxPly / 2) : Math.floor(maxPly / 2);

    contexts.set(ul.id as string, {
      userLine: ul as unknown as UserLine,
      lineName: line.name,
      openingName: opening.name,
      openingId: line.opening_id,
      studentColor: opening.color,
      totalStudentMoves,
    });
  }
  return contexts;
}

async function buildStudyItem(
  supabase: Awaited<ReturnType<typeof requireUser>>["supabase"],
  item: Pick<SessionItem, "id" | "item_type" | "attempt_number">,
  context: LineContext,
): Promise<StudyItem> {
  const plies = pliesForBlock(
    Math.min(context.userLine.unlocked_moves, context.totalStudentMoves),
    context.studentColor,
  );
  const { data: moves } = await supabase
    .from("line_moves")
    .select("ply, san, explanation")
    .eq("line_id", context.userLine.line_id)
    .lte("ply", plies)
    .order("ply");

  return {
    sessionItemId: item.id,
    itemType: item.item_type,
    attemptNumber: item.attempt_number,
    lineName: context.lineName,
    openingName: context.openingName,
    studentColor: context.studentColor,
    unlockedMoves: Math.min(
      context.userLine.unlocked_moves,
      context.totalStudentMoves,
    ),
    moves: moves ?? [],
  };
}

export interface TodaySession {
  sessionId: string;
  status: "in_progress" | "completed";
  pendingItems: StudyItem[];
  completedCount: number;
  totalCount: number;
}

/**
 * Returns today's session, creating it (via the SRS session builder) on
 * first visit of the day. Resuming mid-session returns only pending items.
 */
export async function getOrCreateTodaySession(): Promise<TodaySession> {
  const { supabase, userId, profile } = await requireUser();
  const today = await getToday(profile.timezone);

  let { data: session } = await supabase
    .from("study_sessions")
    .select("*")
    .eq("user_id", userId)
    .eq("session_date", today)
    .maybeSingle<StudySession>();

  const contexts = await loadLineContexts(supabase, userId);

  if (!session) {
    const candidates = [...contexts.entries()].map(([userLineId, ctx]) => ({
      userLineId,
      openingId: ctx.openingId,
      state: ctx.userLine.state,
      dueDate: ctx.userLine.due_date,
    }));
    const plan = buildSession({
      candidates,
      today,
      newLinesTarget: profile.lines_per_session,
    });

    const { data: created, error } = await supabase
      .from("study_sessions")
      .insert({ user_id: userId, session_date: today })
      .select("*")
      .single<StudySession>();
    if (error || !created) throw new Error(error?.message ?? "Session insert failed");
    session = created;

    if (plan.items.length > 0) {
      const { error: itemsError } = await supabase.from("session_items").insert(
        plan.items.map((item, i) => ({
          session_id: created.id,
          user_line_id: item.userLineId,
          sort_order: i,
          item_type: item.itemType,
        })),
      );
      if (itemsError) throw new Error(itemsError.message);
    } else {
      // Nothing due and no new lines left: the day is trivially complete.
      await supabase
        .from("study_sessions")
        .update({ status: "completed", completed_at: new Date().toISOString() })
        .eq("id", created.id);
      session = { ...created, status: "completed" };
    }
  }

  const { data: items } = await supabase
    .from("session_items")
    .select("*")
    .eq("session_id", session.id)
    .order("sort_order")
    .returns<SessionItem[]>();

  const pending = (items ?? []).filter((i) => i.result === null);
  const pendingItems: StudyItem[] = [];
  for (const item of pending) {
    const context = contexts.get(item.user_line_id);
    if (!context) continue;
    pendingItems.push(await buildStudyItem(supabase, item, context));
  }

  return {
    sessionId: session.id,
    status: session.status,
    pendingItems,
    completedCount: (items ?? []).length - pending.length,
    totalCount: (items ?? []).length,
  };
}

/**
 * Grades a completed block, records the attempts, applies the SRS update
 * and re-queues the line in this session when the grade demands it.
 */
export async function submitLineResult(
  sessionItemId: string,
  results: StudyMoveResult[],
): Promise<SubmitResult> {
  const { supabase, userId, profile } = await requireUser();
  const today = await getToday(profile.timezone);

  const { data: item, error: itemError } = await supabase
    .from("session_items")
    .select("*")
    .eq("id", sessionItemId)
    .single<SessionItem>();
  if (itemError || !item) throw new Error("Session item not found");
  if (item.result !== null) throw new Error("Item already graded");

  const contexts = await loadLineContexts(supabase, userId);
  const context = contexts.get(item.user_line_id);
  if (!context) throw new Error("Line context not found");

  // Grade server-side from the raw per-move results.
  const isFirstBlock =
    context.userLine.unlocked_moves <= profile.moves_per_block;
  const grade = gradeBlock(
    results.map((r) => ({ correct: r.correct, elapsedMs: r.elapsedMs })),
    isFirstBlock,
  );

  await supabase.from("move_attempts").insert(
    results.map((r) => ({
      session_item_id: sessionItemId,
      ply: r.ply,
      expected_san: r.expectedSan,
      played_san: r.playedSan,
      is_correct: r.correct,
      elapsed_ms: Math.round(r.elapsedMs),
    })),
  );

  await supabase
    .from("session_items")
    .update({ result: grade, completed_at: new Date().toISOString() })
    .eq("id", sessionItemId);

  // SRS update.
  const card: CardState = {
    state: context.userLine.state,
    intervalDays: Number(context.userLine.interval_days),
    dueDate: context.userLine.due_date,
    unlockedMoves: context.userLine.unlocked_moves,
    reps: context.userLine.reps,
    lapses: context.userLine.lapses,
  };
  const { card: updated, repeatInSession } = applyGrade(card, grade, today, {
    totalMoves: context.totalStudentMoves,
    movesPerBlock: profile.moves_per_block,
  });

  await supabase
    .from("user_lines")
    .update({
      state: updated.state,
      unlocked_moves: updated.unlockedMoves,
      interval_days: updated.intervalDays,
      due_date: updated.dueDate,
      reps: updated.reps,
      lapses: updated.lapses,
      last_result: grade,
    })
    .eq("id", context.userLine.id);

  // Re-queue at the end of the session when needed.
  let requeuedItem: StudyItem | null = null;
  if (repeatInSession) {
    const { data: maxRow } = await supabase
      .from("session_items")
      .select("sort_order, attempt_number")
      .eq("session_id", item.session_id)
      .eq("user_line_id", item.user_line_id)
      .order("attempt_number", { ascending: false })
      .limit(1)
      .maybeSingle<{ sort_order: number; attempt_number: number }>();
    const { data: lastOrder } = await supabase
      .from("session_items")
      .select("sort_order")
      .eq("session_id", item.session_id)
      .order("sort_order", { ascending: false })
      .limit(1)
      .maybeSingle<{ sort_order: number }>();

    const { data: requeued, error: requeueError } = await supabase
      .from("session_items")
      .insert({
        session_id: item.session_id,
        user_line_id: item.user_line_id,
        sort_order: (lastOrder?.sort_order ?? 0) + 1,
        item_type: item.item_type,
        attempt_number: (maxRow?.attempt_number ?? item.attempt_number) + 1,
      })
      .select("*")
      .single<SessionItem>();
    if (requeueError || !requeued) {
      throw new Error(requeueError?.message ?? "Requeue failed");
    }

    // The card state changed (e.g. lapse) — reload the context for the item.
    const freshContexts = await loadLineContexts(supabase, userId);
    const freshContext = freshContexts.get(item.user_line_id) ?? context;
    requeuedItem = await buildStudyItem(supabase, requeued, freshContext);
  }

  const sessionCompleted = await maybeCompleteSession(supabase, item.session_id);
  await updateStreak(supabase, userId, item.session_id, today, sessionCompleted);

  // When the line repeats in this session there is no meaningful new date
  // (a review lapse even keeps the OLD due date), so expose null instead.
  const nextDue = repeatInSession
    ? null
    : { date: updated.dueDate, inDays: diffDays(today, updated.dueDate) };

  revalidatePath("/");
  return { grade, repeatInSession, nextDue, requeuedItem, sessionCompleted };
}

async function maybeCompleteSession(
  supabase: Awaited<ReturnType<typeof requireUser>>["supabase"],
  sessionId: string,
): Promise<boolean> {
  const { count } = await supabase
    .from("session_items")
    .select("id", { count: "exact", head: true })
    .eq("session_id", sessionId)
    .is("result", null);

  if ((count ?? 0) > 0) return false;
  await supabase
    .from("study_sessions")
    .update({ status: "completed", completed_at: new Date().toISOString() })
    .eq("id", sessionId)
    .eq("status", "in_progress");
  return true;
}

/**
 * Keeps the streak alive once at least 3 distinct new lines were reviewed
 * today (or every new line in the session when fewer than 3 exist). When
 * the new-line pool is exhausted, completing the review session counts.
 */
async function updateStreak(
  supabase: Awaited<ReturnType<typeof requireUser>>["supabase"],
  userId: string,
  sessionId: string,
  today: string,
  sessionCompleted: boolean,
): Promise<void> {
  const { data: newItems } = await supabase
    .from("session_items")
    .select("user_line_id, result")
    .eq("session_id", sessionId)
    .eq("item_type", "new")
    .returns<{ user_line_id: string; result: string | null }[]>();

  const distinctNew = new Set((newItems ?? []).map((i) => i.user_line_id));
  const completedNew = new Set(
    (newItems ?? []).filter((i) => i.result !== null).map((i) => i.user_line_id),
  );
  const required = Math.min(STREAK_NEW_LINES, distinctNew.size);
  if (required === 0 && !sessionCompleted) return;
  if (required > 0 && completedNew.size < required) return;

  const { data: streak } = await supabase
    .from("user_streaks")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle<{
      current_streak: number;
      best_streak: number;
      last_active_date: string | null;
    }>();

  if (streak?.last_active_date === today) return; // already counted today

  const continued = streak?.last_active_date === addDays(today, -1);
  const current = continued ? (streak?.current_streak ?? 0) + 1 : 1;
  const best = Math.max(current, streak?.best_streak ?? 0);

  await supabase.from("user_streaks").upsert({
    user_id: userId,
    current_streak: current,
    best_streak: best,
    last_active_date: today,
  });
}

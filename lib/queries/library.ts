import { requireUser } from "@/lib/actions/auth-helpers";
import { formatLineNotation } from "@/lib/notation";
import { fetchAllRows } from "@/lib/supabase/paginate";
import type { ChessColor } from "@/lib/db/types";

export interface LibraryLine {
  rank: number;
  name: string;
  /** Pre-formatted move sequence: "1.e4 e5 2.Nf3 Nc6 …" */
  notation: string;
}

export interface LibraryOpening {
  id: string;
  slug: string;
  name: string;
  eco: string;
  playableColors: ChessColor[];
  lines: LibraryLine[];
  /** Set when the opening is currently part of the user's studies. */
  active: { userOpeningId: string; color: ChessColor } | null;
}

/** Loads the whole opening catalog, flagging the user's active openings. */
export async function getLibraryData(): Promise<LibraryOpening[]> {
  const { supabase, userId } = await requireUser();

  const [
    { data: openings, error: openingsError },
    { data: lines },
    moves,
    { data: userOpenings },
  ] = await Promise.all([
    supabase
      .from("openings")
      .select("id, slug, name, eco, playable_colors")
      .returns<
        {
          id: string;
          slug: string;
          name: string;
          eco: string;
          playable_colors: ChessColor[];
        }[]
      >(),
    supabase
      .from("opening_lines")
      .select("id, opening_id, name, rank")
      .returns<
        { id: string; opening_id: string; name: string; rank: number }[]
      >(),
    // explanation is the heavy column and the library never shows it.
    // Paginated: the whole catalog's moves exceed PostgREST's max-rows cap.
    fetchAllRows<{ line_id: string; ply: number; san: string }>((from, to) =>
      supabase
        .from("line_moves")
        .select("line_id, ply, san")
        .order("id")
        .range(from, to),
    ),
    supabase
      .from("user_openings")
      .select("id, opening_id, color")
      .eq("user_id", userId)
      .eq("is_active", true)
      .returns<{ id: string; opening_id: string; color: ChessColor }[]>(),
  ]);

  if (openingsError || !openings?.length) {
    throw new Error("Opening catalog is empty — run supabase/seed.sql first");
  }

  const movesByLine = new Map<string, { ply: number; san: string }[]>();
  for (const m of moves) {
    const list = movesByLine.get(m.line_id) ?? [];
    list.push({ ply: m.ply, san: m.san });
    movesByLine.set(m.line_id, list);
  }

  const linesByOpening = new Map<string, LibraryLine[]>();
  for (const line of lines ?? []) {
    const list = linesByOpening.get(line.opening_id) ?? [];
    list.push({
      rank: line.rank,
      name: line.name,
      notation: formatLineNotation(movesByLine.get(line.id) ?? []),
    });
    linesByOpening.set(line.opening_id, list);
  }

  const activeByOpening = new Map(
    (userOpenings ?? []).map((uo) => [
      uo.opening_id,
      { userOpeningId: uo.id, color: uo.color },
    ]),
  );

  return openings
    .map((o) => ({
      id: o.id,
      slug: o.slug,
      name: o.name,
      eco: o.eco,
      playableColors: o.playable_colors,
      lines: (linesByOpening.get(o.id) ?? []).sort((a, b) => a.rank - b.rank),
      active: activeByOpening.get(o.id) ?? null,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

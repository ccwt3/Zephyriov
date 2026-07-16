"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Chess, type Square } from "chess.js";
import {
  Chessboard,
  type PieceDropHandlerArgs,
  type PieceHandlerArgs,
  type SquareHandlerArgs,
} from "react-chessboard";
import { submitLineResult } from "@/lib/actions/session";
import { SLOW_THRESHOLD_MS } from "@/lib/srs/grading";
import type { Grade } from "@/lib/srs/types";
import type { StudyItem, StudyMoveResult } from "@/lib/study-types";
import { Button } from "@/components/ui/button";
import { MoveTimer } from "./move-timer";
import { GradeBadge } from "./grade-badge";

interface Feedback {
  correct: boolean;
  playedSan: string;
  expectedSan: string;
  explanation: string;
}

interface Props {
  initialItems: StudyItem[];
  completedCount: number;
  totalCount: number;
}

const OPPONENT_MOVE_DELAY_MS = 600;
const WRONG_MOVE_REVEAL_DELAY_MS = 900;

/* Vintage board: cream and soda-fountain teal, matching the app palette. */
const BOARD_LIGHT = "#f0e3c1";
const BOARD_DARK = "#417a74";
const HIGHLIGHT_GOLD = "hsl(43 75% 52%)";
const DOT_INK = "hsl(22 42% 15% / 0.3)";

export function StudySession({ initialItems, completedCount, totalCount }: Props) {
  const [queue, setQueue] = useState<StudyItem[]>(initialItems);
  const [itemIndex, setItemIndex] = useState(0);
  const [doneCount, setDoneCount] = useState(completedCount);
  const [total, setTotal] = useState(totalCount);

  const item = queue[itemIndex] ?? null;

  if (!item) {
    return <SessionComplete />;
  }

  return (
    <LineQuiz
      key={item.sessionItemId}
      item={item}
      progressLabel={`Line ${doneCount + 1} of ${total}`}
      onFinished={(requeued) => {
        setDoneCount((n) => n + 1);
        if (requeued) {
          setQueue((q) => [...q, requeued]);
          setTotal((n) => n + 1);
        }
        setItemIndex((i) => i + 1);
      }}
    />
  );
}

function LineQuiz({
  item,
  progressLabel,
  onFinished,
}: {
  item: StudyItem;
  progressLabel: string;
  onFinished: (requeued: StudyItem | null) => void;
}) {
  const chessRef = useRef(new Chess());
  const [fen, setFen] = useState(chessRef.current.fen());
  const [plyIndex, setPlyIndex] = useState(0);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [grade, setGrade] = useState<Grade | null>(null);
  const [willRepeat, setWillRepeat] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [moveStartedAt, setMoveStartedAt] = useState<number>(Date.now());
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);

  const resultsRef = useRef<StudyMoveResult[]>([]);
  const requeuedRef = useRef<StudyItem | null>(null);

  const moves = item.moves;
  const studentColorChar = item.studentColor === "white" ? "w" : "b";
  const studentPlays = useCallback(
    (ply: number) =>
      item.studentColor === "white" ? ply % 2 === 1 : ply % 2 === 0,
    [item.studentColor],
  );

  const currentMove = moves[plyIndex] ?? null;
  const isStudentTurn =
    currentMove !== null && studentPlays(currentMove.ply) && grade === null;

  const advance = useCallback(() => {
    setPlyIndex((i) => i + 1);
    setMoveStartedAt(Date.now());
  }, []);

  // Auto-play the opponent's moves.
  useEffect(() => {
    if (!currentMove || studentPlays(currentMove.ply) || grade !== null) return;
    const timeout = setTimeout(() => {
      chessRef.current.move(currentMove.san);
      setFen(chessRef.current.fen());
      advance();
    }, OPPONENT_MOVE_DELAY_MS);
    return () => clearTimeout(timeout);
  }, [currentMove, studentPlays, grade, advance]);

  // Block finished: grade it server-side.
  useEffect(() => {
    if (currentMove !== null || grade !== null || submitting) return;
    setSubmitting(true);
    submitLineResult(item.sessionItemId, resultsRef.current)
      .then((res) => {
        setGrade(res.grade);
        setWillRepeat(res.repeatInSession);
        requeuedRef.current = res.requeuedItem;
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setSubmitting(false));
  }, [currentMove, grade, submitting, item.sessionItemId]);

  /** Attempts the student's move; shared by drag-and-drop and click-to-move. */
  const tryMove = useCallback(
    (from: string, to: string): boolean => {
      setSelectedSquare(null);
      if (!isStudentTurn || !currentMove) return false;

      const chess = chessRef.current;
      let played;
      try {
        played = chess.move({ from, to, promotion: "q" });
      } catch {
        return false; // illegal move: snap back, no penalty
      }

      const elapsedMs = Date.now() - moveStartedAt;
      const correct = played.san === currentMove.san;
      resultsRef.current.push({
        ply: currentMove.ply,
        expectedSan: currentMove.san,
        playedSan: played.san,
        correct,
        elapsedMs,
      });
      setFeedback({
        correct,
        playedSan: played.san,
        expectedSan: currentMove.san,
        explanation: currentMove.explanation,
      });

      if (correct) {
        setFen(chess.fen());
        advance();
        return true;
      }

      // Wrong move: show it briefly, then reveal the theory move.
      setFen(chess.fen());
      setTimeout(() => {
        chess.undo();
        chess.move(currentMove.san);
        setFen(chess.fen());
        advance();
      }, WRONG_MOVE_REVEAL_DELAY_MS);
      return true;
    },
    [isStudentTurn, currentMove, moveStartedAt, advance],
  );

  const onPieceDrop = useCallback(
    ({ sourceSquare, targetSquare }: PieceDropHandlerArgs): boolean => {
      if (!targetSquare) return false;
      return tryMove(sourceSquare, targetSquare);
    },
    [tryMove],
  );

  // Legal destinations of the selected piece (for the lichess-style hints).
  const legalTargets = useMemo(() => {
    if (!selectedSquare) return [];
    return chessRef.current
      .moves({ square: selectedSquare as Square, verbose: true })
      .map((m) => m.to as string);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSquare, fen]);

  // Click-to-move: first click selects a piece, second click moves it.
  const onSquareClick = useCallback(
    ({ piece, square }: SquareHandlerArgs) => {
      if (!isStudentTurn) return;

      if (selectedSquare) {
        if (square === selectedSquare) {
          setSelectedSquare(null); // toggle off
          return;
        }
        if (legalTargets.includes(square)) {
          tryMove(selectedSquare, square);
          return;
        }
      }

      // Select (or re-select) one of the student's own pieces.
      if (piece && piece.pieceType.startsWith(studentColorChar)) {
        setSelectedSquare(square);
      } else {
        setSelectedSquare(null);
      }
    },
    [isStudentTurn, selectedSquare, legalTargets, tryMove, studentColorChar],
  );

  const canDragPiece = useCallback(
    ({ piece }: PieceHandlerArgs) => piece.pieceType.startsWith(studentColorChar),
    [studentColorChar],
  );

  // Selected square + legal-move hints (dot on empty squares, ring on captures).
  const squareStyles = useMemo(() => {
    const styles: Record<string, React.CSSProperties> = {};
    if (!selectedSquare) return styles;
    styles[selectedSquare] = {
      boxShadow: `inset 0 0 0 3px ${HIGHLIGHT_GOLD}`,
      backgroundImage:
        "linear-gradient(hsl(43 80% 55% / 0.4), hsl(43 80% 55% / 0.4))",
    };
    for (const target of legalTargets) {
      const isCapture = chessRef.current.get(target as Square) !== undefined;
      styles[target] = isCapture
        ? {
            backgroundImage: `radial-gradient(circle, transparent 60%, ${DOT_INK} 62%)`,
          }
        : {
            backgroundImage: `radial-gradient(circle, ${DOT_INK} 24%, transparent 26%)`,
          };
    }
    return styles;
  }, [selectedSquare, legalTargets]);

  const boardOptions = useMemo(
    () => ({
      position: fen,
      boardOrientation: item.studentColor,
      onPieceDrop,
      onSquareClick,
      canDragPiece,
      squareStyles,
      allowDragging: isStudentTurn,
      animationDurationInMs: 200,
      lightSquareStyle: { backgroundColor: BOARD_LIGHT },
      darkSquareStyle: { backgroundColor: BOARD_DARK },
      lightSquareNotationStyle: { color: BOARD_DARK, fontWeight: 600 },
      darkSquareNotationStyle: { color: BOARD_LIGHT, fontWeight: 600 },
      boardStyle: { overflow: "hidden" },
    }),
    [
      fen,
      item.studentColor,
      onPieceDrop,
      onSquareClick,
      canDragPiece,
      squareStyles,
      isStudentTurn,
    ],
  );

  const studentMovesDone = resultsRef.current.length;

  return (
    <div className="flex w-full max-w-md flex-col gap-3">
      <div className="flex items-baseline justify-between gap-2">
        <div>
          <p className="label-vintage text-xs text-muted-foreground">
            {item.openingName} · {progressLabel}
            {item.attemptNumber > 1 ? ` · retry #${item.attemptNumber - 1}` : ""}
          </p>
          <h2 className="text-lg">{item.lineName}</h2>
        </div>
        <MoveTimer
          startedAt={moveStartedAt}
          running={isStudentTurn && grade === null}
          slowThresholdMs={SLOW_THRESHOLD_MS}
        />
      </div>

      {/* Teal cabinet frame around the board, like an old TV set */}
      <div className="rounded-md border-2 border-ink/90 bg-secondary p-2 shadow-press">
        <div className="overflow-hidden rounded-sm border border-ink/50">
          <Chessboard options={boardOptions} />
        </div>
      </div>

      <p className="label-vintage text-center text-xs text-muted-foreground">
        {grade !== null || currentMove === null
          ? "★ Line complete ★"
          : isStudentTurn
            ? `Your move (${studentMovesDone + 1}/${item.unlockedMoves})`
            : "Opponent is thinking…"}
      </p>

      {feedback && grade === null && (
        <div
          className={`rounded-sm border-2 p-3 text-sm shadow-press-sm ${
            feedback.correct
              ? "border-teal bg-teal/10"
              : "border-destructive bg-destructive/10"
          }`}
        >
          <p className="font-medium">
            {feedback.correct
              ? `✓ ${feedback.playedSan}`
              : `✗ You played ${feedback.playedSan} — theory is ${feedback.expectedSan}`}
          </p>
          <p className="mt-1 text-muted-foreground">{feedback.explanation}</p>
        </div>
      )}

      {submitting && (
        <p className="label-vintage text-center text-xs text-muted-foreground">
          Grading…
        </p>
      )}
      {error && (
        <p className="text-center text-sm text-destructive">{error}</p>
      )}

      {grade !== null && (
        <div className="card-vintage flex flex-col items-center gap-3 p-4">
          <GradeBadge grade={grade} />
          <p className="text-center text-sm text-muted-foreground">
            {grade === "good" &&
              "Every move correct and on time. This line levels up."}
            {grade === "mid" &&
              (willRepeat
                ? "Almost — you'll see this line again in this session."
                : "Almost — this line comes back tomorrow.")}
            {grade === "bad" &&
              "You'll get another shot at this line later in this session."}
          </p>
          <Button
            className="w-full"
            onClick={() => onFinished(requeuedRef.current)}
          >
            Continue
          </Button>
        </div>
      )}
    </div>
  );
}

function SessionComplete() {
  return (
    <div className="card-vintage flex flex-col items-center gap-4 p-8 text-center">
      <span className="text-4xl">♛</span>
      <h2 className="text-2xl">Session complete</h2>
      <p className="text-sm text-muted-foreground">
        Every line due today has been reviewed. Come back tomorrow.
      </p>
      <Button asChild>
        <Link href="/">Back home</Link>
      </Button>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";

interface Props {
  startedAt: number;
  running: boolean;
  slowThresholdMs: number;
}

/** Per-move timer; turns red once the answer would be graded as slow. */
export function MoveTimer({ startedAt, running, slowThresholdMs }: Props) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!running) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [running, startedAt]);

  const elapsed = Math.max(0, now - startedAt);
  const totalSeconds = Math.floor(elapsed / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const isSlow = elapsed > slowThresholdMs;

  return (
    <span
      className={`font-mono text-sm tabular-nums ${
        isSlow ? "text-destructive" : "text-muted-foreground"
      }`}
    >
      {minutes}:{String(seconds).padStart(2, "0")}
    </span>
  );
}

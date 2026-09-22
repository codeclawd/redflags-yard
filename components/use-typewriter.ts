"use client";

import { useEffect, useState } from "react";

const MS_PER_CHAR = 28;

/**
 * Types `lines` out one character at a time. Appending lines mid-scan continues
 * from where the cursor is rather than retyping. With `instant` (reduced motion,
 * or a log that is already history) the whole thing is present on first frame.
 */
export function useTypewriter(lines: readonly string[], instant: boolean) {
  const script = lines.join("\n");
  const [progress, setProgress] = useState(() => ({
    script,
    typed: instant ? script.length : 0,
  }));

  const carried = script.startsWith(progress.script)
    ? Math.min(progress.typed, script.length)
    : 0;
  const typed = instant ? script.length : carried;

  useEffect(() => {
    if (instant || typed >= script.length) return;
    const id = setTimeout(() => setProgress({ script, typed: typed + 1 }), MS_PER_CHAR);
    return () => clearTimeout(id);
  }, [script, instant, typed]);

  return { shown: script.slice(0, typed).split("\n"), done: typed >= script.length };
}

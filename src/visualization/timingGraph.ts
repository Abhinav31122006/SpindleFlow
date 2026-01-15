// src/visualization/timingGraph.ts

type TimelineEntry = {
  agentId: string;
  startedAt?: number;
  endedAt?: number;
};

export function buildTimingGraph(timeline: TimelineEntry[]): string {
  if (!timeline || timeline.length === 0) {
    return "LLM TIMING\n==============================\nNo timing data available.";
  }

  const lines: string[] = [];

  lines.push("LLM TIMING");
  lines.push("=".repeat(60));
  lines.push("");

  timeline.forEach(entry => {
    if (!entry.startedAt || !entry.endedAt) return;

    const durationMs = entry.endedAt - entry.startedAt;
    const seconds = durationMs / 1000;

    const barLength = Math.min(Math.round(seconds * 4), 40);
    const bar = "#".repeat(barLength);

    lines.push(
      `[${entry.agentId.padEnd(10)}] ${bar.padEnd(40)} ${seconds.toFixed(2)}s`
    );
  });

  return lines.join("\n");
}
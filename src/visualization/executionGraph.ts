// src/visualization/executionGraph.ts

export type TimelineEntry = {
  agentId: string;
  role: string;
  duration?: number; // in ms
  output?: string;
};

export function buildExecutionGraph(timeline: TimelineEntry[]): string {
  if (!timeline || timeline.length === 0) {
    return "EXECUTION FLOW\n==============================\nNo execution data available.";
  }

  const lines: string[] = [];

  lines.push("EXECUTION FLOW");
  lines.push("=".repeat(60));
  lines.push("");

  timeline.forEach((entry, index) => {
    const isLast = index === timeline.length - 1;

    lines.push("┌──────────────────────────────────────────────┐");
    lines.push(
      `│ ${entry.agentId.padEnd(12)} (${entry.role})`
        .padEnd(47) + "│"
    );
    lines.push("│ -------------------------------------------- │");

    if (entry.duration !== undefined) {
      lines.push(
        `│ Duration : ${(entry.duration / 1000).toFixed(2)}s`
          .padEnd(47) + "│"
      );
    }

    if (entry.output) {
      lines.push(
        `│ Output   : ${entry.output.length} chars`
          .padEnd(47) + "│"
      );
    }

    lines.push("└──────────────────────────────────────────────┘");

    if (!isLast) {
      lines.push("                │");
      lines.push("                ▼");
    }
  });

  return lines.join("\n");
}
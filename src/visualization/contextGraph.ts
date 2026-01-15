// src/visualization/contextGraph.ts

export type ContextGraphInput = {
  userInput: string;
  outputs: Record<string, string>;
  timeline: { agentId: string }[];
};

export function buildContextGraph(context: ContextGraphInput): string {
  const lines: string[] = [];

  lines.push("CONTEXT FLOW");
  lines.push("=".repeat(60));
  lines.push("");

  // Context structure
  lines.push("ContextStore");
  lines.push(" ├─ userInput");
  lines.push(` │   └─ "${context.userInput}"`);
  lines.push(" │");
  lines.push(" ├─ outputs");

  const outputKeys = Object.keys(context.outputs || {});
  if (outputKeys.length === 0) {
    lines.push(" │   └─ (empty)");
  } else {
    outputKeys.forEach((agentId, index) => {
      const isLast = index === outputKeys.length - 1;
      lines.push(` │   ${isLast ? "└" : "├"}─ ${agentId}`);
    });
  }

  lines.push(" │");
  lines.push(" └─ timeline");

  if (!context.timeline || context.timeline.length === 0) {
    lines.push("     └─ (empty)");
  } else {
    context.timeline.forEach((entry, index) => {
      const isLast = index === context.timeline.length - 1;
      lines.push(`     ${isLast ? "└" : "├"}─ ${entry.agentId}`);
    });
  }

  lines.push("");
  lines.push("Data Flow Summary:");
  lines.push("ContextStore ──▶ Agent (implicit)");
  lines.push("Agent        ──▶ ContextStore.outputs (explicit)");

  return lines.join("\n");
}
import { TimelineEntry } from "../context/store";

export function buildParallelExecutionGraph(
  timeline: TimelineEntry[]
): string {
  const branches = new Map<string, TimelineEntry[]>();
  let aggregator: TimelineEntry | null = null;

  for (const entry of timeline) {
    if (entry.isAggregator) {
      aggregator = entry;
      continue;
    }

    if (!entry.branchId) continue;

    if (!branches.has(entry.branchId)) {
      branches.set(entry.branchId, []);
    }

    branches.get(entry.branchId)!.push(entry);
  }

  let out = "";
  out += "PARALLEL EXECUTION FLOW (runtime)\n";
  out += "============================================================\n\n";
  out += "START\n";

  for (const [branchId, entries] of branches.entries()) {
    out += `  ├─ ${branchId}\n`;
    for (const e of entries) {
      out += `  │    └─ ${e.agentId} (${e.role})\n`;
    }
  }

  if (aggregator) {
    out += "  └─ AGGREGATOR\n";
    out += `       └─ ${aggregator.agentId} (${aggregator.role})\n`;
  }

  return out;
}
import { logContextUpdate, logDataTransfer, contextLogger } from "../logger/enhanced-logger";
import { ContextSummary } from "./types";

export type TimelineEntry = {
  agentId: string;
  role: string;
  output: string;
  startedAt: number;
  endedAt: number;
  branchId?: string;        // e.g. "branch-1"
  branchIndex?: number;     // e.g. 1
  isAggregator?: boolean;   // true only for aggregator
};

export class ContextStore {
  public userInput: string;
  public outputs: Record<string, string> = {};
  public timeline: TimelineEntry[] = [];
  private summaries: Map<string, ContextSummary> = new Map();

  constructor(userInput: string) {
    this.userInput = userInput;
    
    contextLogger.info({
      event: "CONTEXT_INITIALIZED",
      userInputLength: userInput.length,
      userInput,
      timestamp: Date.now(),
    }, "📦 Context store initialized");
  }

  setOutput(agentId: string, output: string): void {
    const before = { ...this.outputs };
    
    contextLogger.debug({
      event: "OUTPUT_SET_START",
      agentId,
      outputLength: output.length,
      existingOutputCount: Object.keys(this.outputs).length,
    }, `📝 Setting output for agent: ${agentId}`);

    this.outputs[agentId] = output;

    const after = { ...this.outputs };

    logContextUpdate("SET_OUTPUT", agentId, before, after);

    logDataTransfer(
      agentId,
      "ContextStore.outputs",
      { [agentId]: output },
      "explicit"
    );

    contextLogger.info({
      event: "OUTPUT_SET_COMPLETE",
      agentId,
      outputLength: output.length,
      totalOutputsNow: Object.keys(this.outputs).length,
    }, `✅ Output stored for agent: ${agentId}`);
  }

  getOutput(agentId: string): string | undefined {
    const output = this.outputs[agentId];
    
    contextLogger.debug({
      event: "OUTPUT_GET",
      agentId,
      found: output !== undefined,
      outputLength: output?.length,
    }, `🔍 Retrieved output for agent: ${agentId}`);

    if (output !== undefined) {
      logDataTransfer(
        "ContextStore.outputs",
        "caller",
        { [agentId]: output },
        "explicit"
      );
    }

    return output;
  }

  addTimelineEntry(entry: TimelineEntry): void {
    const before = [...this.timeline];
    
    contextLogger.debug({
      event: "TIMELINE_ADD_START",
      agentId: entry.agentId,
      role: entry.role,
      duration: entry.endedAt - entry.startedAt,
      currentTimelineLength: this.timeline.length,
    }, `⏱️ Adding timeline entry for: ${entry.agentId}`);

    this.timeline.push(entry);

    const after = [...this.timeline];

    logContextUpdate("ADD_TIMELINE_ENTRY", entry.agentId, before, after);

    logDataTransfer(
      entry.agentId,
      "ContextStore.timeline",
      entry,
      "explicit"
    );

    contextLogger.info({
      event: "TIMELINE_ADD_COMPLETE",
      agentId: entry.agentId,
      role: entry.role,
      duration: entry.endedAt - entry.startedAt,
      timelineLength: this.timeline.length,
      entry,
    }, `✅ Timeline entry added: ${entry.agentId} (${this.timeline.length} total)`);
  }

  getPreviousOutputs(): Array<{ agentId: string; role: string; output: string }> {
    contextLogger.debug({
      event: "GET_PREVIOUS_OUTPUTS",
      count: this.timeline.length,
    }, "📚 Retrieving all previous outputs from timeline");

    const outputs = this.timeline.map((entry) => ({
      agentId: entry.agentId,
      role: entry.role,
      output: entry.output,
    }));

    logDataTransfer(
      "ContextStore.timeline",
      "caller",
      outputs,
      "implicit"
    );

    return outputs;
  }

  getContext(): {
    userInput: string;
    outputs: Record<string, string>;
    timeline: TimelineEntry[];
  } {
    contextLogger.debug({
      event: "GET_FULL_CONTEXT",
      outputCount: Object.keys(this.outputs).length,
      timelineLength: this.timeline.length,
    }, "📦 Retrieving full context snapshot");

    const context = {
      userInput: this.userInput,
      outputs: { ...this.outputs },
      timeline: [...this.timeline],
    };

    logDataTransfer(
      "ContextStore",
      "caller",
      context,
      "implicit"
    );

    return context;
  }

  getLastOutput(): string | undefined {
    if (this.timeline.length === 0) {
      contextLogger.debug({
        event: "GET_LAST_OUTPUT",
        found: false,
      }, "❌ No timeline entries - no last output");
      return undefined;
    }

    const lastEntry = this.timeline[this.timeline.length - 1];
    
    contextLogger.debug({
      event: "GET_LAST_OUTPUT",
      found: true,
      agentId: lastEntry.agentId,
      role: lastEntry.role,
      outputLength: lastEntry.output.length,
    }, `📄 Retrieved last output from: ${lastEntry.agentId}`);

    logDataTransfer(
      "ContextStore.timeline",
      "caller",
      { lastOutput: lastEntry.output },
      "implicit"
    );

    return lastEntry.output;
  }

  setSummary(agentId: string, summary: ContextSummary): void {
    contextLogger.info({
      event: "SUMMARY_SET",
      agentId,
      keyInsightsCount: summary.keyInsights.length,
      decisionsCount: summary.decisions.length,
      artifactsCount: summary.artifacts.length,
      nextStepsCount: summary.nextSteps.length,
    }, `📝 Storing summary for agent: ${agentId}`);

    this.summaries.set(agentId, summary);

    logDataTransfer(
      agentId,
      "ContextStore.summaries",
      summary,
      "explicit"
    );
  }

  getSummary(agentId: string): ContextSummary | undefined {
    const summary = this.summaries.get(agentId);
    
    contextLogger.debug({
      event: "SUMMARY_GET",
      agentId,
      found: summary !== undefined,
    }, `🔍 Retrieved summary for agent: ${agentId}`);

    if (summary !== undefined) {
      logDataTransfer(
        "ContextStore.summaries",
        "caller",
        summary,
        "explicit"
      );
    }

    return summary;
  }

  getAllSummaries(): ContextSummary[] {
    const summaries = Array.from(this.summaries.values());
    
    contextLogger.debug({
      event: "GET_ALL_SUMMARIES",
      count: summaries.length,
    }, `📚 Retrieved all summaries: ${summaries.length} total`);

    logDataTransfer(
      "ContextStore.summaries",
      "caller",
      summaries,
      "implicit"
    );

    return summaries;
  }
}
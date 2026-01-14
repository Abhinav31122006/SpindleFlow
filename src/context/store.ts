export type TimelineEntry = {
  agentId: string;
  role: string;
  output: string;
  startedAt: number;
  endedAt: number;
};

export type ContextStore = {
  userInput: string;
  outputs: Record<string, string>;
  timeline: TimelineEntry[];
};

export type AgentConfig = {
  id: string;
  role: string;
  goal: string;
  tools?: string[];
  mcpTools?: string[];
};

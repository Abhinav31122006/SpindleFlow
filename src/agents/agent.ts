export type Agent = {
  id: string;
  role: string;
  goal: string;
  tools?: string[];
  mcpTools?: string[];
};

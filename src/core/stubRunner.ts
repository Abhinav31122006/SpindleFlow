import { buildAgentContext } from "./context/buildAgentContext";

export async function stubRunAgent(params: {
  agentId: string;
  role: string;
  goal: string;
  context: ReturnType<typeof buildAgentContext>;
}): Promise<string> {
  return `${params.agentId} saw ${params.context.priorOutputs.length} outputs`;
}

import { AgentContext } from "../core/context/buildAgentContext";

export function buildAgentPrompt(params: {
  role: string;
  goal: string;
  context: AgentContext;
}): string {
  const { role, goal, context } = params;

  const prior = context.priorOutputs.length
    ? context.priorOutputs
        .map(
          (o, i) => `(${i + 1}) ${o.agentId}: ${o.output}`
        )
        .join("\n")
    : "None";

  return `
You are acting as: ${role}

Goal:
${goal}

User input:
${context.userInput}

Prior agent outputs:
${prior}

Respond with your contribution only.
`.trim();
}

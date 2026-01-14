import { Agent } from "../agents/agent";
import { ContextStore } from "../context/store";

export function buildPrompt(
  agent: Agent,
  context: ContextStore
): { system: string; user: string } {
  const systemPrompt = `
You are acting as: ${agent.role}

Your goal:
${agent.goal}

Follow the goal strictly. Be concise, clear, and relevant.
`.trim();

  let userPrompt = `User input:\n${context.userInput}\n`;

  if (context.timeline.length > 0) {
    userPrompt += `\nPrevious agent outputs:\n`;

    for (const entry of context.timeline) {
      userPrompt += `
--- ${entry.role} (${entry.agentId}) ---
${entry.output}
`;
    }
  }

  return {
    system: systemPrompt,
    user: userPrompt.trim(),
  };
}

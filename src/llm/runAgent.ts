// src/llm/runAgent.ts

import runGemini from "./gemini";
import { buildAgentPrompt } from "./prompt";
import { buildAgentContext } from "../core/context/buildAgentContext";

export async function runAgentLLM(params: {
  agentId: string;
  role: string;
  goal: string;
  context: ReturnType<typeof buildAgentContext>;
}): Promise<string> {
  const prompt = buildAgentPrompt({
    role: params.role,
    goal: params.goal,
    context: params.context,
  });

  const response = await runGemini({
    prompt,
    temperature: 0.2,
  });

  return response.trim();
}

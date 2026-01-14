import { AgentRegistry } from "../agents/registry";
import { ContextStore } from "../context/store";
import { buildPrompt } from "../prompt/builder";
import { LLMProvider } from "../llm/provider";

export async function runSequentialWorkflow(params: {
  steps: { agent: string }[];
  registry: AgentRegistry;
  context: ContextStore;
  llm: LLMProvider;
}) {
  const { steps, registry, context, llm } = params;

  for (const step of steps) {
    const agent = registry.getAgent(step.agent);

    const startedAt = Date.now();

    const prompt = buildPrompt(agent, context);

    const output = await llm.generate({
      system: prompt.system,
      user: prompt.user,
      temperature: 0.2,
    });

    const endedAt = Date.now();

    // store output
    context.outputs[agent.id] = output;

    // add timeline entry
    context.timeline.push({
      agentId: agent.id,
      role: agent.role,
      output,
      startedAt,
      endedAt,
    });
  }
}

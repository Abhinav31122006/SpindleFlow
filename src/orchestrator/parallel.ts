import { AgentRegistry } from "../agents/registry";
import { ContextStore } from "../context/store";
import { buildPrompt } from "../prompt/builder";
import { LLMProvider } from "../llm/provider";

export async function runParallelWorkflow(params: {
  branches: string[];
  then: { agent: string };
  registry: AgentRegistry;
  context: ContextStore;
  llm: LLMProvider;
}) {
  const { branches, then, registry, context, llm } = params;

  // --- Run branch agents in parallel ---
  const branchResults = await Promise.all(
    branches.map(async (agentId) => {
      const agent = registry.getAgent(agentId);
      const startedAt = Date.now();

      const prompt = buildPrompt(agent, context);

      const output = await llm.generate({
        system: prompt.system,
        user: prompt.user,
        temperature: 0.2,
      });

      const endedAt = Date.now();

      return {
        agentId: agent.id,
        role: agent.role,
        output,
        startedAt,
        endedAt,
      };
    })
  );

  // --- Merge branch outputs into context ---
  for (const result of branchResults) {
    context.outputs[result.agentId] = result.output;
    context.timeline.push(result);
  }

  // --- Run the final "then" agent ---
  const finalAgent = registry.getAgent(then.agent);
  const startedAt = Date.now();

  const finalPrompt = buildPrompt(finalAgent, context);

  const finalOutput = await llm.generate({
    system: finalPrompt.system,
    user: finalPrompt.user,
    temperature: 0.2,
  });

  const endedAt = Date.now();

  context.outputs[finalAgent.id] = finalOutput;
  context.timeline.push({
    agentId: finalAgent.id,
    role: finalAgent.role,
    output: finalOutput,
    startedAt,
    endedAt,
  });
}

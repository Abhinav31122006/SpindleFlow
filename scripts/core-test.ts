import { createContextStore } from "../src/core/context/ContextStore";
import { AgentRegistry } from "../src/core/agents/AgentRegistry";
import { SequentialExecutor } from "../src/core/orchestrator/SequentialExecutor";
import { ParallelExecutor } from "../src/core/orchestrator/ParallelExecutor";

const agents = new AgentRegistry([
  { id: "a", role: "A", goal: "Do A" },
  { id: "b", role: "B", goal: "Do B" },
  { id: "c", role: "C", goal: "Do C" },
]);

const runAgent = async ({ agentId, context }: any) =>
  `${agentId} saw ${context.priorOutputs.length} outputs`;

(async () => {
  const context = createContextStore("test input");

  const seq = new SequentialExecutor(agents, runAgent);
  await seq.execute(
    {
      type: "sequential",
      steps: [{ agent: "a" }, { agent: "b" }],
    },
    context
  );

  const par = new ParallelExecutor(agents, runAgent);
  await par.execute(
    {
      type: "parallel",
      branches: ["a", "b"],
      then: { agent: "c" },
    },
    context
  );

  console.log(JSON.stringify(context, null, 2));
})();

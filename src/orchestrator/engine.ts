import { RootConfig } from "../config/schema";
import { AgentRegistry } from "../agents/registry";
import { ContextStore } from "../context/store";
import { LLMProvider } from "../llm/provider";
import { MCPToolRegistry } from "../mcp/registry";
import { runSequentialWorkflow } from "./sequential";
import { runParallelWorkflow } from "./parallel";
import { runIterativeParallelWorkflow } from "./parallel-iterative";
import { orchestratorLogger } from "../logger/enhanced-logger";

export async function runWorkflow(params: {
  config: RootConfig;
  registry: AgentRegistry;
  context: ContextStore;
  llm: LLMProvider;
  mcpRegistry?: MCPToolRegistry;
}) {
  const { config, registry, context, llm, mcpRegistry } = params;

  if (config.workflow.type === "sequential") {
    await runSequentialWorkflow({
      steps: config.workflow.steps,
      registry,
      context,
      llm,
      mcpRegistry,
    });
  }

  if (config.workflow.type === "parallel") {
    const feedbackLoop = config.workflow.then.feedback_loop;

    if (feedbackLoop?.enabled) {
      orchestratorLogger.info({
        event: "WORKFLOW_TYPE_SELECTED",
        type: "parallel-iterative",
        maxIterations: feedbackLoop.max_iterations,
      }, `🔄 Using iterative parallel workflow (feedback loop enabled)`);

      await runIterativeParallelWorkflow({
        branches: config.workflow.branches,
        then: {
          agent: config.workflow.then.agent,
          feedback_loop: feedbackLoop,
        },
        registry,
        context,
        llm,
        mcpRegistry,
      });
    } else {
      orchestratorLogger.info({
        event: "WORKFLOW_TYPE_SELECTED",
        type: "parallel",
      }, `⚡ Using standard parallel workflow`);

      await runParallelWorkflow({
        branches: config.workflow.branches,
        then: config.workflow.then,
        registry,
        context,
        llm,
        mcpRegistry,
      });
    }
  }
}

import { loadYamlConfig } from "../config/loader";
import { RootConfigSchema, RootConfig } from "../config/schema";
import { validateSemantics } from "../config/validator";
import { 
  ConfigError, 
  SemanticValidationError, 
  formatZodError 
} from "../config/errorFormatter";
import { AgentRegistry } from "../agents/registry";
import { getLLMProvider } from "../llm";
import { runWorkflow } from "../orchestrator/engine";
import {
  printWorkflowStart,
  printFinalOutput,
  printError,
} from "../reporter/console";
import { ContextStore } from "../context/store";
import {
  configLogger,
  agentLogger,
  orchestratorLogger,
  logger,
} from "../logger/enhanced-logger";
import {
  buildExecutionGraph,
  buildContextGraph,
  buildTimingGraph,
  buildParallelExecutionGraph,
  saveGraph,
} from "../visualization";
import { ZodError } from "zod";

export async function runCommand(
  configPath: string,
  userInput: string,
  apiKey?: string
) {
  const startTime = Date.now();
  
  logger.info(
    {
      event: "API_KEY_STATUS",
      providedViaCLI: Boolean(apiKey),
    },
    apiKey
      ? "🔑 API key provided via CLI"
      : "🔑 No API key provided via CLI (will fallback to env)"
  );
  
  logger.info({
    event: "COMMAND_START",
    configPath,
    userInputLength: userInput.length,
    timestamp: startTime,
  }, "🚀 Starting SpindleFlow execution");

  try {
    // 1. Load raw YAML
    configLogger.info({
      event: "CONFIG_LOAD_START",
      configPath,
    }, `📂 Loading configuration from: ${configPath}`);

    let rawConfig: unknown;
    try {
      rawConfig = loadYamlConfig(configPath);
    } catch (error) {
      // Re-throw with better context if it's not already a ConfigError
      if (error instanceof ConfigError) {
        throw error;
      }
      throw new ConfigError(
        `Failed to load configuration file: ${configPath}`,
        error instanceof Error ? error.message : String(error)
      );
    }

    configLogger.debug({
      event: "CONFIG_LOADED",
      configPath,
      rawConfig,
    }, `✅ Raw YAML loaded successfully`);

    // 2. Parse + validate structure (Zod is the source of truth)
    configLogger.info({
      event: "CONFIG_PARSE_START",
    }, `🔍 Parsing and validating configuration schema`);

    let parsed: RootConfig;
    try {
      parsed = RootConfigSchema.parse(rawConfig);
    } catch (error) {
      // ZodError will be caught by outer catch and formatted
      throw error;
    }

    configLogger.info({
      event: "CONFIG_PARSED",
      agentCount: parsed.agents.length,
      workflowType: parsed.workflow.type,
    }, `✅ Configuration parsed: ${parsed.agents.length} agents, ${parsed.workflow.type} workflow`);

    configLogger.debug({
      event: "CONFIG_DETAILS",
      agents: parsed.agents.map(a => ({ id: a.id, role: a.role })),
      workflow: parsed.workflow,
    }, `📋 Configuration details`);

    // 3. Semantic validation (IDs, references, logic)
    configLogger.info({
      event: "SEMANTIC_VALIDATION_START",
    }, `🔍 Validating semantic rules`);

    try {
      validateSemantics(parsed);
    } catch (error) {
      // SemanticValidationError will be caught by outer catch and formatted
      throw error;
    }

    configLogger.info({
      event: "SEMANTIC_VALIDATION_COMPLETE",
    }, `✅ Semantic validation passed`);
    if (!apiKey && !process.env.GEMINI_API_KEY) {
      throw new Error(
        "Missing API key. Provide --api-key or set GEMINI_API_KEY."
      );
    }

    // 4. Build agent registry
    agentLogger.info({
      event: "REGISTRY_BUILD_START",
      agentCount: parsed.agents.length,
    }, `🏗️ Building agent registry`);

    const registry = new AgentRegistry(parsed);

    agentLogger.info({
      event: "REGISTRY_BUILT",
      agentCount: registry.listAgents().length,
      agents: registry.listAgents().map(a => ({ id: a.id, role: a.role })),
    }, `✅ Agent registry built with ${registry.listAgents().length} agents`);

    // 5. Initialize shared context
    configLogger.info({
      event: "CONTEXT_INIT_START",
      userInputLength: userInput.length,
    }, `📦 Initializing context store`);

    const context = new ContextStore(userInput);

    configLogger.info({
      event: "CONTEXT_INITIALIZED",
    }, `✅ Context store initialized`);

    // 6. Select LLM provider
    configLogger.info({
      event: "LLM_PROVIDER_SELECT_START",
    }, `🤖 Selecting LLM provider`);

    const llm = getLLMProvider({ apiKey });

    configLogger.info({
      event: "LLM_PROVIDER_SELECTED",
      provider: llm.name,
    }, `✅ LLM provider selected: ${llm.name}`);

    // 7. Print workflow start
    printWorkflowStart(userInput);

    // 8. Execute workflow
    orchestratorLogger.info({
      event: "WORKFLOW_EXECUTION_START",
      workflowType: parsed.workflow.type,
      timestamp: Date.now(),
    }, `🎬 Starting workflow execution`);

    await runWorkflow({
      config: parsed,
      registry,
      context,
      llm,
    });

    orchestratorLogger.info({
      event: "WORKFLOW_EXECUTION_COMPLETE",
      timestamp: Date.now(),
      duration: Date.now() - startTime,
    }, `✅ Workflow execution complete`);

    // 9. Print final output
    printFinalOutput(context);
    // ── Base output directory ──
    const baseOutputDir = "output";
    
    // ── Render graphs based on workflow type ──
    if (parsed.workflow.type === "parallel") {
      // Parallel workflow: only render parallel execution graph
      const parallelExecutionGraph =
        buildParallelExecutionGraph(context.timeline);

      console.log("\n" + parallelExecutionGraph);

      saveGraph(
        baseOutputDir,
        "parallel_execution_graph.txt",
        parallelExecutionGraph
      );

      logger.info(
        {
          event: "PARALLEL_GRAPH_SAVED",
          file: "output/graphs/parallel_execution_graph.txt",
        },
        "🧩 Parallel execution graph saved"
      );
    } else {
      // Sequential workflow: render sequential graphs
      const executionGraph = buildExecutionGraph(context.timeline);
      const contextGraph = buildContextGraph(context);
      const timingGraph = buildTimingGraph(context.timeline);

      // ── Print to console ──
      console.log("\n" + executionGraph);
      console.log("\n" + contextGraph);
      console.log("\n" + timingGraph);

      // ── Save to files ──
      saveGraph(baseOutputDir, "execution_graph.txt", executionGraph);
      saveGraph(baseOutputDir, "context_graph.txt", contextGraph);
      saveGraph(baseOutputDir, "timing_graph.txt", timingGraph);

      logger.info(
        {
          event: "GRAPHS_SAVED",
          files: [
            "output/graphs/execution_graph.txt",
            "output/graphs/context_graph.txt",
            "output/graphs/timing_graph.txt",
          ],
        },
        "📊 ASCII graphs saved to output/graphs/"
      );
    }

    const endTime = Date.now();
    const totalDuration = endTime - startTime;

    logger.info({
      event: "COMMAND_COMPLETE",
      totalDuration,
      agentsExecuted: context.timeline.length,
      timestamp: endTime,
    }, `🎉 SpindleFlow execution complete (${totalDuration}ms)`);

  } catch (error) {
    const errorTime = Date.now();
    const duration = errorTime - startTime;

    logger.error({
      event: "COMMAND_ERROR",
      duration,
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        name: error.name,
      } : { message: String(error) },
      timestamp: errorTime,
    }, `❌ SpindleFlow execution failed after ${duration}ms`);

    // Handle different types of errors with user-friendly messages
    if (error instanceof ConfigError || error instanceof SemanticValidationError) {
      // Our custom config errors - already formatted
      console.error(error.format());
    } else if (error instanceof ZodError) {
      // Zod validation errors - format them nicely
      const formattedError = formatZodError(error);
      console.error(formattedError.format());
    } else if (error instanceof Error) {
      // Generic errors
      printError(error, "Workflow Execution");
    } else {
      // Unknown error type
      printError(new Error(String(error)), "Workflow Execution");
    }
    
    process.exit(1);
  }
}
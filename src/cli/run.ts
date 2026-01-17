import { loadYamlConfig } from "../config/loader";
import { RootConfigSchema, RootConfig } from "../config/schema";
import { validateSemantics } from "../config/validator";
import { 
  ConfigError, 
  printConfigError, 
  createSchemaValidationError 
} from "../config/errors";
import { ZodError } from "zod";
import { AgentRegistry } from "../agents/registry";
import { getLLMProvider } from "../llm";
import { runWorkflow } from "../orchestrator/engine";
import {
  printWorkflowStart,
  printFinalOutput,
  printError,
} from "../reporter/console";
import { ContextStore } from "../context/store";
import { initializeMCPTools } from "../mcp/initializer";
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

    const rawConfig = loadYamlConfig(configPath);

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
      if (error instanceof ZodError) {
        throw createSchemaValidationError(error);
      }
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

    validateSemantics(parsed);

    configLogger.info({
      event: "SEMANTIC_VALIDATION_COMPLETE",
    }, `✅ Semantic validation passed`);

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

    // 6. Select LLM provider and model
    configLogger.info({
      event: "LLM_PROVIDER_SELECT_START",
      modelKey: parsed.provider,
    }, `🤖 Selecting LLM provider: ${parsed.provider}`);

    const modelConfig = parsed.models[parsed.provider];
    const llm = getLLMProvider(modelConfig, { apiKey });

    configLogger.info({
      event: "LLM_PROVIDER_SELECTED",
      provider: llm.name,
      model: modelConfig.model,
    }, `✅ LLM provider selected: ${llm.name} (${modelConfig.model})`);

    // 7. Initialize MCP tools
    configLogger.info({
      event: "MCP_TOOLS_INIT_START",
    }, `🔧 Initializing MCP tool registry`);

    const mcpRegistry = initializeMCPTools(parsed);

    configLogger.info({
      event: "MCP_TOOLS_INITIALIZED",
      toolCount: mcpRegistry.listTools().length,
    }, `✅ MCP tools initialized: ${mcpRegistry.listTools().length} tools available`);

    // 8. Print workflow start
    printWorkflowStart(userInput);

    // 9. Execute workflow
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
      mcpRegistry,
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
      // Parallel workflow: render parallel execution graph + context graph + timing graph
      const parallelExecutionGraph =
        buildParallelExecutionGraph(context.timeline);
      const contextGraph = buildContextGraph(context);
      const timingGraph = buildTimingGraph(context.timeline);

      // ── Print to console ──
      console.log("\n" + parallelExecutionGraph);
      console.log("\n" + contextGraph);
      console.log("\n" + timingGraph);

      // ── Save to files ──
      saveGraph(
        baseOutputDir,
        "parallel_execution_graph.txt",
        parallelExecutionGraph
      );
      saveGraph(baseOutputDir, "context_graph.txt", contextGraph);
      saveGraph(baseOutputDir, "timing_graph.txt", timingGraph);

      logger.info(
        {
          event: "PARALLEL_GRAPHS_SAVED",
          files: [
            "output/graphs/parallel_execution_graph.txt",
            "output/graphs/context_graph.txt",
            "output/graphs/timing_graph.txt",
          ],
        },
        "🧩 Parallel workflow graphs saved to output/graphs/"
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

    // Handle ConfigError (file loading, YAML parsing, schema validation, semantic validation)
    if (error instanceof ConfigError) {
      logger.error({
        event: "CONFIG_ERROR",
        duration,
        errorType: error.name,
        message: error.message,
        timestamp: errorTime,
      }, `❌ Configuration error after ${duration}ms`);

      printConfigError(error);
      process.exit(1);
    }

    // Handle all other errors
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

    if (error instanceof Error) {
      printError(error, "Workflow Execution");
    } else {
      printError(new Error(String(error)), "Workflow Execution");
    }
    process.exit(1);
  }
}
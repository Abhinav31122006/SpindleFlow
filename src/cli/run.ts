import { loadYamlConfig } from "../config/loader";
import { RootConfigSchema, RootConfig } from "../config/schema";
import { validateSemantics } from "../config/validator";
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
  clearLogBuffer,
} from "../logger/enhanced-logger";

export async function runCommand(
  configPath: string,
  userInput: string
) {
  const startTime = Date.now();
  
  // Clear previous log buffer for fresh run
  clearLogBuffer();
  
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

    const parsed: RootConfig = RootConfigSchema.parse(rawConfig);

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

    // 6. Select LLM provider
    configLogger.info({
      event: "LLM_PROVIDER_SELECT_START",
    }, `🤖 Selecting LLM provider`);

    const llm = getLLMProvider();

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

    if (error instanceof Error) {
      printError(error, "Workflow Execution");
    } else {
      printError(new Error(String(error)), "Workflow Execution");
    }
    process.exit(1);
  }
}
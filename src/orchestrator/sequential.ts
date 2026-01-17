import { AgentRegistry } from "../agents/registry";
import { ContextStore } from "../context/store";
import { buildPrompt } from "../prompt/builder";
import { LLMProvider } from "../llm/provider";
import { ToolInvoker } from "../tools/invoker";
import { ContextSummarizer } from "../context/summarizer";
import { MCPToolRegistry } from "../mcp/registry";
import { ToolAwareLLMProvider } from "../llm/tool-aware-provider";
import { printAgentStart, printAgentComplete } from "../reporter/console";
import {
  logAgentExecution,
  logDataTransfer,
  orchestratorLogger,
} from "../logger/enhanced-logger";

export async function runSequentialWorkflow(params: {
  steps: { agent: string }[];
  registry: AgentRegistry;
  context: ContextStore;
  llm: LLMProvider;
  mcpRegistry?: MCPToolRegistry;
}) {
  const { steps, registry, context, llm, mcpRegistry } = params;

  // Initialize context summarizer
  const contextSummarizer = new ContextSummarizer(llm);

  orchestratorLogger.info({
    event: "SEQUENTIAL_WORKFLOW_START",
    totalSteps: steps.length,
    steps: steps.map(s => s.agent),
    timestamp: Date.now(),
  }, `🚀 Starting sequential workflow with ${steps.length} steps`);

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    const stepNumber = i + 1;

    orchestratorLogger.info({
      event: "STEP_START",
      stepNumber,
      totalSteps: steps.length,
      agentId: step.agent,
      timestamp: Date.now(),
    }, `📍 Step ${stepNumber}/${steps.length}: ${step.agent}`);

    // Retrieve agent from registry
    orchestratorLogger.debug({
      event: "AGENT_LOOKUP",
      stepNumber,
      agentId: step.agent,
    }, `🔍 Looking up agent: ${step.agent}`);

    const agent = registry.getAgent(step.agent);

    logDataTransfer(
      "AgentRegistry",
      "SequentialOrchestrator",
      { agentId: agent.id, role: agent.role },
      "explicit"
    );

    orchestratorLogger.debug({
      event: "AGENT_FOUND",
      stepNumber,
      agentId: agent.id,
      role: agent.role,
      goal: agent.goal,
    }, `✅ Agent found: ${agent.role}`);

    // Print start message
    printAgentStart(agent.id, agent.role);
    logAgentExecution(agent.id, agent.role, "START", {
      stepNumber,
      totalSteps: steps.length,
    });

    const startedAt = Date.now();
    orchestratorLogger.debug({
      event: "AGENT_EXECUTION_START",
      stepNumber,
      agentId: agent.id,
      timestamp: startedAt,
    }, `⚙️ Executing agent: ${agent.id}`);

    // Invoke tools if declared
    let toolOutputs = "";
    if (agent.tools && agent.tools.length > 0) {
      orchestratorLogger.info({
        event: "TOOL_INVOCATION_START",
        stepNumber,
        agentId: agent.id,
        tools: agent.tools,
      }, `🔧 Invoking ${agent.tools.length} tools: ${agent.tools.join(", ")}`);

      const toolInvoker = new ToolInvoker();
      const toolResults = await toolInvoker.invokeTools(agent.tools, {
        userInput: context.userInput,
        previousOutputs: context.getPreviousOutputs(),
      });

      toolOutputs = toolInvoker.formatToolResults(toolResults);

      orchestratorLogger.info({
        event: "TOOL_INVOCATION_COMPLETE",
        stepNumber,
        agentId: agent.id,
        toolCount: toolResults.length,
        totalDuration: toolResults.reduce((sum, r) => sum + r.duration, 0),
      }, `✅ Tools invoked: ${toolResults.length} tools executed`);

      logDataTransfer(
        "ToolInvoker",
        `Agent:${agent.id}`,
        { toolResults },
        "explicit"
      );
    }

    // Build prompt
    orchestratorLogger.debug({
      event: "PROMPT_BUILD_TRIGGER",
      stepNumber,
      agentId: agent.id,
    }, `📝 Triggering prompt build for: ${agent.id}`);

    const contextSnapshot = context.getContext();
    logDataTransfer(
      "ContextStore",
      `Agent:${agent.id}`,
      contextSnapshot,
      "implicit"
    );

    const prompt = buildPrompt(agent, context, toolOutputs);

    logDataTransfer(
      "PromptBuilder",
      `Agent:${agent.id}`,
      { system: prompt.system, user: prompt.user },
      "explicit"
    );

    orchestratorLogger.debug({
      event: "PROMPT_BUILD_COMPLETE",
      stepNumber,
      agentId: agent.id,
      systemLength: prompt.system.length,
      userLength: prompt.user.length,
    }, `✅ Prompt built for: ${agent.id}`);

    // Call LLM
    logAgentExecution(agent.id, agent.role, "PROCESSING", {
      stepNumber,
      promptLengths: {
        system: prompt.system.length,
        user: prompt.user.length,
      },
    });

    orchestratorLogger.info({
      event: "LLM_CALL_TRIGGER",
      stepNumber,
      agentId: agent.id,
      llmProvider: llm.name,
    }, `🤖 Calling LLM for: ${agent.id}`);

    let output: string;
    let toolCallLog: any[] = [];

    // Check if agent has MCP tools assigned
    const agentMCPTools = agent.mcpTools || [];
    
    if (agentMCPTools.length > 0 && mcpRegistry) {
      // Use ToolAwareLLMProvider for agents with MCP tools
      orchestratorLogger.info({
        event: "TOOL_AWARE_MODE_ENABLED",
        stepNumber,
        agentId: agent.id,
        mcpTools: agentMCPTools,
      }, `🔧 Tool-aware mode enabled with ${agentMCPTools.length} MCP tools`);

      const toolSchemas = agentMCPTools
        .map((toolName: string) => {
          const toolProvider = mcpRegistry.getTool(toolName);
          return toolProvider ? toolProvider.getSchema() : null;
        })
        .filter((schema: any): schema is import("../mcp/schema").MCPTool => schema !== null);

      orchestratorLogger.debug({
        event: "TOOL_SCHEMAS_LOADED",
        stepNumber,
        agentId: agent.id,
        toolCount: toolSchemas.length,
      }, `✅ Loaded ${toolSchemas.length} tool schemas`);

      const toolAwareLLM = new ToolAwareLLMProvider(llm, mcpRegistry);
      
      const result = await toolAwareLLM.generateWithTools({
        system: prompt.system,
        user: prompt.user,
        temperature: 0.2,
        tools: toolSchemas,
        maxToolCalls: 10,
      });

      output = result.output;
      toolCallLog = result.toolCalls;

      orchestratorLogger.info({
        event: "TOOL_CALLS_EXECUTED",
        stepNumber,
        agentId: agent.id,
        toolCallCount: toolCallLog.length,
        tools: toolCallLog.map(tc => tc.toolName),
      }, `✅ Executed ${toolCallLog.length} tool calls`);
    } else {
      // Use standard LLM provider for agents without MCP tools
      output = await llm.generate({
        system: prompt.system,
        user: prompt.user,
        temperature: 0.2,
      });
    }

    const endedAt = Date.now();
    const duration = endedAt - startedAt;

    orchestratorLogger.info({
      event: "AGENT_EXECUTION_COMPLETE",
      stepNumber,
      agentId: agent.id,
      duration,
      outputLength: output.length,
      timestamp: endedAt,
    }, `✅ Agent completed: ${agent.id} (${duration}ms)`);

    logDataTransfer(
      `LLM:${llm.name}`,
      `Agent:${agent.id}`,
      { output },
      "explicit"
    );

    // Store output in context
    orchestratorLogger.debug({
      event: "STORE_OUTPUT",
      stepNumber,
      agentId: agent.id,
      outputLength: output.length,
    }, `💾 Storing output for: ${agent.id}`);

    context.setOutput(agent.id, output);

    logDataTransfer(
      `Agent:${agent.id}`,
      "ContextStore",
      { output },
      "explicit"
    );

    // Add timeline entry
    orchestratorLogger.debug({
      event: "ADD_TIMELINE",
      stepNumber,
      agentId: agent.id,
    }, `⏱️ Adding timeline entry for: ${agent.id}`);

    const entry = {
      agentId: agent.id,
      role: agent.role,
      output,
      startedAt,
      endedAt,
    };

    context.addTimelineEntry(entry);

    logAgentExecution(agent.id, agent.role, "COMPLETE", {
      stepNumber,
      duration,
      outputLength: output.length,
    });

    // NEW: Create and store summary
    orchestratorLogger.info({
      event: "CREATING_SUMMARY",
      stepNumber,
      agentId: agent.id,
    }, `📝 Creating summary for: ${agent.id}`);

    try {
      const summary = await contextSummarizer.summarize(
        output,
        agent.id,
        agent.role
      );

      context.setSummary(agent.id, summary);

      orchestratorLogger.info({
        event: "SUMMARY_STORED",
        stepNumber,
        agentId: agent.id,
        keyInsightsCount: summary.keyInsights.length,
        decisionsCount: summary.decisions.length,
      }, `✅ Summary created and stored for: ${agent.id}`);

      logDataTransfer(
        "ContextSummarizer",
        "ContextStore",
        { summary },
        "explicit"
      );
    } catch (error) {
      orchestratorLogger.error({
        event: "SUMMARY_CREATION_ERROR",
        stepNumber,
        agentId: agent.id,
        error: error instanceof Error ? error.message : String(error),
      }, `❌ Failed to create summary for: ${agent.id}`);
    }

    // Print completion message
    printAgentComplete(entry);

    orchestratorLogger.info({
      event: "STEP_COMPLETE",
      stepNumber,
      totalSteps: steps.length,
      agentId: agent.id,
      duration,
      remainingSteps: steps.length - stepNumber,
    }, `✅ Step ${stepNumber}/${steps.length} complete (${steps.length - stepNumber} remaining)`);
  }

  orchestratorLogger.info({
    event: "SEQUENTIAL_WORKFLOW_COMPLETE",
    totalSteps: steps.length,
    timestamp: Date.now(),
  }, `🎉 Sequential workflow complete (${steps.length} steps executed)`);
}
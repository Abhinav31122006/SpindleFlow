import { AgentRegistry } from "../agents/registry";
import { ContextStore } from "../context/store";
import { buildPrompt } from "../prompt/builder";
import { LLMProvider } from "../llm/provider";
import { ToolInvoker } from "../tools/invoker";
import { ContextSummarizer } from "../context/summarizer";
import {
  printParallelStart,
  printParallelComplete,
  printAggregatorStart,
  printAgentComplete,
} from "../reporter/console";
import {
  logAgentExecution,
  logDataTransfer,
  orchestratorLogger,
} from "../logger/enhanced-logger";

export async function runParallelWorkflow(params: {
  branches: string[];
  then: { agent: string };
  registry: AgentRegistry;
  context: ContextStore;
  llm: LLMProvider;
}) {
  const { branches, then, registry, context, llm } = params;

  // Initialize context summarizer
  const contextSummarizer = new ContextSummarizer(llm);

  orchestratorLogger.info({
    event: "PARALLEL_WORKFLOW_START",
    totalBranches: branches.length,
    branches,
    aggregator: then.agent,
    timestamp: Date.now(),
  }, `🚀 Starting parallel workflow with ${branches.length} branches`);

  // Print parallel execution start
  printParallelStart(branches);

  const parallelStartTime = Date.now();

  orchestratorLogger.info({
    event: "PARALLEL_EXECUTION_START",
    timestamp: parallelStartTime,
    branches,
  }, `⚡ Launching ${branches.length} parallel executions`);

  // Run branch agents in parallel
  const branchPromises = branches.map(async (agentId, index) => {
    const branchNumber = index + 1;

    orchestratorLogger.info({
      event: "BRANCH_START",
      branchNumber,
      totalBranches: branches.length,
      agentId,
      timestamp: Date.now(),
    }, `🌿 Branch ${branchNumber}/${branches.length}: ${agentId} starting`);

    // Retrieve agent
    orchestratorLogger.debug({
      event: "AGENT_LOOKUP",
      branchNumber,
      agentId,
    }, `🔍 Looking up agent: ${agentId}`);

    const agent = registry.getAgent(agentId);

    logDataTransfer(
      "AgentRegistry",
      `ParallelBranch:${agentId}`,
      { agentId: agent.id, role: agent.role },
      "explicit"
    );

    orchestratorLogger.debug({
      event: "AGENT_FOUND",
      branchNumber,
      agentId: agent.id,
      role: agent.role,
    }, `✅ Agent found: ${agent.role}`);

    const startedAt = Date.now();

    logAgentExecution(agent.id, agent.role, "START", {
      branchNumber,
      totalBranches: branches.length,
      executionMode: "parallel",
    });

    // Invoke tools if declared
    let toolOutputs = "";
    if (agent.tools && agent.tools.length > 0) {
      orchestratorLogger.info({
        event: "TOOL_INVOCATION_START",
        branchNumber,
        agentId: agent.id,
        tools: agent.tools,
      }, `🔧 Invoking ${agent.tools.length} tools for branch: ${agent.tools.join(", ")}`);

      const toolInvoker = new ToolInvoker();
      const toolResults = await toolInvoker.invokeTools(agent.tools, {
        userInput: context.userInput,
        previousOutputs: context.getPreviousOutputs(),
      });

      toolOutputs = toolInvoker.formatToolResults(toolResults);

      orchestratorLogger.info({
        event: "TOOL_INVOCATION_COMPLETE",
        branchNumber,
        agentId: agent.id,
        toolCount: toolResults.length,
      }, `✅ Tools invoked for branch: ${toolResults.length} tools executed`);

      logDataTransfer(
        "ToolInvoker",
        `Branch:${agent.id}`,
        { toolResults },
        "explicit"
      );
    }

    // Build prompt
    orchestratorLogger.debug({
      event: "PROMPT_BUILD_TRIGGER",
      branchNumber,
      agentId: agent.id,
    }, `📝 Building prompt for branch: ${agentId}`);

    const contextSnapshot = context.getContext();
    logDataTransfer(
      "ContextStore",
      `Branch:${agent.id}`,
      contextSnapshot,
      "implicit"
    );

    const prompt = buildPrompt(agent, context, toolOutputs);

    logDataTransfer(
      "PromptBuilder",
      `Branch:${agent.id}`,
      { system: prompt.system, user: prompt.user },
      "explicit"
    );

    // Call LLM
    logAgentExecution(agent.id, agent.role, "PROCESSING", {
      branchNumber,
      executionMode: "parallel",
    });

    orchestratorLogger.info({
      event: "LLM_CALL_TRIGGER",
      branchNumber,
      agentId: agent.id,
      llmProvider: llm.name,
    }, `🤖 Calling LLM for branch: ${agentId}`);

    const output = await llm.generate({
      system: prompt.system,
      user: prompt.user,
      temperature: 0.2,
    });

    const endedAt = Date.now();
    const duration = endedAt - startedAt;

    orchestratorLogger.info({
      event: "BRANCH_COMPLETE",
      branchNumber,
      agentId: agent.id,
      duration,
      outputLength: output.length,
      timestamp: endedAt,
    }, `✅ Branch ${branchNumber}/${branches.length} complete: ${agentId} (${duration}ms)`);

    logDataTransfer(
      `LLM:${llm.name}`,
      `Branch:${agent.id}`,
      { output },
      "explicit"
    );

    logAgentExecution(agent.id, agent.role, "COMPLETE", {
      branchNumber,
      duration,
      outputLength: output.length,
      executionMode: "parallel",
    });

    const branchId = `branch-${branchNumber}`;

    return {
      agentId: agent.id,
      role: agent.role,
      output,
      startedAt,
      endedAt,
      branchId,
      branchIndex: branchNumber, 
    };
  });

  orchestratorLogger.debug({
    event: "WAITING_FOR_BRANCHES",
    totalBranches: branches.length,
  }, `⏳ Waiting for all ${branches.length} branches to complete`);

  const branchResults = await Promise.all(branchPromises);

  const parallelEndTime = Date.now();
  const parallelDuration = parallelEndTime - parallelStartTime;

  orchestratorLogger.info({
    event: "PARALLEL_EXECUTION_COMPLETE",
    totalBranches: branches.length,
    duration: parallelDuration,
    timestamp: parallelEndTime,
  }, `🎉 All ${branches.length} branches completed in ${parallelDuration}ms`);

  // Merge branch outputs into context
  orchestratorLogger.info({
    event: "MERGE_BRANCH_OUTPUTS",
    branchCount: branchResults.length,
  }, `🔀 Merging ${branchResults.length} branch outputs into context`);

  for (let i = 0; i < branchResults.length; i++) {
    const result = branchResults[i];
    
    orchestratorLogger.debug({
      event: "MERGE_OUTPUT",
      branchNumber: i + 1,
      totalBranches: branchResults.length,
      agentId: result.agentId,
      outputLength: result.output.length,
    }, `📥 Merging output ${i + 1}/${branchResults.length} from ${result.agentId}`);

    context.setOutput(result.agentId, result.output);
    context.addTimelineEntry(result);

    logDataTransfer(
      `Branch:${result.agentId}`,
      "ContextStore",
      result,
      "explicit"
    );

    // NEW: Create and store summary for each branch
    orchestratorLogger.info({
      event: "CREATING_BRANCH_SUMMARY",
      branchNumber: i + 1,
      agentId: result.agentId,
    }, `📝 Creating summary for branch: ${result.agentId}`);

    try {
      const summary = await contextSummarizer.summarize(
        result.output,
        result.agentId,
        result.role
      );

      context.setSummary(result.agentId, summary);

      orchestratorLogger.info({
        event: "BRANCH_SUMMARY_STORED",
        branchNumber: i + 1,
        agentId: result.agentId,
        keyInsightsCount: summary.keyInsights.length,
        decisionsCount: summary.decisions.length,
      }, `✅ Summary created and stored for branch: ${result.agentId}`);

      logDataTransfer(
        "ContextSummarizer",
        "ContextStore",
        { summary },
        "explicit"
      );
    } catch (error) {
      orchestratorLogger.error({
        event: "BRANCH_SUMMARY_ERROR",
        branchNumber: i + 1,
        agentId: result.agentId,
        error: error instanceof Error ? error.message : String(error),
      }, `❌ Failed to create summary for branch: ${result.agentId}`);
    }
  }

  orchestratorLogger.info({
    event: "MERGE_COMPLETE",
    mergedCount: branchResults.length,
  }, `✅ All branch outputs merged`);

  // Print parallel completion
  printParallelComplete(branchResults.length, parallelDuration);

  // Print individual branch completions
  for (const result of branchResults) {
    printAgentComplete(result);
  }

  // Run the final "then" agent (aggregator)
  orchestratorLogger.info({
    event: "AGGREGATOR_START",
    agentId: then.agent,
    timestamp: Date.now(),
  }, `🔷 Starting aggregator: ${then.agent}`);

  const finalAgent = registry.getAgent(then.agent);
  
  logDataTransfer(
    "AgentRegistry",
    "Aggregator",
    { agentId: finalAgent.id, role: finalAgent.role },
    "explicit"
  );

  printAggregatorStart(finalAgent.id, finalAgent.role);
  logAgentExecution(finalAgent.id, finalAgent.role, "START", {
    phase: "aggregation",
    inputBranches: branches.length,
  });

  const startedAt = Date.now();

  // Invoke tools if declared for aggregator
  let aggregatorToolOutputs = "";
  if (finalAgent.tools && finalAgent.tools.length > 0) {
    orchestratorLogger.info({
      event: "TOOL_INVOCATION_START",
      agentId: finalAgent.id,
      tools: finalAgent.tools,
      phase: "aggregation",
    }, `🔧 Invoking ${finalAgent.tools.length} tools for aggregator: ${finalAgent.tools.join(", ")}`);

    const toolInvoker = new ToolInvoker();
    const toolResults = await toolInvoker.invokeTools(finalAgent.tools, {
      userInput: context.userInput,
      previousOutputs: context.getPreviousOutputs(),
    });

    aggregatorToolOutputs = toolInvoker.formatToolResults(toolResults);

    orchestratorLogger.info({
      event: "TOOL_INVOCATION_COMPLETE",
      agentId: finalAgent.id,
      toolCount: toolResults.length,
      phase: "aggregation",
    }, `✅ Tools invoked for aggregator: ${toolResults.length} tools executed`);

    logDataTransfer(
      "ToolInvoker",
      `Aggregator:${finalAgent.id}`,
      { toolResults },
      "explicit"
    );
  }

  orchestratorLogger.debug({
    event: "AGGREGATOR_PROMPT_BUILD",
    agentId: finalAgent.id,
  }, `📝 Building aggregator prompt`);

  const contextSnapshot = context.getContext();
  logDataTransfer(
    "ContextStore",
    `Aggregator:${finalAgent.id}`,
    contextSnapshot,
    "implicit"
  );

  const finalPrompt = buildPrompt(finalAgent, context, aggregatorToolOutputs);

  logDataTransfer(
    "PromptBuilder",
    `Aggregator:${finalAgent.id}`,
    { system: finalPrompt.system, user: finalPrompt.user },
    "explicit"
  );

  orchestratorLogger.info({
    event: "AGGREGATOR_LLM_CALL",
    agentId: finalAgent.id,
    llmProvider: llm.name,
  }, `🤖 Calling LLM for aggregator: ${finalAgent.id}`);

  logAgentExecution(finalAgent.id, finalAgent.role, "PROCESSING", {
    phase: "aggregation",
  });

  const finalOutput = await llm.generate({
    system: finalPrompt.system,
    user: finalPrompt.user,
    temperature: 0.2,
  });

  const endedAt = Date.now();
  const aggregatorDuration = endedAt - startedAt;

  orchestratorLogger.info({
    event: "AGGREGATOR_COMPLETE",
    agentId: finalAgent.id,
    duration: aggregatorDuration,
    outputLength: finalOutput.length,
    timestamp: endedAt,
  }, `✅ Aggregator complete: ${finalAgent.id} (${aggregatorDuration}ms)`);

  logDataTransfer(
    `LLM:${llm.name}`,
    `Aggregator:${finalAgent.id}`,
    { output: finalOutput },
    "explicit"
  );

  context.setOutput(finalAgent.id, finalOutput);
  
  const finalEntry = {
    agentId: finalAgent.id,
    role: finalAgent.role,
    output: finalOutput,
    startedAt,
    endedAt,
    isAggregator: true,
  };
  
  context.addTimelineEntry(finalEntry);

  logDataTransfer(
    `Aggregator:${finalAgent.id}`,
    "ContextStore",
    finalEntry,
    "explicit"
  );

  logAgentExecution(finalAgent.id, finalAgent.role, "COMPLETE", {
    phase: "aggregation",
    duration: aggregatorDuration,
    outputLength: finalOutput.length,
  });

  // NEW: Create and store summary for aggregator
  orchestratorLogger.info({
    event: "CREATING_AGGREGATOR_SUMMARY",
    agentId: finalAgent.id,
  }, `📝 Creating summary for aggregator: ${finalAgent.id}`);

  try {
    const aggregatorSummary = await contextSummarizer.summarize(
      finalOutput,
      finalAgent.id,
      finalAgent.role
    );

    context.setSummary(finalAgent.id, aggregatorSummary);

    orchestratorLogger.info({
      event: "AGGREGATOR_SUMMARY_STORED",
      agentId: finalAgent.id,
      keyInsightsCount: aggregatorSummary.keyInsights.length,
      decisionsCount: aggregatorSummary.decisions.length,
    }, `✅ Summary created and stored for aggregator: ${finalAgent.id}`);

    logDataTransfer(
      "ContextSummarizer",
      "ContextStore",
      { summary: aggregatorSummary },
      "explicit"
    );
  } catch (error) {
    orchestratorLogger.error({
      event: "AGGREGATOR_SUMMARY_ERROR",
      agentId: finalAgent.id,
      error: error instanceof Error ? error.message : String(error),
    }, `❌ Failed to create summary for aggregator: ${finalAgent.id}`);
  }

  // Print aggregator completion
  printAgentComplete(finalEntry);

  const totalWorkflowDuration = Date.now() - parallelStartTime;

  orchestratorLogger.info({
    event: "PARALLEL_WORKFLOW_COMPLETE",
    totalBranches: branches.length,
    parallelDuration,
    aggregatorDuration,
    totalDuration: totalWorkflowDuration,
    timestamp: Date.now(),
  }, `🎉 Parallel workflow complete (total: ${totalWorkflowDuration}ms)`);
}
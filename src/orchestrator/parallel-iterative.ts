import { AgentRegistry } from "../agents/registry";
import { ContextStore } from "../context/store";
import { LLMProvider } from "../llm/provider";
import { FeedbackLoopConfig } from "../config/feedback-schema";
import { FeedbackProcessor } from "./feedback-processor";
import { ContextSummarizer } from "../context/summarizer";
import { MCPToolRegistry } from "../mcp/registry";
import { buildReviewPrompt, buildRevisionPrompt } from "../prompt/feedback-prompts";
import { buildPrompt } from "../prompt/builder";
import { ToolInvoker } from "../tools/invoker";
import {
  printFeedbackIteration,
  printFeedbackSummary,
  printApprovalStatus,
  printRevisionStart,
  printRevisionComplete,
  printRevisionEnd,
  printMaxIterationsReached,
  printParallelStart,
  printAggregatorStart,
  printAgentComplete,
} from "../reporter/console";
import {
  logAgentExecution,
  logDataTransfer,
  orchestratorLogger,
} from "../logger/enhanced-logger";

interface BranchResult {
  agentId: string;
  role: string;
  output: string;
  startedAt: number;
  endedAt: number;
  branchId: string;
  branchIndex: number;
}

export async function runIterativeParallelWorkflow(params: {
  branches: string[];
  then: { agent: string; feedback_loop: FeedbackLoopConfig };
  registry: AgentRegistry;
  context: ContextStore;
  llm: LLMProvider;
  mcpRegistry?: MCPToolRegistry;
}) {
  const { branches, then, registry, context, llm, mcpRegistry } = params;
  const config = then.feedback_loop;

  orchestratorLogger.info({
    event: "ITERATIVE_PARALLEL_WORKFLOW_START",
    totalBranches: branches.length,
    branches,
    aggregator: then.agent,
    maxIterations: config.max_iterations,
    approvalKeyword: config.approval_keyword,
  }, `🚀 Starting iterative parallel workflow (max ${config.max_iterations} iterations)`);

  const contextSummarizer = new ContextSummarizer(llm);
  const feedbackProcessor = new FeedbackProcessor();

  let iteration = 0;
  let approved = false;

  // Initial execution of branches
  printParallelStart(branches);
  let branchOutputs = await executeParallelBranches(
    branches,
    registry,
    context,
    llm,
    contextSummarizer,
    iteration
  );

  // Feedback loop
  while (!approved && iteration < config.max_iterations) {
    iteration++;

    printFeedbackIteration(iteration, config.max_iterations);

    orchestratorLogger.info({
      event: "FEEDBACK_ITERATION_START",
      iteration,
      maxIterations: config.max_iterations,
    }, `🔄 Starting feedback iteration ${iteration}/${config.max_iterations}`);

    // Run reviewer/aggregator
    const reviewerAgent = registry.getAgent(then.agent);

    printAggregatorStart(reviewerAgent.id, reviewerAgent.role);

    const startedAt = Date.now();

    // Invoke tools if declared for aggregator
    let aggregatorToolOutputs = "";
    if (reviewerAgent.tools && reviewerAgent.tools.length > 0) {
      const toolInvoker = new ToolInvoker();
      const toolResults = await toolInvoker.invokeTools(reviewerAgent.tools, {
        userInput: context.userInput,
        previousOutputs: context.getPreviousOutputs(),
      });
      aggregatorToolOutputs = toolInvoker.formatToolResults(toolResults);
    }

    // Build review prompt
    const reviewPrompt = buildReviewPrompt(
      reviewerAgent,
      context,
      branchOutputs,
      iteration,
      config.approval_keyword
    );

    logAgentExecution(reviewerAgent.id, reviewerAgent.role, "PROCESSING", {
      phase: "review",
      iteration,
    });

    // Call LLM for review
    const reviewOutput = await llm.generate({
      system: reviewPrompt.system,
      user: reviewPrompt.user,
      temperature: 0.2,
    });

    const endedAt = Date.now();
    const duration = endedAt - startedAt;

    orchestratorLogger.info({
      event: "REVIEW_COMPLETE",
      iteration,
      agentId: reviewerAgent.id,
      duration,
      outputLength: reviewOutput.length,
    }, `✅ Review complete (iteration ${iteration})`);

    // Store reviewer output
    context.setOutput(reviewerAgent.id, reviewOutput);
    context.addTimelineEntry({
      agentId: reviewerAgent.id,
      role: reviewerAgent.role,
      output: reviewOutput,
      startedAt,
      endedAt,
      isAggregator: true,
      iteration,
    });

    // Process feedback
    const feedbackResult = feedbackProcessor.processFeedback(
      reviewOutput,
      config.feedback_targets,
      config.approval_keyword,
      iteration
    );

    // Store feedback iteration
    context.addFeedbackIteration({
      iteration,
      reviewerOutput: reviewOutput,
      approved: feedbackResult.isApproved,
      timestamp: Date.now(),
      feedback: feedbackResult.feedback,
    });

    // Create summary for reviewer
    try {
      const summary = await contextSummarizer.summarize(
        reviewOutput,
        reviewerAgent.id,
        reviewerAgent.role
      );
      context.setSummary(reviewerAgent.id, summary);
    } catch (error) {
      orchestratorLogger.error({
        event: "SUMMARY_ERROR",
        agentId: reviewerAgent.id,
        error: error instanceof Error ? error.message : String(error),
      }, `❌ Failed to create summary for reviewer`);
    }

    printAgentComplete({
      agentId: reviewerAgent.id,
      role: reviewerAgent.role,
      output: reviewOutput,
      startedAt,
      endedAt,
      isAggregator: true,
    });

    if (feedbackResult.isApproved) {
      approved = true;
      printApprovalStatus(true, iteration);
      
      orchestratorLogger.info({
        event: "WORKFLOW_APPROVED",
        iteration,
      }, `✅ Workflow approved after ${iteration} iteration(s)`);
      break;
    }

    // Not approved - display feedback
    printApprovalStatus(false, iteration);

    orchestratorLogger.info({
      event: "FEEDBACK_DISTRIBUTION_START",
      iteration,
      targetCount: config.feedback_targets.length,
    }, `📝 Distributing feedback to ${config.feedback_targets.length} agents`);

    for (const [agentId, feedback] of feedbackResult.feedback.entries()) {
      const agentData = branchOutputs.get(agentId);
      if (agentData) {
        printFeedbackSummary(agentId, agentData.role, feedback);
      }
    }

    // Execute revisions
    branchOutputs = await executeRevisions(
      config.feedback_targets,
      feedbackResult.feedback,
      branchOutputs,
      registry,
      context,
      llm,
      contextSummarizer,
      iteration
    );
  }

  if (!approved) {
    printMaxIterationsReached(config.max_iterations);
    
    orchestratorLogger.warn({
      event: "MAX_ITERATIONS_REACHED",
      iterations: config.max_iterations,
    }, `⚠️ Max iterations reached without approval`);
  }

  orchestratorLogger.info({
    event: "ITERATIVE_PARALLEL_WORKFLOW_COMPLETE",
    iterations: iteration,
    approved,
  }, `🎉 Iterative parallel workflow complete (${iteration} iterations, ${approved ? 'APPROVED' : 'NOT APPROVED'})`);

  return {
    approved,
    iterations: iteration,
    finalOutputs: branchOutputs,
  };
}

async function executeParallelBranches(
  branches: string[],
  registry: AgentRegistry,
  context: ContextStore,
  llm: LLMProvider,
  contextSummarizer: ContextSummarizer,
  iteration: number
): Promise<Map<string, BranchResult>> {
  orchestratorLogger.info({
    event: "PARALLEL_BRANCHES_START",
    branchCount: branches.length,
    iteration,
  }, `⚡ Executing ${branches.length} parallel branches (iteration ${iteration})`);

  const parallelStartTime = Date.now();

  const branchPromises = branches.map(async (agentId, index) => {
    const branchNumber = index + 1;
    const agent = registry.getAgent(agentId);

    const startedAt = Date.now();

    logAgentExecution(agent.id, agent.role, "START", {
      branchNumber,
      totalBranches: branches.length,
      executionMode: "parallel",
      iteration,
    });

    // Invoke tools if declared
    let toolOutputs = "";
    if (agent.tools && agent.tools.length > 0) {
      const toolInvoker = new ToolInvoker();
      const toolResults = await toolInvoker.invokeTools(agent.tools, {
        userInput: context.userInput,
        previousOutputs: context.getPreviousOutputs(),
      });
      toolOutputs = toolInvoker.formatToolResults(toolResults);
    }

    // Build prompt
    const prompt = buildPrompt(agent, context, toolOutputs);

    logAgentExecution(agent.id, agent.role, "PROCESSING", {
      branchNumber,
      executionMode: "parallel",
      iteration,
    });

    // Call LLM
    const output = await llm.generate({
      system: prompt.system,
      user: prompt.user,
      temperature: 0.2,
    });

    const endedAt = Date.now();

    logAgentExecution(agent.id, agent.role, "COMPLETE", {
      branchNumber,
      duration: endedAt - startedAt,
      outputLength: output.length,
      executionMode: "parallel",
      iteration,
    });

    return {
      agentId: agent.id,
      role: agent.role,
      output,
      startedAt,
      endedAt,
      branchId: `branch-${branchNumber}`,
      branchIndex: branchNumber,
    };
  });

  const branchResults = await Promise.all(branchPromises);

  orchestratorLogger.info({
    event: "PARALLEL_BRANCHES_COMPLETE",
    branchCount: branchResults.length,
    duration: Date.now() - parallelStartTime,
    iteration,
  }, `✅ All branches complete (iteration ${iteration})`);

  // Store outputs and create summaries
  for (const result of branchResults) {
    context.setOutput(result.agentId, result.output);
    context.addTimelineEntry({
      ...result,
      iteration,
    });

    // Create summary
    try {
      const summary = await contextSummarizer.summarize(
        result.output,
        result.agentId,
        result.role
      );
      context.setSummary(result.agentId, summary);
    } catch (error) {
      orchestratorLogger.error({
        event: "SUMMARY_ERROR",
        agentId: result.agentId,
        error: error instanceof Error ? error.message : String(error),
      }, `❌ Failed to create summary for ${result.agentId}`);
    }

    printAgentComplete(result);
  }

  const outputsMap = new Map<string, BranchResult>();
  branchResults.forEach(result => outputsMap.set(result.agentId, result));

  return outputsMap;
}

async function executeRevisions(
  targetAgents: string[],
  feedback: Map<string, string>,
  previousOutputs: Map<string, BranchResult>,
  registry: AgentRegistry,
  context: ContextStore,
  llm: LLMProvider,
  contextSummarizer: ContextSummarizer,
  iteration: number
): Promise<Map<string, BranchResult>> {
  orchestratorLogger.info({
    event: "REVISIONS_START",
    iteration,
    agentCount: targetAgents.length,
  }, `🔄 Starting revisions for ${targetAgents.length} agents (iteration ${iteration})`);

  printRevisionStart(targetAgents.length, iteration);

  const revisionPromises = targetAgents.map(async (agentId) => {
    const agent = registry.getAgent(agentId);
    const agentFeedback = feedback.get(agentId) || "Please review and improve your output.";
    const previousResult = previousOutputs.get(agentId);
    const previousOutput = previousResult?.output || "";

    const startedAt = Date.now();

    orchestratorLogger.info({
      event: "REVISION_START",
      agentId,
      iteration,
    }, `🔄 ${agentId}: Incorporating feedback...`);

    // Build revision prompt
    const revisionPrompt = buildRevisionPrompt(
      agent,
      context,
      previousOutput,
      agentFeedback,
      iteration
    );

    logAgentExecution(agent.id, agent.role, "PROCESSING", {
      phase: "revision",
      iteration,
    });

    // Call LLM for revision
    const revisedOutput = await llm.generate({
      system: revisionPrompt.system,
      user: revisionPrompt.user,
      temperature: 0.2,
    });

    const endedAt = Date.now();

    orchestratorLogger.info({
      event: "REVISION_COMPLETE",
      agentId,
      iteration,
      duration: endedAt - startedAt,
      outputLength: revisedOutput.length,
    }, `✅ ${agentId}: Revision complete`);

    logAgentExecution(agent.id, agent.role, "COMPLETE", {
      phase: "revision",
      iteration,
      duration: endedAt - startedAt,
    });

    // Store revision
    context.setRevision(agentId, iteration, revisedOutput);

    printRevisionComplete(agentId, agent.role);

    return {
      agentId: agent.id,
      role: agent.role,
      output: revisedOutput,
      startedAt,
      endedAt,
      branchId: `branch-rev-${iteration}`,
      branchIndex: iteration,
    };
  });

  const revisions = await Promise.all(revisionPromises);

  printRevisionEnd();

  orchestratorLogger.info({
    event: "REVISIONS_COMPLETE",
    iteration,
    revisionCount: revisions.length,
  }, `✅ All revisions complete (iteration ${iteration})`);

  // Update outputs and create summaries
  for (const revision of revisions) {
    context.setOutput(revision.agentId, revision.output);
    context.addTimelineEntry({
      ...revision,
      iteration,
    });

    // Create summary
    try {
      const summary = await contextSummarizer.summarize(
        revision.output,
        revision.agentId,
        revision.role
      );
      context.setSummary(revision.agentId, summary);
    } catch (error) {
      orchestratorLogger.error({
        event: "SUMMARY_ERROR",
        agentId: revision.agentId,
        error: error instanceof Error ? error.message : String(error),
      }, `❌ Failed to create summary for ${revision.agentId}`);
    }
  }

  const revisedOutputs = new Map<string, BranchResult>();
  revisions.forEach(r => revisedOutputs.set(r.agentId, r));

  return revisedOutputs;
}

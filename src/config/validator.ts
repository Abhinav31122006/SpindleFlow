import { RootConfig } from "./schema";
import { SemanticValidationError } from "./errorFormatter";

export function validateSemantics(config: RootConfig) {
  const agentIds = new Set<string>();

  // Check for duplicate agent IDs
  for (const agent of config.agents) {
    if (agentIds.has(agent.id)) {
      throw new SemanticValidationError(
        `Duplicate agent ID found: "${agent.id}"`,
        agent.id,
        [
          "Each agent must have a unique ID",
          "Check your 'agents' section for duplicate IDs",
          `Found multiple agents with ID: "${agent.id}"`
        ]
      );
    }
    agentIds.add(agent.id);
  }

  const assertAgentExists = (id: string, context: string) => {
    if (!agentIds.has(id)) {
      const availableAgents = Array.from(agentIds).join(", ");
      throw new SemanticValidationError(
        `${context} references unknown agent: "${id}"`,
        id,
        [
          `Agent "${id}" is not defined in the 'agents' section`,
          `Available agents: ${availableAgents}`,
          "Make sure the agent ID matches exactly (IDs are case-sensitive)",
          "Check for typos in agent IDs"
        ]
      );
    }
  };

  // Validate sequential workflow
  if (config.workflow.type === "sequential") {
    if (config.workflow.steps.length === 0) {
      throw new SemanticValidationError(
        "Sequential workflow has no steps",
        undefined,
        [
          "Add at least one step to your sequential workflow",
          "Example: steps: [{ agent: 'your-agent-id' }]"
        ]
      );
    }

    config.workflow.steps.forEach((step, index) => {
      assertAgentExists(step.agent, `Sequential workflow step ${index + 1}`);
    });
  }

  // Validate parallel workflow
  if (config.workflow.type === "parallel") {
    if (config.workflow.branches.length === 0) {
      throw new SemanticValidationError(
        "Parallel workflow has no branches",
        undefined,
        [
          "Add at least one branch to your parallel workflow",
          "Example: branches: ['agent-1', 'agent-2']"
        ]
      );
    }

    config.workflow.branches.forEach((branchAgentId, index) => {
      assertAgentExists(branchAgentId, `Parallel workflow branch ${index + 1}`);
    });

    assertAgentExists(
      config.workflow.then.agent,
      "Parallel workflow aggregator ('then' field)"
    );

    // Check if aggregator agent is also in branches (potential issue)
    if (config.workflow.branches.includes(config.workflow.then.agent)) {
      const agentId = config.workflow.then.agent;
      throw new SemanticValidationError(
        `Aggregator agent "${agentId}" is also listed in parallel branches`,
        agentId,
        [
          "The 'then' agent should be different from branch agents",
          "The aggregator runs after all branches complete",
          `Remove "${agentId}" from branches or use a different agent for 'then'`
        ]
      );
    }
  }
}

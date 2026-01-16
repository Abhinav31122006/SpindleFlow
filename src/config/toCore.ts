// src/config/toCore.ts

import { AgentRegistry } from "../core/agents/AgentRegistry";
import { Workflow } from "../core/orchestrator/types";

type RawAgent = {
  id: string;
  role: string;
  goal: string;
};

type RawConfig = {
  agents: RawAgent[];
  workflow: Workflow;
};

/**
 * Maps validated YAML config into deterministic core structures.
 * No logic, no side effects.
 */
export function mapConfigToCore(config: RawConfig) {
  const registry = new AgentRegistry(config.agents);
  const workflow = config.workflow;

  return {
    registry,
    workflow,
  };
}

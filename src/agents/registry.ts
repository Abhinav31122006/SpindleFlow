import { Agent } from "./agent";
import { RootConfig } from "../config/schema";


export class AgentRegistry {
  private agents = new Map<string, Agent>();

  constructor(config: RootConfig) {
    for (const agent of config.agents) {
      this.agents.set(agent.id, {
        id: agent.id,
        role: agent.role,
        goal: agent.goal,
        tools: agent.tools,
        mcpTools: agent.mcpTools,
      });
    }
  }

  getAgent(id: string): Agent {
    const agent = this.agents.get(id);
    if (!agent) {
      throw new Error(`Agent not found in registry: ${id}`);
    }
    return agent;
  }

  listAgents(): Agent[] {
    return Array.from(this.agents.values());
  }
}

import { MCPTool, MCPToolResult } from "./schema";
import { llmLogger } from "../logger/enhanced-logger";

export interface MCPToolProvider {
  getSchema(): MCPTool;
  execute(parameters: Record<string, any>): Promise<MCPToolResult>;
}

export class MCPToolRegistry {
  private tools = new Map<string, MCPToolProvider>();

  register(tool: MCPToolProvider): void {
    const schema = tool.getSchema();
    this.tools.set(schema.name, tool);
    llmLogger.info({
      event: "TOOL_REGISTERED",
      toolName: schema.name,
      executor: schema.executor,
    }, `🔧 Registered MCP tool: ${schema.name}`);
  }

  getTool(name: string): MCPToolProvider | undefined {
    return this.tools.get(name);
  }

  listTools(): MCPTool[] {
    return Array.from(this.tools.values()).map((t) => t.getSchema());
  }

  getToolsForAgent(toolNames: string[]): MCPToolProvider[] {
    return toolNames
      .map((name) => this.tools.get(name))
      .filter((tool): tool is MCPToolProvider => tool !== undefined);
  }

  async executeTool(
    toolName: string,
    parameters: Record<string, any>
  ): Promise<MCPToolResult> {
    const tool = this.tools.get(toolName);

    if (!tool) {
      llmLogger.error({
        event: "TOOL_NOT_FOUND",
        toolName,
      }, `❌ Tool not found: ${toolName}`);
      
      return {
        success: false,
        error: `Tool ${toolName} not found`,
        executionTime: 0,
      };
    }

    llmLogger.info({
      event: "TOOL_EXECUTION_START",
      toolName,
      parameters,
    }, `🔧 Executing tool: ${toolName}`);

    try {
      const result = await tool.execute(parameters);
      
      llmLogger.info({
        event: "TOOL_EXECUTION_COMPLETE",
        toolName,
        success: result.success,
        executionTime: result.executionTime,
      }, `✅ Tool execution ${result.success ? 'succeeded' : 'failed'}: ${toolName}`);
      
      return result;
    } catch (error) {
      llmLogger.error({
        event: "TOOL_EXECUTION_ERROR",
        toolName,
        error: error instanceof Error ? error.message : String(error),
      }, `❌ Tool execution error: ${toolName}`);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        executionTime: 0,
      };
    }
  }
}

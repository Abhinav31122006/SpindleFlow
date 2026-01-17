import { LLMProvider } from "./provider";
import { MCPToolRegistry } from "../mcp/registry";
import { MCPTool, MCPToolCall } from "../mcp/schema";
import { llmLogger } from "../logger/enhanced-logger";

export interface ToolAwareLLMParams {
  system: string;
  user: string;
  temperature?: number;
  tools?: MCPTool[];
  maxToolCalls?: number;
}

export class ToolAwareLLMProvider {
  constructor(
    private baseLLM: LLMProvider,
    private toolRegistry: MCPToolRegistry
  ) {}

  async generateWithTools(
    params: ToolAwareLLMParams
  ): Promise<{ output: string; toolCalls: MCPToolCall[] }> {
    const maxIterations = params.maxToolCalls || 5;
    const toolCalls: MCPToolCall[] = [];

    let currentPrompt = params.user;
    let iteration = 0;

    llmLogger.info({
      event: "TOOL_AWARE_GENERATION_START",
      availableTools: params.tools?.map(t => t.name) || [],
      maxIterations,
    }, `🔧 Starting tool-aware generation with ${params.tools?.length || 0} tools`);

    while (iteration < maxIterations) {
      iteration++;

      // Add tool descriptions to system prompt
      const systemWithTools = this.buildToolPrompt(
        params.system,
        params.tools || []
      );

      // Call LLM
      const response = await this.baseLLM.generate({
        system: systemWithTools,
        user: currentPrompt,
        temperature: params.temperature,
      });

      // Check if response contains tool calls
      const toolCall = this.parseToolCall(response);

      if (!toolCall) {
        // No tool call - this is the final response
        llmLogger.info({
          event: "TOOL_AWARE_GENERATION_COMPLETE",
          iterations: iteration,
          totalToolCalls: toolCalls.length,
        }, `✅ Tool-aware generation complete after ${iteration} iterations`);
        
        return { output: response, toolCalls };
      }

      // Execute tool
      llmLogger.info({
        event: "TOOL_CALL_DETECTED",
        toolName: toolCall.toolName,
        iteration,
      }, `🔧 Tool call detected: ${toolCall.toolName}`);

      const result = await this.toolRegistry.executeTool(
        toolCall.toolName,
        toolCall.parameters
      );

      toolCalls.push({
        ...toolCall,
        timestamp: Date.now(),
      });

      // Add tool result to context
      currentPrompt = this.buildToolResultPrompt(
        currentPrompt,
        toolCall,
        result
      );
    }

    // Max iterations reached
    llmLogger.warn({
      event: "MAX_TOOL_ITERATIONS_REACHED",
      iterations: maxIterations,
      toolCalls: toolCalls.length,
    }, `⚠️ Max tool call iterations (${maxIterations}) reached`);

    throw new Error(`Max tool call iterations (${maxIterations}) reached`);
  }

  private buildToolPrompt(baseSystem: string, tools: MCPTool[]): string {
    if (tools.length === 0) return baseSystem;

    let toolsSection = `\n\nYou have access to the following tools:\n\n`;

    for (const tool of tools) {
      toolsSection += `Tool: ${tool.name}\n`;
      toolsSection += `Description: ${tool.description}\n`;
      toolsSection += `Parameters: ${JSON.stringify(tool.parameters, null, 2)}\n`;
      toolsSection += `\n`;
    }

    toolsSection += `
To use a tool, respond with ONLY this format (no other text):
<tool_call>
{
  "tool": "tool_name",
  "parameters": { ... }
}
</tool_call>

When you have the information you need from tools, respond normally without the tool_call tags.
`;

    return baseSystem + toolsSection;
  }

  private parseToolCall(response: string): {
    toolName: string;
    parameters: Record<string, any>;
  } | null {
    // Look for <tool_call> tags
    const match = response.match(/<tool_call>(.*?)<\/tool_call>/s);
    if (!match) return null;

    try {
      const parsed = JSON.parse(match[1].trim());
      return {
        toolName: parsed.tool,
        parameters: parsed.parameters || {},
      };
    } catch (error) {
      llmLogger.error({
        event: "TOOL_CALL_PARSE_ERROR",
        error: error instanceof Error ? error.message : String(error),
        rawContent: match[1],
      }, `❌ Failed to parse tool call`);
      return null;
    }
  }

  private buildToolResultPrompt(
    previousPrompt: string,
    toolCall: { toolName: string; parameters: any },
    result: any
  ): string {
    return `${previousPrompt}

<tool_result>
Tool: ${toolCall.toolName}
Parameters: ${JSON.stringify(toolCall.parameters)}
Result: ${JSON.stringify(result, null, 2)}
</tool_result>

Based on this tool result, provide your final response (without using more tools unless necessary).`;
  }
}

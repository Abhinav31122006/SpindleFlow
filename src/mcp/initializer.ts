import { MCPToolRegistry } from "../mcp/registry";
import { FilesystemTool } from "../mcp/tools/filesystem";
import { WebSearchTool } from "../mcp/tools/web-search";
import { CodeExecutionTool } from "../mcp/tools/code-execution";
import { RootConfig } from "../config/schema";
import { llmLogger } from "../logger/enhanced-logger";

export function initializeMCPTools(config: RootConfig): MCPToolRegistry {
  const registry = new MCPToolRegistry();

  llmLogger.info({
    event: "MCP_INITIALIZATION_START",
  }, `🔧 Initializing MCP tools`);

  // Get global tool config
  const globalToolConfig = config.tool_config || {};

  // Register Filesystem tool
  const filesystemConfig = (globalToolConfig.filesystem as any) || {};
  const filesystemTool = new FilesystemTool({
    workingDirectory: filesystemConfig.working_directory || process.cwd(),
    allowedExtensions: filesystemConfig.allowed_extensions,
  });
  registry.register(filesystemTool);

  // Register Web Search tool
  const webSearchConfig = (globalToolConfig.web_search as any) || {};
  const webSearchTool = new WebSearchTool({
    apiKey: webSearchConfig.api_key || process.env.GOOGLE_SEARCH_API_KEY,
    searchEngine: webSearchConfig.search_engine || "google",
  });
  registry.register(webSearchTool);

  // Register Code Execution tool
  const codeExecConfig = (globalToolConfig.code_execution as any) || {};
  const codeExecutionTool = new CodeExecutionTool({
    timeout: codeExecConfig.timeout || 5000,
    memory_limit: codeExecConfig.memory_limit || 16,
  });
  registry.register(codeExecutionTool);

  const registeredTools = registry.listTools();
  llmLogger.info({
    event: "MCP_INITIALIZATION_COMPLETE",
    toolCount: registeredTools.length,
    tools: registeredTools.map(t => t.name),
  }, `✅ MCP tools initialized: ${registeredTools.map(t => t.name).join(", ")}`);

  return registry;
}

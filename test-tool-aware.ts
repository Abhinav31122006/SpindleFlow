import { config } from "dotenv";
import { ToolAwareLLMProvider } from "./src/llm/tool-aware-provider";
import { GeminiProvider } from "./src/llm/gemini";
import { MCPToolRegistry } from "./src/mcp/registry";
import { initializeMCPTools } from "./src/mcp/initializer";

// Load environment variables
config();

async function testToolAware() {
  console.log("🔧 Testing ToolAwareLLMProvider...\n");

  // Initialize MCP tools
  const mcpRegistry = new MCPToolRegistry();
  await initializeMCPTools(mcpRegistry, {
    filesystem: {
      working_directory: "./workspace",
      allowed_extensions: [".txt", ".md", ".json"],
    },
    web_search: {
      search_engine: "google",
    },
    code_execution: {
      timeout: 10000,
      memory_limit: 16,
    },
  });

  // Create LLM providers
  const baseLLM = new GeminiProvider({
    model: "gemini-2.5-flash-lite",
    maxTokens: 8000,
  });

  const toolAwareLLM = new ToolAwareLLMProvider(baseLLM, mcpRegistry);

  // Get filesystem tool schema
  const filesystemTool = mcpRegistry.getTool("filesystem");
  if (!filesystemTool) {
    throw new Error("Filesystem tool not found");
  }

  const toolSchemas = [filesystemTool.getSchema()];

  console.log("📝 Available tools:");
  console.log(JSON.stringify(toolSchemas, null, 2));
  console.log("\n");

  // Test with a simple prompt that should trigger a tool call
  console.log("🤖 Asking LLM to write a file...\n");

  try {
    const result = await toolAwareLLM.generateWithTools({
      system: "You are a helpful assistant with access to filesystem tools.",
      user: "Write a file called test.txt with the content 'Hello from MCP tools!'",
      temperature: 0.2,
      tools: toolSchemas,
      maxToolCalls: 3,
    });

    console.log("✅ Result:");
    console.log("Output:", result.output);
    console.log("\nTool Calls:", result.toolCalls.length);
    result.toolCalls.forEach((tc, i) => {
      console.log(`  ${i + 1}. ${tc.toolName}:`, JSON.stringify(tc.parameters, null, 2));
    });
  } catch (error) {
    console.error("❌ Error:", error instanceof Error ? error.message : String(error));
  }
}

testToolAware().catch(console.error);

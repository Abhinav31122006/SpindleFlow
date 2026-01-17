Feature 2: MCP Tool Integration
Overview
Implement Model Context Protocol (MCP) tool integration following Claude Code's architecture, allowing agents to use external tools dynamically based on YAML configuration.
Minimum Requirement: 2-3 MCP-compliant tools
What is MCP?
Model Context Protocol is an open standard for connecting LLMs to external tools and data sources:

Standardized: Consistent interface across tools
Discoverable: Tools self-describe capabilities
Composable: Multiple tools can work together
Secure: Controlled access and permissions

Architecture
1. MCP Tool Schema
Create src/mcp/schema.ts:
typescriptimport { z } from 'zod';

export const MCPToolSchema = z.object({
  name: z.string(),
  description: z.string(),
  parameters: z.object({
    type: z.literal('object'),
    properties: z.record(z.any()),
    required: z.array(z.string()).optional()
  }),
  executor: z.enum([
    'filesystem',
    'web_search', 
    'code_execution',
    'database',
    'api_call',
    'custom'
  ])
});

export type MCPTool = z.infer<typeof MCPToolSchema>;

export interface MCPToolCall {
  toolName: string;
  parameters: Record<string, any>;
  timestamp: number;
}

export interface MCPToolResult {
  success: boolean;
  result?: any;
  error?: string;
  executionTime: number;
}
2. Built-in MCP Tools
Tool 1: Filesystem Operations
Create src/mcp/tools/filesystem.ts:
typescriptimport * as fs from 'fs/promises';
import * as path from 'path';

export class FilesystemTool {
  name = 'filesystem';
  description = 'Read, write, and manage files and directories';
  
  private workingDirectory: string;
  private allowedExtensions: string[];
  
  constructor(config: {
    workingDirectory?: string;
    allowedExtensions?: string[];
  }) {
    this.workingDirectory = config.workingDirectory || process.cwd();
    this.allowedExtensions = config.allowedExtensions || [
      '.txt', '.md', '.json', '.yml', '.yaml', '.js', '.ts'
    ];
  }
  
  getSchema(): MCPTool {
    return {
      name: 'filesystem',
      description: this.description,
      parameters: {
        type: 'object',
        properties: {
          operation: {
            type: 'string',
            enum: ['read', 'write', 'list', 'exists', 'delete'],
            description: 'Operation to perform'
          },
          path: {
            type: 'string',
            description: 'File or directory path'
          },
          content: {
            type: 'string',
            description: 'Content to write (for write operation)'
          }
        },
        required: ['operation', 'path']
      },
      executor: 'filesystem'
    };
  }
  
  async execute(params: {
    operation: 'read' | 'write' | 'list' | 'exists' | 'delete';
    path: string;
    content?: string;
  }): Promise<MCPToolResult> {
    const startTime = Date.now();
    
    try {
      // Security: Resolve and validate path
      const resolvedPath = path.resolve(this.workingDirectory, params.path);
      
      if (!resolvedPath.startsWith(this.workingDirectory)) {
        throw new Error('Path outside working directory');
      }
      
      const ext = path.extname(resolvedPath);
      if (params.operation !== 'list' && 
          !this.allowedExtensions.includes(ext)) {
        throw new Error(`File extension ${ext} not allowed`);
      }
      
      let result: any;
      
      switch (params.operation) {
        case 'read':
          result = await fs.readFile(resolvedPath, 'utf-8');
          break;
          
        case 'write':
          if (!params.content) {
            throw new Error('Content required for write operation');
          }
          await fs.writeFile(resolvedPath, params.content, 'utf-8');
          result = { written: true, path: resolvedPath };
          break;
          
        case 'list':
          const entries = await fs.readdir(resolvedPath, { withFileTypes: true });
          result = entries.map(e => ({
            name: e.name,
            type: e.isDirectory() ? 'directory' : 'file'
          }));
          break;
          
        case 'exists':
          try {
            await fs.access(resolvedPath);
            result = { exists: true };
          } catch {
            result = { exists: false };
          }
          break;
          
        case 'delete':
          await fs.unlink(resolvedPath);
          result = { deleted: true, path: resolvedPath };
          break;
      }
      
      return {
        success: true,
        result,
        executionTime: Date.now() - startTime
      };
      
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        executionTime: Date.now() - startTime
      };
    }
  }
}
Tool 2: Web Search
Create src/mcp/tools/web-search.ts:
typescriptimport fetch from 'node-fetch';

export class WebSearchTool {
  name = 'web_search';
  description = 'Search the web for information';
  
  private apiKey: string;
  private searchEngine: 'google' | 'bing' | 'duckduckgo';
  
  constructor(config: {
    apiKey: string;
    searchEngine?: 'google' | 'bing' | 'duckduckgo';
  }) {
    this.apiKey = config.apiKey;
    this.searchEngine = config.searchEngine || 'google';
  }
  
  getSchema(): MCPTool {
    return {
      name: 'web_search',
      description: this.description,
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Search query'
          },
          num_results: {
            type: 'number',
            description: 'Number of results to return',
            default: 5
          }
        },
        required: ['query']
      },
      executor: 'web_search'
    };
  }
  
  async execute(params: {
    query: string;
    num_results?: number;
  }): Promise<MCPToolResult> {
    const startTime = Date.now();
    const numResults = params.num_results || 5;
    
    try {
      let results: any[];
      
      switch (this.searchEngine) {
        case 'google':
          results = await this.googleSearch(params.query, numResults);
          break;
        case 'bing':
          results = await this.bingSearch(params.query, numResults);
          break;
        case 'duckduckgo':
          results = await this.duckduckgoSearch(params.query, numResults);
          break;
      }
      
      return {
        success: true,
        result: results,
        executionTime: Date.now() - startTime
      };
      
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        executionTime: Date.now() - startTime
      };
    }
  }
  
  private async googleSearch(query: string, num: number) {
    // Using Google Custom Search API
    const url = `https://www.googleapis.com/customsearch/v1?key=${this.apiKey}&q=${encodeURIComponent(query)}&num=${num}`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    return data.items?.map((item: any) => ({
      title: item.title,
      link: item.link,
      snippet: item.snippet
    })) || [];
  }
  
  private async bingSearch(query: string, num: number) {
    // Using Bing Search API
    const url = `https://api.bing.microsoft.com/v7.0/search?q=${encodeURIComponent(query)}&count=${num}`;
    
    const response = await fetch(url, {
      headers: { 'Ocp-Apim-Subscription-Key': this.apiKey }
    });
    const data = await response.json();
    
    return data.webPages?.value?.map((item: any) => ({
      title: item.name,
      link: item.url,
      snippet: item.snippet
    })) || [];
  }
  
  private async duckduckgoSearch(query: string, num: number) {
    // Using DuckDuckGo API (no key needed)
    const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    return data.RelatedTopics?.slice(0, num).map((item: any) => ({
      title: item.Text,
      link: item.FirstURL,
      snippet: item.Text
    })) || [];
  }
}
Tool 3: Code Execution (Sandboxed)
Create src/mcp/tools/code-execution.ts:
typescriptimport { VM } from 'vm2';

export class CodeExecutionTool {
  name = 'code_execution';
  description = 'Execute code in a sandboxed environment';
  
  private timeout: number;
  private allowedModules: string[];
  
  constructor(config: {
    timeout?: number;
    allowedModules?: string[];
  }) {
    this.timeout = config.timeout || 5000; // 5 seconds
    this.allowedModules = config.allowedModules || ['lodash', 'moment'];
  }
  
  getSchema(): MCPTool {
    return {
      name: 'code_execution',
      description: this.description,
      parameters: {
        type: 'object',
        properties: {
          language: {
            type: 'string',
            enum: ['javascript', 'python'],
            description: 'Programming language'
          },
          code: {
            type: 'string',
            description: 'Code to execute'
          }
        },
        required: ['language', 'code']
      },
      executor: 'code_execution'
    };
  }
  
  async execute(params: {
    language: 'javascript' | 'python';
    code: string;
  }): Promise<MCPToolResult> {
    const startTime = Date.now();
    
    try {
      if (params.language === 'javascript') {
        return await this.executeJavaScript(params.code);
      } else {
        return await this.executePython(params.code);
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        executionTime: Date.now() - startTime
      };
    }
  }
  
  private async executeJavaScript(code: string): Promise<MCPToolResult> {
    const startTime = Date.now();
    
    const vm = new VM({
      timeout: this.timeout,
      sandbox: {
        console: {
          log: (...args: any[]) => console.log('[Sandboxed]', ...args)
        }
      },
      require: {
        external: this.allowedModules,
        builtin: ['util', 'crypto']
      }
    });
    
    try {
      const result = vm.run(code);
      
      return {
        success: true,
        result: {
          output: result,
          stdout: []  // Could capture console.log calls
        },
        executionTime: Date.now() - startTime
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        executionTime: Date.now() - startTime
      };
    }
  }
  
  private async executePython(code: string): Promise<MCPToolResult> {
    // Would need python-shell or similar
    // For now, return not implemented
    return {
      success: false,
      error: 'Python execution not yet implemented',
      executionTime: 0
    };
  }
}
3. MCP Tool Registry
Create src/mcp/registry.ts:
typescriptexport class MCPToolRegistry {
  private tools = new Map<string, any>();
  
  register(tool: any): void {
    const schema = tool.getSchema();
    this.tools.set(schema.name, tool);
  }
  
  getTool(name: string): any | undefined {
    return this.tools.get(name);
  }
  
  listTools(): MCPTool[] {
    return Array.from(this.tools.values()).map(t => t.getSchema());
  }
  
  getToolsForAgent(toolNames: string[]): any[] {
    return toolNames
      .map(name => this.tools.get(name))
      .filter(Boolean);
  }
  
  async executeTool(
    toolName: string,
    parameters: Record<string, any>
  ): Promise<MCPToolResult> {
    const tool = this.tools.get(toolName);
    
    if (!tool) {
      return {
        success: false,
        error: `Tool ${toolName} not found`,
        executionTime: 0
      };
    }
    
    return await tool.execute(parameters);
  }
}
4. Tool-Aware LLM Provider
Create src/llm/tool-aware-provider.ts:
typescriptimport { LLMProvider, LLMGenerateParams } from './provider';
import { MCPToolRegistry } from '../mcp/registry';
import { MCPTool, MCPToolCall } from '../mcp/schema';

export interface ToolAwareLLMParams extends LLMGenerateParams {
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
        temperature: params.temperature
      });
      
      // Check if response contains tool calls
      const toolCall = this.parseToolCall(response);
      
      if (!toolCall) {
        // No tool call - this is the final response
        return { output: response, toolCalls };
      }
      
      // Execute tool
      console.log(`🔧 Executing tool: ${toolCall.toolName}`);
      const result = await this.toolRegistry.executeTool(
        toolCall.toolName,
        toolCall.parameters
      );
      
      toolCalls.push({
        ...toolCall,
        timestamp: Date.now()
      });
      
      // Add tool result to context
      currentPrompt = this.buildToolResultPrompt(
        currentPrompt,
        toolCall,
        result
      );
    }
    
    // Max iterations reached
    throw new Error('Max tool call iterations reached');
  }
  
  private buildToolPrompt(
    baseSystem: string,
    tools: MCPTool[]
  ): string {
    if (tools.length === 0) return baseSystem;
    
    let toolsSection = `\n\nYou have access to the following tools:\n\n`;
    
    for (const tool of tools) {
      toolsSection += `Tool: ${tool.name}\n`;
      toolsSection += `Description: ${tool.description}\n`;
      toolsSection += `Parameters: ${JSON.stringify(tool.parameters, null, 2)}\n`;
      toolsSection += `\n`;
    }
    
    toolsSection += `
To use a tool, respond with:
<tool_call>
{
  "tool": "tool_name",
  "parameters": { ... }
}
</tool_call>

Do not include any other text when making a tool call.
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
        parameters: parsed.parameters
      };
    } catch {
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

Based on this tool result, provide your response.`;
  }
}
5. YAML Configuration
Update agent schema to support tools:
yamlagents:
  - id: researcher
    role: Research Analyst
    goal: Research topics using web search
    tools:
      - web_search
      - filesystem
    tool_config:
      web_search:
        search_engine: google
        api_key: ${GOOGLE_SEARCH_API_KEY}
      filesystem:
        working_directory: ./workspace
        allowed_extensions: ['.txt', '.md', '.json']

  - id: coder
    role: Software Developer
    goal: Write and test code
    tools:
      - code_execution
      - filesystem
    tool_config:
      code_execution:
        timeout: 10000
        allowed_modules: ['lodash', 'moment', 'axios']
Implementation Strategy
Phase 1: MCP Infrastructure (Day 1-2)

Create MCP module structure

   src/mcp/
   ├── schema.ts
   ├── registry.ts
   ├── tools/
   │   ├── filesystem.ts
   │   ├── web-search.ts
   │   └── code-execution.ts
   └── __tests__/

Implement base classes

Tool interface
Registry
Result types


Add configuration support

Tool-specific configs
Environment variables
Validation



Phase 2: Built-in Tools (Day 3-5)

Filesystem tool

Implement CRUD operations
Add security checks
Test edge cases


Web search tool

Integrate search APIs
Handle rate limits
Format results


Code execution tool

Set up sandbox (vm2)
Add timeout protection
Capture output



Phase 3: LLM Integration (Day 6-7)

Tool-aware provider

Parse tool calls from LLM
Execute tools
Feed results back


Update orchestrators

typescript   // In sequential.ts
   if (agent.tools && agent.tools.length > 0) {
     const tools = toolRegistry.getToolsForAgent(agent.tools);
     const response = await toolAwareLLM.generateWithTools({
       ...prompt,
       tools: tools.map(t => t.getSchema())
     });
   }

Add tool call logging

Log each tool execution
Track success/failure
Save to timeline



Phase 4: Configuration & CLI (Day 8)

Update schema

typescript   export const AgentSchema = z.object({
     id: z.string().min(1),
     role: z.string().min(1),
     goal: z.string().min(1),
     tools: z.array(z.string()).optional(),  // NEW
     tool_config: z.record(z.any()).optional()  // NEW
   });

Add CLI flags

bash   npm run dev -- \
     --config configs/demo.yml \
     --input "Research AI trends" \
     --tool-config '{"web_search": {"api_key": "..."}}'
Phase 5: Testing & Documentation (Day 9-10)

Unit tests

Each tool independently
Registry operations
Error handling


Integration tests

End-to-end with LLM
Multi-tool workflows
Edge cases


Documentation

Tool usage guide
Configuration examples
Security best practices



Example Workflow
yaml# configs/demo-tools.yml
agents:
  - id: researcher
    role: Research Assistant
    goal: Research the topic and save findings to a file
    tools:
      - web_search
      - filesystem

workflow:
  type: sequential
  steps:
    - agent: researcher
Execution:

Agent receives goal: "Research AI trends"
LLM decides to use web_search tool
Tool executes, returns results
LLM processes results
LLM decides to save to file using filesystem tool
Tool writes file
LLM provides final summary

Output:
▶ Research Assistant
  🔧 Tool call: web_search
     Query: "AI trends 2024"
     Results: 5 articles found
  
  🔧 Tool call: filesystem  
     Operation: write
     Path: research/ai-trends.md
     ✓ File written

✓ Research Assistant completed
  Final output: "I've researched AI trends and saved findings to research/ai-trends.md..."
Benefits
✅ Extensible: Easy to add new tools
✅ Standardized: MCP protocol compliance
✅ Secure: Sandboxed execution
✅ Flexible: YAML configuration
✅ Auditable: Full tool call history
✅ Agent-specific: Each agent has its tools
File Structure
src/
├── mcp/
│   ├── schema.ts
│   ├── registry.ts
│   ├── tools/
│   │   ├── filesystem.ts
│   │   ├── web-search.ts
│   │   └── code-execution.ts
│   └── __tests__/
├── llm/
│   └── tool-aware-provider.ts
└── config/
    └── schema.ts  # Updated with tools

configs/
└── demo-tools.yml
Success Metrics

 3+ MCP tools implemented
 Tools callable from YAML config
 Successful tool execution rate >95%
 Security: no directory traversal vulnerabilities
 Performance: tool calls complete in <5s

Estimated Effort

Development: 8-10 days
Testing: 2-3 days
Documentation: 1-2 days
Total: ~2 weeks
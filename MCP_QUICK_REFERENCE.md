# MCP Tools - Quick Reference

## Available Tools

### 1. filesystem
**Operations:** read, write, list, exists, delete

**Example:**
```yaml
tools:
  - filesystem
tool_config:
  filesystem:
    working_directory: ./workspace
    allowed_extensions: [".txt", ".md", ".json"]
```

**Tool Call:**
```json
{
  "tool": "filesystem",
  "parameters": {
    "operation": "write",
    "path": "report.md",
    "content": "# My Report\n\nContent here..."
  }
}
```

### 2. web_search
**Search Engines:** google, bing, duckduckgo (default)

**Example:**
```yaml
tools:
  - web_search
tool_config:
  web_search:
    search_engine: duckduckgo
    # api_key: your_key  # Only for Google/Bing
```

**Tool Call:**
```json
{
  "tool": "web_search",
  "parameters": {
    "query": "AI trends 2026",
    "num_results": 5
  }
}
```

### 3. code_execution
**Languages:** javascript (python stub only)

**Example:**
```yaml
tools:
  - code_execution
tool_config:
  code_execution:
    timeout: 10000
    allowed_modules: ["lodash"]
```

**Tool Call:**
```json
{
  "tool": "code_execution",
  "parameters": {
    "language": "javascript",
    "code": "const sum = [1,2,3,4,5].reduce((a,b) => a+b, 0); console.log(sum); sum;"
  }
}
```

## Quick Test Commands

```bash
# Test code execution
npm run dev -- run configs/test-mcp-simple.yml -i "Calculate factorial of 10 using JavaScript"

# Test multi-tool workflow
npm run dev -- run configs/demo-mcp-tools.yml -i "Research quantum computing"

# Test with OpenAI
npm run dev -- run configs/demo-mcp-tools.yml -i "Analyze current market trends" --provider openai
```

## Tool Call Format

LLMs must respond with:
```xml
<tool_call>
{
  "tool": "tool_name",
  "parameters": { ... }
}
</tool_call>
```

After tool execution, LLM receives:
```xml
<tool_result>
Tool: tool_name
Parameters: {...}
Result: {...}
</tool_result>
```

## Configuration Template

```yaml
models:
  gemini:
    provider: gemini
    model: gemini-2.5-flash-lite
    max_tokens: 8000

provider: gemini

# Global tool configuration
tool_config:
  filesystem:
    working_directory: ./workspace
    allowed_extensions: [".txt", ".md", ".json"]
  web_search:
    search_engine: duckduckgo
  code_execution:
    timeout: 5000

agents:
  - id: my_agent
    role: "Multi-Tool Agent"
    goal: "Use multiple tools to accomplish tasks"
    tools:
      - web_search
      - filesystem
      - code_execution

workflow:
  type: sequential
  steps:
    - agent: my_agent
```

## Common Patterns

### Pattern 1: Research & Save
```yaml
agents:
  - id: researcher
    role: "Researcher"
    goal: "Research topic and save to file"
    tools:
      - web_search
      - filesystem
```

### Pattern 2: Code & Test
```yaml
agents:
  - id: developer
    role: "Developer"
    goal: "Write and test code"
    tools:
      - code_execution
      - filesystem
```

### Pattern 3: Read, Process, Write
```yaml
agents:
  - id: processor
    role: "Data Processor"
    goal: "Read data, process with code, save results"
    tools:
      - filesystem
      - code_execution
```

## Troubleshooting

**Tool not found:**
- Check tool name spelling in `tools:` array
- Verify tool is initialized in `src/mcp/initializer.ts`

**Path outside working directory:**
- Set `working_directory` in tool_config
- Use relative paths only

**Timeout error:**
- Increase `timeout` in code_execution config
- Simplify the code being executed

**Search results empty:**
- DuckDuckGo API has limitations
- Consider using Google/Bing with API key
- Check internet connectivity

## Security Notes

- ✅ Filesystem: Path traversal blocked, extension whitelist
- ✅ Code execution: Sandboxed VM, no network/filesystem access
- ✅ Web search: API key protection, rate limiting

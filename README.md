# 🌀 SpindleFlow

**Declarative YAML-driven multi-agent orchestration engine with MCP tool integration**

SpindleFlow enables you to define complex multi-agent workflows using simple YAML configurations. Agents can leverage external tools through the Model Context Protocol (MCP) to perform real-world tasks like file operations, web searches, and code execution.

## ✨ Features

- **🔀 Flexible Workflows:** Sequential and parallel agent execution
- **🔄 Feedback Loops:** Iterative refinement with reviewer approval
- **🧠 Context Management:** Intelligent summarization and context passing
- **🔧 MCP Tool Integration:** Built-in filesystem, web search, and code execution tools
- **🤖 Multi-Provider LLM:** Support for Google Gemini and OpenAI
- **📊 Visualization:** Execution graphs, context flow, and timing diagrams
- **⚡ Rate Limiting:** Built-in protection for API rate limits
- **📝 Comprehensive Logging:** Structured logging with Pino

## 🚀 Quick Start

### Installation

```bash
git clone https://github.com/devkhera24/SpindleFlow.git
cd SpindleFlow
npm install
```

### Configure API Keys

Create a `.env` file:

```env
GEMINI_API_KEY=your_gemini_api_key_here
OPENAI_API_KEY=your_openai_api_key_here  # Optional
```

### Run Your First Workflow

```bash
# Simple sequential workflow
npm run dev -- run configs/demo-sequential.yml -i "Research AI trends"

# Parallel workflow with aggregator
npm run dev -- run configs/demo-parallel.yml -i "Design a todo app"

# MCP tools workflow
npm run dev -- run configs/demo-mcp-tools.yml -i "Research quantum computing"
```

## 📦 MCP Tools

SpindleFlow includes three built-in MCP tools:

### 1. Filesystem Tool
Read, write, list, and manage files with security controls.

### 2. Web Search Tool
Search the web using Google, Bing, or DuckDuckGo.

### 3. Code Execution Tool
Execute JavaScript code in a sandboxed environment.

**Example configuration:**
```yaml
tool_config:
  filesystem:
    working_directory: ./workspace
  web_search:
    search_engine: duckduckgo
  code_execution:
    timeout: 5000

agents:
  - id: researcher
    role: "Research Agent"
    tools:
      - web_search
      - filesystem
```

See [MCP_IMPLEMENTATION.md](MCP_IMPLEMENTATION.md) for full documentation.

## 📖 Documentation

- **[MCP Implementation Guide](MCP_IMPLEMENTATION.md)** - Complete MCP tools documentation
- **[MCP Quick Reference](MCP_QUICK_REFERENCE.md)** - Tool usage examples
- **[Context Management](CONTEXT_MANAG.md)** - Context summarization strategy
- **[Feedback Loops](FEEDBACK_LOOP_IMPLEMENTATION.md)** - Iterative refinement guide

## 🛠️ Example Workflows

### Sequential Workflow
```yaml
workflow:
  type: sequential
  steps:
    - agent: researcher
    - agent: analyst
    - agent: writer
```

### Parallel Workflow with Feedback Loop
```yaml
workflow:
  type: parallel
  branches:
    - backend_dev
    - frontend_dev
  then:
    agent: reviewer
    feedback_loop:
      enabled: true
      max_iterations: 3
      approval_keyword: "APPROVED"
      feedback_targets: [backend_dev, frontend_dev]
```

## 🧪 Testing

```bash
# Build the project
npm run build

# Run tests
npm test  # Coming soon

# Run with different providers
npm run dev -- run configs/test-gemini-openai.yml -i "Your prompt"
```

## 🏗️ Project Structure

```
SpindleFlow/
├── src/
│   ├── mcp/              # MCP tool system
│   │   ├── tools/        # Built-in tools
│   │   ├── registry.ts   # Tool registry
│   │   └── schema.ts     # Tool types
│   ├── agents/           # Agent management
│   ├── config/           # Configuration schemas
│   ├── context/          # Context management
│   ├── llm/              # LLM providers
│   ├── orchestrator/     # Workflow execution
│   └── visualization/    # Graph generation
├── configs/              # Example configurations
└── output/               # Execution outputs
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

ISC License - see LICENSE file for details

## 🙏 Acknowledgments

- Built with TypeScript, Zod, and Pino
- Powered by Google Gemini and OpenAI APIs
- Inspired by Model Context Protocol (MCP) standards

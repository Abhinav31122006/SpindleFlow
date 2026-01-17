import ivm from "isolated-vm";
import { MCPTool, MCPToolResult } from "../schema";
import { MCPToolProvider } from "../registry";

export interface CodeExecutionToolConfig {
  timeout?: number;
  memory_limit?: number;
}

export class CodeExecutionTool implements MCPToolProvider {
  name = "code_execution";
  description = "Execute JavaScript code in a secure isolated V8 environment";

  private timeout: number;
  private memoryLimit: number;

  constructor(config: CodeExecutionToolConfig = {}) {
    this.timeout = config.timeout || 5000; // 5 seconds
    this.memoryLimit = config.memory_limit || 16; // 16MB
  }

  getSchema(): MCPTool {
    return {
      name: "code_execution",
      description: this.description,
      parameters: {
        type: "object",
        properties: {
          language: {
            type: "string",
            enum: ["javascript", "python"],
            description: "Programming language",
          },
          code: {
            type: "string",
            description: "Code to execute",
          },
        },
        required: ["language", "code"],
      },
      executor: "code_execution",
    };
  }

  async execute(params: {
    language: "javascript" | "python";
    code: string;
  }): Promise<MCPToolResult> {
    const startTime = Date.now();

    try {
      if (params.language === "javascript") {
        return await this.executeJavaScript(params.code);
      } else {
        return await this.executePython(params.code);
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        executionTime: Date.now() - startTime,
      };
    }
  }

  private async executeJavaScript(code: string): Promise<MCPToolResult> {
    const startTime = Date.now();
    
    // Create a new isolated V8 context
    const isolate = new ivm.Isolate({ memoryLimit: this.memoryLimit });
    
    try {
      const context = await isolate.createContext();
      const jail = context.global;
      
      const logs: string[] = [];
      
      // Set up a log function that can be called from the isolate
      await jail.set('$log', function(...args: any[]) {
        logs.push(args.map(arg => 
          typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
        ).join(' '));
      }, { reference: true });
      
      // Inject the bootstrap code to set up console
      await isolate.compileScript(`
        globalThis.console = {
          log: (...args) => $log.applyIgnored(undefined, args),
          error: (...args) => $log.applyIgnored(undefined, ['ERROR:', ...args]),
          warn: (...args) => $log.applyIgnored(undefined, ['WARN:', ...args]),
          info: (...args) => $log.applyIgnored(undefined, ['INFO:', ...args])
        };
      `).then(s => s.run(context));
      
      // Wrap user code in IIFE
      const wrappedCode = `
        (function() {
          ${code}
        })();
      `;
      
      // Compile and run the code with timeout
      const script = await isolate.compileScript(wrappedCode);
      const result = await script.run(context, { timeout: this.timeout });
      
      const executionTime = Date.now() - startTime;
      const heapStats = isolate.getHeapStatisticsSync();
      
      return {
        success: true,
        result: {
          returnValue: result,
          output: logs,
          language: "javascript",
          executionTime: executionTime,
          memoryUsedMB: (heapStats.used_heap_size / 1024 / 1024).toFixed(2)
        },
        executionTime: executionTime,
      };
      
    } catch (error: any) {
      const executionTime = Date.now() - startTime;
      
      // Handle specific error types
      let errorMessage = error.message || String(error);
      
      if (errorMessage.includes('timeout')) {
        errorMessage = `Code execution timed out after ${this.timeout}ms`;
      } else if (errorMessage.includes('memory')) {
        errorMessage = `Code exceeded memory limit of ${this.memoryLimit}MB`;
      }
      
      return {
        success: false,
        error: errorMessage,
        executionTime: executionTime,
      };
    } finally {
      // Always dispose of the isolate to free resources
      isolate.dispose();
    }
  }

  private async executePython(code: string): Promise<MCPToolResult> {
    // Python execution would require python-shell or similar
    // For now, return a simulated response
    return {
      success: false,
      error:
        "Python execution not yet implemented. Install python-shell package and configure Python runtime.",
      executionTime: 0,
    };
  }
}

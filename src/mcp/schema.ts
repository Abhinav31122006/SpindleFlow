import { z } from "zod";

export const MCPToolSchema = z.object({
  name: z.string(),
  description: z.string(),
  parameters: z.object({
    type: z.literal("object"),
    properties: z.record(z.string(), z.any()),
    required: z.array(z.string()).optional(),
  }),
  executor: z.enum([
    "filesystem",
    "web_search",
    "code_execution",
    "database",
    "api_call",
    "custom",
  ]),
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

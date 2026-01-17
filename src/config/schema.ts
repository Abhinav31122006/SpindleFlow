import { z } from "zod";
import { FeedbackLoopSchema } from "./feedback-schema";

export const AgentSchema = z.object({
  id: z.string().min(1),
  role: z.string().min(1),
  goal: z.string().min(1),
  tools: z.array(z.string()).optional(),
  mcpTools: z.array(z.string()).optional(),
  tool_config: z.record(z.string(), z.any()).optional(),
});

// Model configuration schema
export const ModelConfigSchema = z.object({
  provider: z.enum(["openai", "gemini"]),
  model: z.string().min(1),
  max_tokens: z.number().int().positive(),
});

export type ModelConfig = z.infer<typeof ModelConfigSchema>;

const SequentialWorkflowSchema = z.object({
  type: z.literal("sequential"),
  steps: z.array(
    z.object({
      agent: z.string().min(1),
    })
  ),
});

const ParallelWorkflowSchema = z.object({
  type: z.literal("parallel"),
  branches: z.array(z.string().min(1)).min(1),
  then: z.object({
    agent: z.string().min(1),
    feedback_loop: FeedbackLoopSchema.optional(),
  }),
});

export const WorkflowSchema = z.discriminatedUnion("type", [
  SequentialWorkflowSchema,
  ParallelWorkflowSchema,
]);

export const RootConfigSchema = z.object({
  models: z.record(z.string(), ModelConfigSchema),
  provider: z.string().min(1),
  agents: z.array(AgentSchema).min(1),
  workflow: WorkflowSchema,
  tool_config: z.record(z.string(), z.any()).optional(),
}).refine(
  (config) => config.provider in config.models,
  {
    message: "provider must reference an existing model in the models section",
    path: ["provider"],
  }
);

export type RootConfig = z.infer<typeof RootConfigSchema>;

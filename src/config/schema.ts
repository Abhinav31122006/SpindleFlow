import { z } from "zod";

export const AgentSchema = z.object({
  id: z.string({
    required_error: "Agent 'id' is required",
    invalid_type_error: "Agent 'id' must be a string"
  }).min(1, "Agent 'id' cannot be empty"),
  
  role: z.string({
    required_error: "Agent 'role' is required",
    invalid_type_error: "Agent 'role' must be a string"
  }).min(1, "Agent 'role' cannot be empty"),
  
  goal: z.string({
    required_error: "Agent 'goal' is required",
    invalid_type_error: "Agent 'goal' must be a string"
  }).min(1, "Agent 'goal' cannot be empty"),
  
  tools: z.array(z.string()).optional(),
});

const SequentialWorkflowSchema = z.object({
  type: z.literal("sequential", {
    errorMap: () => ({ message: "Workflow type must be 'sequential' for sequential workflows" })
  }),
  steps: z.array(
    z.object({
      agent: z.string({
        required_error: "Step 'agent' is required",
        invalid_type_error: "Step 'agent' must be a string (agent ID)"
      }).min(1, "Step 'agent' cannot be empty"),
    }),
    {
      required_error: "Sequential workflow must have a 'steps' array",
      invalid_type_error: "'steps' must be an array"
    }
  ).min(1, "Sequential workflow must have at least one step"),
});

const ParallelWorkflowSchema = z.object({
  type: z.literal("parallel", {
    errorMap: () => ({ message: "Workflow type must be 'parallel' for parallel workflows" })
  }),
  branches: z.array(
    z.string({
      invalid_type_error: "Branch must be a string (agent ID)"
    }).min(1, "Branch agent ID cannot be empty"),
    {
      required_error: "Parallel workflow must have a 'branches' array",
      invalid_type_error: "'branches' must be an array of agent IDs"
    }
  ).min(1, "Parallel workflow must have at least one branch"),
  
  then: z.object({
    agent: z.string({
      required_error: "Parallel workflow 'then' must have an 'agent' field",
      invalid_type_error: "'then.agent' must be a string (agent ID)"
    }).min(1, "'then.agent' cannot be empty"),
  }, {
    required_error: "Parallel workflow must have a 'then' field to specify the final aggregator agent"
  }),
});

export const WorkflowSchema = z.discriminatedUnion("type", [
  SequentialWorkflowSchema,
  ParallelWorkflowSchema,
], {
  errorMap: () => ({ 
    message: "Workflow must have a 'type' field that is either 'sequential' or 'parallel'" 
  })
});

export const RootConfigSchema = z.object({
  agents: z.array(AgentSchema, {
    required_error: "Configuration must have an 'agents' array",
    invalid_type_error: "'agents' must be an array"
  }).min(1, "Configuration must define at least one agent"),
  
  workflow: WorkflowSchema,
}, {
  required_error: "Configuration must be an object with 'agents' and 'workflow' fields"
});

export type RootConfig = z.infer<typeof RootConfigSchema>;

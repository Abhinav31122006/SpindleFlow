"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RootConfigSchema = exports.WorkflowSchema = exports.AgentSchema = void 0;
var zod_1 = require("zod");
exports.AgentSchema = zod_1.z.object({
    id: zod_1.z.string().min(1),
    role: zod_1.z.string().min(1),
    goal: zod_1.z.string().min(1),
    tools: zod_1.z.array(zod_1.z.string()).optional(),
});
var SequentialWorkflowSchema = zod_1.z.object({
    type: zod_1.z.literal("sequential"),
    steps: zod_1.z.array(zod_1.z.object({
        agent: zod_1.z.string().min(1),
    })),
});
var ParallelWorkflowSchema = zod_1.z.object({
    type: zod_1.z.literal("parallel"),
    branches: zod_1.z.array(zod_1.z.string().min(1)).min(1),
    then: zod_1.z.object({
        agent: zod_1.z.string().min(1),
    }),
});
exports.WorkflowSchema = zod_1.z.discriminatedUnion("type", [
    SequentialWorkflowSchema,
    ParallelWorkflowSchema,
]);
exports.RootConfigSchema = zod_1.z.object({
    agents: zod_1.z.array(exports.AgentSchema).min(1),
    workflow: exports.WorkflowSchema,
});

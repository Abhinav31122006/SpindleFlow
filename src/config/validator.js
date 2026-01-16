"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateSemantics = validateSemantics;
function validateSemantics(config) {
    var agentIds = new Set();
    for (var _i = 0, _a = config.agents; _i < _a.length; _i++) {
        var agent = _a[_i];
        if (agentIds.has(agent.id)) {
            throw new Error("Duplicate agent id: ".concat(agent.id));
        }
        agentIds.add(agent.id);
    }
    var assertAgentExists = function (id) {
        if (!agentIds.has(id)) {
            throw new Error("Workflow references unknown agent: ".concat(id));
        }
    };
    if (config.workflow.type === "sequential") {
        config.workflow.steps.forEach(function (step) {
            return assertAgentExists(step.agent);
        });
    }
    if (config.workflow.type === "parallel") {
        config.workflow.branches.forEach(assertAgentExists);
        assertAgentExists(config.workflow.then.agent);
    }
}

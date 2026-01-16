"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentRegistry = void 0;
var AgentRegistry = /** @class */ (function () {
    function AgentRegistry(config) {
        this.agents = new Map();
        for (var _i = 0, _a = config.agents; _i < _a.length; _i++) {
            var agent = _a[_i];
            this.agents.set(agent.id, {
                id: agent.id,
                role: agent.role,
                goal: agent.goal,
                tools: agent.tools,
            });
        }
    }
    AgentRegistry.prototype.getAgent = function (id) {
        var agent = this.agents.get(id);
        if (!agent) {
            throw new Error("Agent not found in registry: ".concat(id));
        }
        return agent;
    };
    AgentRegistry.prototype.listAgents = function () {
        return Array.from(this.agents.values());
    };
    return AgentRegistry;
}());
exports.AgentRegistry = AgentRegistry;

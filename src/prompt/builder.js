"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildPrompt = buildPrompt;
function buildPrompt(agent, context) {
    var systemPrompt = "\nYou are acting as: ".concat(agent.role, "\n\nYour goal:\n").concat(agent.goal, "\n\nFollow the goal strictly. Be concise, clear, and relevant.\n").trim();
    var userPrompt = "User input:\n".concat(context.userInput, "\n");
    if (context.timeline.length > 0) {
        userPrompt += "\nPrevious agent outputs:\n";
        for (var _i = 0, _a = context.timeline; _i < _a.length; _i++) {
            var entry = _a[_i];
            userPrompt += "\n--- ".concat(entry.role, " (").concat(entry.agentId, ") ---\n").concat(entry.output, "\n");
        }
    }
    return {
        system: systemPrompt,
        user: userPrompt.trim(),
    };
}

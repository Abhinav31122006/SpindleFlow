"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.printWorkflowStart = printWorkflowStart;
exports.printAgentStart = printAgentStart;
exports.printAgentComplete = printAgentComplete;
exports.printParallelStart = printParallelStart;
exports.printParallelComplete = printParallelComplete;
exports.printAggregatorStart = printAggregatorStart;
exports.printFinalOutput = printFinalOutput;
exports.printExecutionSummary = printExecutionSummary;
exports.printError = printError;
// Color codes for terminal output
var colors = {
    reset: "\x1b[0m",
    bright: "\x1b[1m",
    dim: "\x1b[2m",
    cyan: "\x1b[36m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    blue: "\x1b[34m",
    magenta: "\x1b[35m",
    gray: "\x1b[90m",
};
function printWorkflowStart(userInput) {
    console.log("\n" + "=".repeat(60));
    console.log("".concat(colors.bright).concat(colors.cyan, "\uD83D\uDE80 Starting Workflow Execution").concat(colors.reset));
    console.log("=".repeat(60));
    if (userInput) {
        console.log("".concat(colors.dim, "User Input: ").concat(colors.reset).concat(userInput));
    }
    console.log();
}
function printAgentStart(agentId, role) {
    console.log("".concat(colors.yellow, "\u25B6").concat(colors.reset, " ").concat(colors.bright).concat(role).concat(colors.reset, " ").concat(colors.gray, "(").concat(agentId, ")").concat(colors.reset));
    console.log("".concat(colors.gray, "  Executing...").concat(colors.reset));
}
function printAgentComplete(entry) {
    var duration = entry.endedAt - entry.startedAt;
    console.log("".concat(colors.green, "\u2713").concat(colors.reset, " ").concat(colors.bright).concat(entry.role).concat(colors.reset, " ").concat(colors.gray, "completed in ").concat(duration, "ms").concat(colors.reset));
    console.log();
    console.log("".concat(colors.dim, "Output:").concat(colors.reset));
    console.log(formatOutput(entry.output));
    console.log();
}
function printParallelStart(branches) {
    console.log("".concat(colors.magenta, "\u26A1").concat(colors.reset, " ").concat(colors.bright, "Parallel Execution").concat(colors.reset, " ").concat(colors.gray, "(").concat(branches.length, " branches)").concat(colors.reset));
    console.log("".concat(colors.gray, "  Running: ").concat(branches.join(", ")).concat(colors.reset));
    console.log();
}
function printParallelComplete(count, totalTime) {
    console.log("".concat(colors.green, "\u2713").concat(colors.reset, " ").concat(colors.bright, "Parallel branches completed").concat(colors.reset, " ").concat(colors.gray, "(").concat(count, " agents in ").concat(totalTime, "ms)").concat(colors.reset));
    console.log();
}
function printAggregatorStart(agentId, role) {
    console.log("".concat(colors.blue, "\u25C6").concat(colors.reset, " ").concat(colors.bright, "Aggregator: ").concat(role).concat(colors.reset, " ").concat(colors.gray, "(").concat(agentId, ")").concat(colors.reset));
    console.log("".concat(colors.gray, "  Consolidating results...").concat(colors.reset));
}
function printFinalOutput(context) {
    var last = context.timeline[context.timeline.length - 1];
    console.log("\n" + "=".repeat(60));
    console.log("".concat(colors.bright).concat(colors.green, "\u2728 Final Output").concat(colors.reset));
    console.log("=".repeat(60));
    console.log();
    if (last) {
        console.log(last.output);
    }
    else {
        console.log("No output generated.");
    }
    console.log();
    printExecutionSummary(context);
}
function printExecutionSummary(context) {
    console.log("─".repeat(60));
    console.log("".concat(colors.bright, "Execution Summary").concat(colors.reset));
    console.log("─".repeat(60));
    if (context.timeline.length === 0) {
        console.log("No agents executed.");
        return;
    }
    var totalTime = context.timeline[context.timeline.length - 1].endedAt -
        context.timeline[0].startedAt;
    console.log("".concat(colors.dim, "Total Agents:").concat(colors.reset, " ").concat(context.timeline.length));
    console.log("".concat(colors.dim, "Total Time:").concat(colors.reset, " ").concat(totalTime, "ms"));
    console.log();
    console.log("".concat(colors.dim, "Execution Timeline:").concat(colors.reset));
    for (var _i = 0, _a = context.timeline; _i < _a.length; _i++) {
        var entry = _a[_i];
        var duration = entry.endedAt - entry.startedAt;
        console.log("  ".concat(colors.gray, "\u2022").concat(colors.reset, " ").concat(entry.role, " ").concat(colors.gray, "(").concat(duration, "ms)").concat(colors.reset));
    }
    console.log();
}
function printError(error, context) {
    console.error("\n".concat(colors.bright, "\u001B[31m\u274C Error").concat(colors.reset));
    if (context) {
        console.error("".concat(colors.dim, "Context: ").concat(context).concat(colors.reset));
    }
    console.error("".concat(colors.dim, "Message:").concat(colors.reset, " ").concat(error.message));
    if (error.stack) {
        console.error("\n".concat(colors.gray).concat(error.stack).concat(colors.reset));
    }
    console.error();
}
function formatOutput(output) {
    // Indent output for better readability
    return output
        .split("\n")
        .map(function (line) { return "  ".concat(line); })
        .join("\n");
}

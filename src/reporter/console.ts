import * as fs from "fs";
import * as path from "path";
import { ContextStore, TimelineEntry } from "../context/store";
import { writeLogsToFile } from "../logger/enhanced-logger";

// Color codes for terminal output
const colors = {
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

// Output directory
const OUTPUT_DIR = "output";

// Ensure output directory exists
function ensureOutputDir() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
}

// Generate timestamp for filenames
function getTimestamp(): string {
  const now = new Date();
  return now.toISOString().replace(/[:.]/g, "-").slice(0, -5);
}

// Write agent output to file
function writeAgentOutput(agentId: string, role: string, output: string, index: number) {
  ensureOutputDir();
  const filename = path.join(OUTPUT_DIR, `${index + 1}_${agentId}_${role.replace(/\s+/g, "_")}.txt`);
  
  const content = `
${"=".repeat(80)}
Agent: ${role} (${agentId})
Step: ${index + 1}
Time: ${new Date().toISOString()}
${"=".repeat(80)}

${output}

${"=".repeat(80)}
`.trim();

  fs.writeFileSync(filename, content, "utf-8");
  return filename;
}

// Write final output to file
function writeFinalOutput(context: ContextStore) {
  ensureOutputDir();
  const last = context.timeline[context.timeline.length - 1];
  const filename = path.join(OUTPUT_DIR, `FINAL_OUTPUT.txt`);
  
  let content = `
${"=".repeat(80)}
FINAL OUTPUT
Generated: ${new Date().toISOString()}
${"=".repeat(80)}

`;

  if (last) {
    content += last.output;
  } else {
    content += "No output generated.";
  }

  content += `

${"=".repeat(80)}
EXECUTION SUMMARY
${"=".repeat(80)}

`;

  if (context.timeline.length > 0) {
    const totalTime = context.timeline[context.timeline.length - 1].endedAt - 
                      context.timeline[0].startedAt;

    content += `Total Agents: ${context.timeline.length}\n`;
    content += `Total Time: ${totalTime}ms\n\n`;
    content += `Execution Timeline:\n`;
    
    for (const entry of context.timeline) {
      const duration = entry.endedAt - entry.startedAt;
      content += `  • ${entry.role} (${entry.agentId}) - ${duration}ms\n`;
    }
  } else {
    content += "No agents executed.\n";
  }

  fs.writeFileSync(filename, content.trim(), "utf-8");
  return filename;
}

// Write execution summary with detailed logs
function writeExecutionSummary(context: ContextStore) {
  ensureOutputDir();
  const filename = path.join(OUTPUT_DIR, `EXECUTION_SUMMARY.txt`);
  
  let content = `
${"=".repeat(80)}
EXECUTION SUMMARY
Generated: ${new Date().toISOString()}
${"=".repeat(80)}

`;

  if (context.timeline.length === 0) {
    content += "No agents executed.\n";
  } else {
    const totalTime = context.timeline[context.timeline.length - 1].endedAt - 
                      context.timeline[0].startedAt;

    content += `Total Agents Executed: ${context.timeline.length}\n`;
    content += `Total Execution Time: ${totalTime}ms\n`;
    content += `User Input: ${context.userInput}\n\n`;

    content += `${"=".repeat(80)}\n`;
    content += `DETAILED TIMELINE\n`;
    content += `${"=".repeat(80)}\n\n`;

    for (let i = 0; i < context.timeline.length; i++) {
      const entry = context.timeline[i];
      const duration = entry.endedAt - entry.startedAt;
      
      content += `${"-".repeat(80)}\n`;
      content += `Step ${i + 1}: ${entry.role} (${entry.agentId})\n`;
      content += `Duration: ${duration}ms\n`;
      content += `Started: ${new Date(entry.startedAt).toISOString()}\n`;
      content += `Ended: ${new Date(entry.endedAt).toISOString()}\n`;
      content += `${"-".repeat(80)}\n`;
      content += `Output:\n${entry.output}\n\n`;
    }
  }

  fs.writeFileSync(filename, content.trim(), "utf-8");
  
  // Also write detailed execution logs to a separate file
  const logFile = writeLogsToFile();
  
  return { summaryFile: filename, logFile };
}

export function printWorkflowStart(userInput: string) {
  console.log("\n" + "═".repeat(80));
  console.log(`${colors.bright}${colors.cyan}🚀 WORKFLOW EXECUTION${colors.reset}`);
  console.log("═".repeat(80));
  if (userInput) {
    console.log(`${colors.dim}User Input: ${colors.reset}${userInput}`);
  }
  console.log(`${colors.dim}Output will be saved to: ${colors.reset}${colors.green}./${OUTPUT_DIR}/${colors.reset}`);
  console.log();
  console.log(`${colors.bright}${colors.yellow}┌─ EXECUTION STEPS ─────────────────────────────────────────────────────────┐${colors.reset}`);
  console.log();
}

export function printAgentStart(agentId: string, role: string) {
  console.log(`  ${colors.yellow}▶${colors.reset} ${colors.bright}${role}${colors.reset} ${colors.gray}(${agentId})${colors.reset}`);
  console.log(`    ${colors.dim}Processing...${colors.reset}`);
}

export function printAgentComplete(entry: TimelineEntry) {
  const duration = entry.endedAt - entry.startedAt;
  console.log(`  ${colors.green}✓${colors.reset} ${colors.bright}${entry.role}${colors.reset} ${colors.dim}completed in ${duration}ms${colors.reset}`);
}

// New function to save agent output and print confirmation
export function saveAgentOutput(entry: TimelineEntry, stepIndex: number) {
  const filename = writeAgentOutput(entry.agentId, entry.role, entry.output, stepIndex);
  console.log(`    ${colors.dim}💾 Saved to: ${colors.reset}${colors.cyan}${filename}${colors.reset}`);
}

// Print agent output in dedicated section
export function printAgentOutput(entry: TimelineEntry, stepIndex: number) {
  console.log(`  ${colors.bright}${colors.magenta}Agent ${stepIndex + 1}: ${entry.role}${colors.reset} ${colors.gray}(${entry.agentId})${colors.reset}`);
  console.log(`  ${colors.dim}${"-".repeat(76)}${colors.reset}`);
  
  // Show first 200 chars of output
  const preview = entry.output.substring(0, 200).trim();
  const lines = preview.split('\n');
  for (const line of lines) {
    console.log(`  ${colors.gray}${line}${colors.reset}`);
  }
  
  if (entry.output.length > 200) {
    console.log(`  ${colors.dim}... (truncated, see full output in file)${colors.reset}`);
  }
  
  const filename = writeAgentOutput(entry.agentId, entry.role, entry.output, stepIndex);
  console.log(`  ${colors.dim}💾 Full output: ${colors.reset}${colors.cyan}${filename}${colors.reset}`);
  console.log();
}

export function printParallelStart(branches: string[]) {
  console.log(`  ${colors.magenta}⚡${colors.reset} ${colors.bright}Parallel Execution${colors.reset} ${colors.gray}(${branches.length} branches)${colors.reset}`);
  console.log(`    ${colors.dim}Running: ${branches.join(", ")}${colors.reset}`);
  console.log();
}

export function printParallelComplete(count: number, totalTime: number) {
  console.log(`  ${colors.green}✓${colors.reset} ${colors.bright}Parallel branches completed${colors.reset} ${colors.dim}(${count} agents in ${totalTime}ms)${colors.reset}`);
  console.log();
}

export function printAggregatorStart(agentId: string, role: string) {
  console.log(`  ${colors.blue}◆${colors.reset} ${colors.bright}Aggregator: ${role}${colors.reset} ${colors.gray}(${agentId})${colors.reset}`);
  console.log(`    ${colors.dim}Consolidating results...${colors.reset}`);
}

export function printFinalOutput(context: ContextStore) {
  const last = context.timeline[context.timeline.length - 1];

  // Close execution steps section
  console.log();
  console.log(`${colors.bright}${colors.yellow}└───────────────────────────────────────────────────────────────────────────┘${colors.reset}`);
  console.log();

  // Start agent outputs section
  console.log(`${colors.bright}${colors.magenta}┌─ AGENT OUTPUTS ───────────────────────────────────────────────────────────┐${colors.reset}`);
  console.log();
  
  // Print each agent's output
  for (let i = 0; i < context.timeline.length; i++) {
    printAgentOutput(context.timeline[i], i);
  }
  
  console.log(`${colors.bright}${colors.magenta}└───────────────────────────────────────────────────────────────────────────┘${colors.reset}`);
  console.log();

  // Start final output section
  console.log(`${colors.bright}${colors.green}┌─ FINAL OUTPUT ────────────────────────────────────────────────────────────┐${colors.reset}`);
  console.log();

  if (last) {
    // Print preview only
    const preview = last.output.substring(0, 300).trim();
    const lines = preview.split('\n');
    for (const line of lines) {
      console.log(`  ${line}`);
    }
    if (last.output.length > 300) {
      console.log(`  ${colors.dim}... (truncated, see full output in file)${colors.reset}`);
    }
  } else {
    console.log(`  ${colors.dim}No output generated.${colors.reset}`);
  }

  console.log();
  
  // Save all outputs
  const finalFile = writeFinalOutput(context);
  const { summaryFile, logFile } = writeExecutionSummary(context);
  
  console.log(`  ${colors.bright}${colors.cyan}📁 Output Files:${colors.reset}`);
  console.log(`    ${colors.green}✓${colors.reset} Final Output: ${colors.cyan}${finalFile}${colors.reset}`);
  console.log(`    ${colors.green}✓${colors.reset} Execution Summary: ${colors.cyan}${summaryFile}${colors.reset}`);
  console.log(`    ${colors.green}✓${colors.reset} Execution Logs: ${colors.cyan}${logFile}${colors.reset}`);
  console.log(`    ${colors.green}✓${colors.reset} Individual Agents: ${colors.cyan}${OUTPUT_DIR}/[1-N]_*.txt${colors.reset}`);
  console.log();
  
  console.log(`${colors.bright}${colors.green}└───────────────────────────────────────────────────────────────────────────┘${colors.reset}`);
  console.log();
  
  printExecutionSummary(context);
}

export function printExecutionSummary(context: ContextStore) {
  console.log(`${colors.bright}${colors.cyan}┌─ EXECUTION SUMMARY ───────────────────────────────────────────────────────┐${colors.reset}`);
  console.log();

  if (context.timeline.length === 0) {
    console.log(`  ${colors.dim}No agents executed.${colors.reset}`);
    console.log();
    console.log(`${colors.bright}${colors.cyan}└───────────────────────────────────────────────────────────────────────────┘${colors.reset}`);
    return;
  }

  const totalTime = context.timeline[context.timeline.length - 1].endedAt - 
                    context.timeline[0].startedAt;

  console.log(`  ${colors.dim}Total Agents:${colors.reset} ${context.timeline.length}`);
  console.log(`  ${colors.dim}Total Time:${colors.reset} ${totalTime}ms`);
  console.log();

  console.log(`  ${colors.dim}Execution Timeline:${colors.reset}`);
  for (const entry of context.timeline) {
    const duration = entry.endedAt - entry.startedAt;
    console.log(`    ${colors.gray}•${colors.reset} ${entry.role} ${colors.gray}(${duration}ms)${colors.reset}`);
  }

  console.log();
  console.log(`  ${colors.bright}${colors.green}👉 Check the ${colors.cyan}${OUTPUT_DIR}/${colors.green} folder for complete outputs!${colors.reset}`);
  console.log();
  console.log(`${colors.bright}${colors.cyan}└───────────────────────────────────────────────────────────────────────────┘${colors.reset}`);
  console.log("\n" + "═".repeat(80));
}

export function printError(error: Error, context?: string) {
  console.error(`\n${colors.bright}\x1b[31m❌ Error${colors.reset}`);
  if (context) {
    console.error(`${colors.dim}Context: ${context}${colors.reset}`);
  }
  console.error(`${colors.dim}Message:${colors.reset} ${error.message}`);
  if (error.stack) {
    console.error(`\n${colors.gray}${error.stack}${colors.reset}`);
  }
  console.error();
}

function formatOutput(output: string): string {
  // Indent output for better readability
  return output
    .split("\n")
    .map(line => `  ${line}`)
    .join("\n");
}
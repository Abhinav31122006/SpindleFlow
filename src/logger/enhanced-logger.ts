import pino from "pino";
import * as fs from "fs";
import * as path from "path";
import { Transform } from "stream";

// Log buffer to store all logs for later writing to file
let logBuffer: string[] = [];

// Create output directory if needed
const OUTPUT_DIR = "output";
function ensureOutputDir() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
}

// Create a transform stream to capture logs
class LogCaptureStream extends Transform {
  constructor() {
    super();
  }

  _transform(chunk: any, encoding: string, callback: Function) {
    const logLine = chunk.toString();
    // Store raw log line (with colors for console, will clean later for file)
    logBuffer.push(logLine);
    this.push(chunk);
    callback();
  }
}

const logCapture = new LogCaptureStream();

// Create a custom logger with enhanced formatting and log capturing
export const logger = pino({
  level: process.env.LOG_LEVEL || "trace", // trace is the most detailed level
}, pino.multistream([
  { stream: pino.transport({
    target: "pino-pretty",
    options: {
      colorize: true,
      translateTime: "HH:MM:ss.l",
      ignore: "pid,hostname",
      messageFormat: "{levelLabel} {msg}",
    },
  }) },
  { stream: logCapture }
]));

// Format log entry for file storage (without ANSI colors)
function stripAnsiColors(str: string): string {
  // Remove ANSI color codes
  return str.replace(/\x1B\[[0-9;]*[mK]/g, '');
}

// Parse and format JSON log entry to human-readable format
function formatLogEntry(jsonStr: string): string {
  try {
    const log = JSON.parse(jsonStr);
    
    // Extract timestamp
    const timestamp = log.time ? new Date(log.time).toISOString() : new Date().toISOString();
    
    // Map level number to name
    const levelMap: { [key: number]: string } = {
      10: 'TRACE',
      20: 'DEBUG',
      30: 'INFO',
      40: 'WARN',
      50: 'ERROR',
      60: 'FATAL'
    };
    const level = levelMap[log.level] || 'INFO';
    
    // Extract component
    const component = log.component ? `[${log.component}]` : '';
    
    // Extract message
    const msg = log.msg || '';
    
    // Build header line
    let output = `[${timestamp}] ${level.padEnd(5)} ${component.padEnd(15)} ${msg}\n`;
    
    // Add key details (exclude system fields)
    const excludeFields = ['level', 'time', 'pid', 'hostname', 'component', 'msg'];
    const details = Object.entries(log)
      .filter(([key]) => !excludeFields.includes(key))
      .map(([key, val]) => {
        // Format the value
        let formattedVal: string;
        if (typeof val === 'string') {
          // Truncate long strings
          formattedVal = val.length > 200 ? val.substring(0, 200) + '...' : val;
        } else if (typeof val === 'object' && val !== null) {
          // Pretty print objects, but truncate if too large
          const jsonStr = JSON.stringify(val, null, 2);
          formattedVal = jsonStr.length > 500 ? jsonStr.substring(0, 500) + '...' : jsonStr;
        } else {
          formattedVal = String(val);
        }
        
        return `  ${key}: ${formattedVal}`;
      });
    
    if (details.length > 0) {
      output += details.join('\n') + '\n';
    }
    
    return output;
  } catch (e) {
    // If parsing fails, return the original string without colors
    return stripAnsiColors(jsonStr);
  }
}

// Export function to write logs to file
export function writeLogsToFile() {
  ensureOutputDir();
  const logFile = path.join(OUTPUT_DIR, "EXECUTION_LOGS.txt");
  
  // Format each log entry
  const formattedLogs = logBuffer.map(logLine => {
    const cleanLine = stripAnsiColors(logLine).trim();
    if (!cleanLine || cleanLine.length === 0) return '';
    return formatLogEntry(cleanLine);
  }).filter(line => line.length > 0);
  
  const content = `
${"=".repeat(80)}
DETAILED EXECUTION LOGS
Generated: ${new Date().toISOString()}
${"=".repeat(80)}

${formattedLogs.join('\n')}

${"=".repeat(80)}
`.trim();

  fs.writeFileSync(logFile, content, "utf-8");
  return logFile;
}

// Export function to clear logs (for new runs)
export function clearLogBuffer() {
  logBuffer = [];
}

// Specialized loggers for different components
export const configLogger = logger.child({ component: "CONFIG" });
export const agentLogger = logger.child({ component: "AGENT" });
export const contextLogger = logger.child({ component: "CONTEXT" });
export const llmLogger = logger.child({ component: "LLM" });
export const orchestratorLogger = logger.child({ component: "ORCHESTRATOR" });
export const promptLogger = logger.child({ component: "PROMPT" });
export const rateLimitLogger = logger.child({ component: "RATE_LIMITER" });

// Helper functions for structured logging
export function logDataTransfer(
  from: string,
  to: string,
  data: any,
  transferType: "explicit" | "implicit"
) {
  contextLogger.info({
    event: "DATA_TRANSFER",
    transferType,
    from,
    to,
    dataSize: JSON.stringify(data).length,
    dataPreview: truncateData(data, 200),
    fullData: data,
  }, `📦 Data ${transferType} transfer: ${from} → ${to}`);
}

export function logAgentExecution(
  agentId: string,
  role: string,
  phase: "START" | "PROCESSING" | "COMPLETE" | "ERROR",
  details?: any
) {
  const emoji = {
    START: "▶️",
    PROCESSING: "⚙️",
    COMPLETE: "✅",
    ERROR: "❌",
  }[phase];

  agentLogger.info({
    event: "AGENT_EXECUTION",
    phase,
    agentId,
    role,
    timestamp: Date.now(),
    ...details,
  }, `${emoji} Agent ${agentId} (${role}): ${phase}`);
}

export function logPromptConstruction(
  agentId: string,
  systemPrompt: string,
  userPrompt: string,
  contextUsed: any
) {
  promptLogger.debug({
    event: "PROMPT_CONSTRUCTION",
    agentId,
    systemPromptLength: systemPrompt.length,
    userPromptLength: userPrompt.length,
    systemPrompt,
    userPrompt,
    contextUsed,
  }, `📝 Constructed prompt for ${agentId}`);
}

export function logLLMCall(
  provider: string,
  agentId: string,
  params: any,
  phase: "REQUEST" | "RESPONSE" | "ERROR"
) {
  llmLogger.info({
    event: "LLM_CALL",
    phase,
    provider,
    agentId,
    timestamp: Date.now(),
    ...params,
  }, `🤖 LLM ${phase} for ${agentId}`);
}

export function logContextUpdate(
  operation: string,
  agentId: string,
  before: any,
  after: any
) {
  contextLogger.debug({
    event: "CONTEXT_UPDATE",
    operation,
    agentId,
    changeDetected: JSON.stringify(before) !== JSON.stringify(after),
    before: truncateData(before, 500),
    after: truncateData(after, 500),
    fullBefore: before,
    fullAfter: after,
  }, `🔄 Context updated by ${operation} (${agentId})`);
}

export function logRateLimit(
  action: "WAIT" | "PROCEED" | "CHECK",
  details: any
) {
  rateLimitLogger.info({
    event: "RATE_LIMIT",
    action,
    ...details,
  }, `⏱️ Rate limit ${action}`);
}

// Helper to truncate large data for preview
function truncateData(data: any, maxLength: number): string {
  const str = JSON.stringify(data, null, 2);
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength) + "... [truncated]";
}
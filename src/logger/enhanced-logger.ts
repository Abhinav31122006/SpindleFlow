import pino from "pino";

// Create a custom logger with console output only
// Use pino-pretty transport, but handle cases where it might not load properly
let transport;
try {
  transport = pino.transport({
    target: "pino-pretty",
    options: {
      colorize: true,
      translateTime: "HH:MM:ss.l",
      ignore: "pid,hostname",
      messageFormat: "{levelLabel} {msg}",
    },
  });
} catch (error) {
  // Fallback to basic console output if pino-pretty fails to load
  transport = undefined;
}

export const logger = transport 
  ? pino({ level: process.env.LOG_LEVEL || "trace" }, transport)
  : pino({ 
      level: process.env.LOG_LEVEL || "trace",
      transport: {
        target: "pino/file",
        options: { destination: 1 } // stdout
      }
    });



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
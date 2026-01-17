import { LLMProvider } from "../llm/provider";
import { ContextSummary } from "./types";
import { contextLogger } from "../logger/enhanced-logger";

const SUMMARIZATION_PROMPT_TEMPLATE = (role: string, output: string) => `
Extract key information from the following agent output:

Agent Role: ${role}
Output: ${output}

Provide a structured summary in the following JSON format:
{
  "keyInsights": ["insight1", "insight2", "insight3"],
  "decisions": ["decision1", "decision2"],
  "artifacts": ["artifact1", "artifact2"],
  "nextSteps": ["step1", "step2"]
}

Guidelines:
- keyInsights: 3-5 most important findings or observations
- decisions: Key decisions or choices made
- artifacts: Files, outputs, or deliverables created (if any)
- nextSteps: Recommendations or suggestions for subsequent work

Keep the entire summary under 250 words. Focus on actionable and relevant information.
Return ONLY the JSON object, no additional text.
`.trim();

export class ContextSummarizer {
  private llm: LLMProvider;
  private cache: Map<string, ContextSummary> = new Map();

  constructor(llm: LLMProvider) {
    this.llm = llm;
  }

  async summarize(
    agentOutput: string,
    agentId: string,
    role: string
  ): Promise<ContextSummary> {
    // Check cache first
    const cacheKey = `${agentId}-${agentOutput.slice(0, 100)}`;
    if (this.cache.has(cacheKey)) {
      contextLogger.debug({
        event: "SUMMARY_CACHE_HIT",
        agentId,
      }, `✅ Using cached summary for: ${agentId}`);
      return this.cache.get(cacheKey)!;
    }

    contextLogger.info({
      event: "SUMMARIZATION_START",
      agentId,
      role,
      outputLength: agentOutput.length,
      timestamp: Date.now(),
    }, `📝 Summarizing output for agent: ${agentId}`);

    try {
      const prompt = SUMMARIZATION_PROMPT_TEMPLATE(role, agentOutput);

      const llmResponse = await this.llm.generate({
        system: "You are a precise context summarization assistant. Extract and structure key information from agent outputs.",
        user: prompt,
        temperature: 0.3, // Lower temperature for more consistent summaries
      });

      contextLogger.debug({
        event: "LLM_SUMMARIZATION_RESPONSE",
        agentId,
        responseLength: llmResponse.length,
      }, `📥 Received summarization response for: ${agentId}`);

      // Parse the JSON response
      const parsed = this.parseJsonResponse(llmResponse);

      const summary: ContextSummary = {
        agentId,
        role,
        keyInsights: parsed.keyInsights || [],
        decisions: parsed.decisions || [],
        artifacts: parsed.artifacts || [],
        nextSteps: parsed.nextSteps || [],
        fullOutputReference: agentId, // Reference to full output in timeline
      };

      // Cache the summary
      this.cache.set(cacheKey, summary);

      contextLogger.info({
        event: "SUMMARIZATION_COMPLETE",
        agentId,
        keyInsightsCount: summary.keyInsights.length,
        decisionsCount: summary.decisions.length,
        artifactsCount: summary.artifacts.length,
        nextStepsCount: summary.nextSteps.length,
      }, `✅ Summary created for: ${agentId}`);

      return summary;
    } catch (error) {
      // If summarization fails, create a basic summary
      contextLogger.error({
        event: "SUMMARIZATION_ERROR",
        agentId,
        error: error instanceof Error ? error.message : String(error),
      }, `❌ Summarization failed for ${agentId}, using fallback`);

      return this.createFallbackSummary(agentId, role, agentOutput);
    }
  }

  private parseJsonResponse(response: string): any {
    try {
      // Try to extract JSON from the response (in case there's extra text)
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return JSON.parse(response);
    } catch (error) {
      contextLogger.warn({
        event: "JSON_PARSE_ERROR",
        error: error instanceof Error ? error.message : String(error),
      }, "⚠️ Failed to parse JSON response");
      return {
        keyInsights: [],
        decisions: [],
        artifacts: [],
        nextSteps: [],
      };
    }
  }

  private createFallbackSummary(
    agentId: string,
    role: string,
    output: string
  ): ContextSummary {
    // Create a simple summary by truncating the output
    const truncated = output.slice(0, 250);
    return {
      agentId,
      role,
      keyInsights: [truncated],
      decisions: [],
      artifacts: [],
      nextSteps: [],
      fullOutputReference: agentId,
    };
  }

  clearCache(): void {
    this.cache.clear();
    contextLogger.debug({
      event: "CACHE_CLEARED",
    }, "🧹 Summarization cache cleared");
  }
}

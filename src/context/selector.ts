import { Agent } from "../agents/agent";
import { ContextSummary } from "./types";
import { contextLogger } from "../logger/enhanced-logger";

export class ContextSelector {
  /**
   * Selects relevant context for an agent based on:
   * - Agent's role and goal
   * - Recency of previous outputs
   * - Relevance scoring
   */
  selectRelevantContext(
    currentAgent: Agent,
    availableSummaries: ContextSummary[],
    maxContextItems: number = 5
  ): ContextSummary[] {
    contextLogger.info({
      event: "CONTEXT_SELECTION_START",
      agentId: currentAgent.id,
      availableCount: availableSummaries.length,
      maxContextItems,
    }, `🔍 Selecting relevant context for: ${currentAgent.id}`);

    if (availableSummaries.length === 0) {
      contextLogger.debug({
        event: "NO_SUMMARIES_AVAILABLE",
        agentId: currentAgent.id,
      }, "ℹ️ No summaries available for selection");
      return [];
    }

    // Score each summary based on relevance
    const scoredSummaries = availableSummaries.map((summary, index) => {
      const score = this.calculateRelevanceScore(
        currentAgent,
        summary,
        index,
        availableSummaries.length
      );
      return { summary, score };
    });

    // Sort by score (descending)
    scoredSummaries.sort((a, b) => b.score - a.score);

    // Take top N
    const selected = scoredSummaries
      .slice(0, maxContextItems)
      .map((item) => item.summary);

    contextLogger.info({
      event: "CONTEXT_SELECTION_COMPLETE",
      agentId: currentAgent.id,
      selectedCount: selected.length,
      scores: scoredSummaries.slice(0, maxContextItems).map(s => ({
        agentId: s.summary.agentId,
        score: s.score
      })),
    }, `✅ Selected ${selected.length} relevant summaries`);

    return selected;
  }

  private calculateRelevanceScore(
    currentAgent: Agent,
    summary: ContextSummary,
    position: number,
    totalSummaries: number
  ): number {
    let score = 0;

    // 1. Recency score (newer is better) - 40% weight
    const recencyScore = (position / totalSummaries) * 40;
    score += recencyScore;

    // 2. Keyword matching in goal - 40% weight
    const keywordScore = this.calculateKeywordMatch(currentAgent.goal, summary) * 40;
    score += keywordScore;

    // 3. Content richness - 20% weight
    const contentScore = this.calculateContentRichness(summary) * 20;
    score += contentScore;

    contextLogger.debug({
      event: "RELEVANCE_SCORE_CALCULATED",
      summaryAgentId: summary.agentId,
      currentAgentId: currentAgent.id,
      totalScore: score,
      breakdown: {
        recency: recencyScore,
        keywords: keywordScore,
        content: contentScore,
      },
    }, `📊 Relevance score: ${score.toFixed(2)} for ${summary.agentId}`);

    return score;
  }

  private calculateKeywordMatch(goal: string, summary: ContextSummary): number {
    // Extract keywords from goal (simple word tokenization)
    const goalKeywords = this.extractKeywords(goal);

    // Combine all summary text
    const summaryText = [
      ...summary.keyInsights,
      ...summary.decisions,
      ...summary.artifacts,
      ...summary.nextSteps,
    ].join(" ").toLowerCase();

    // Count matching keywords
    let matches = 0;
    for (const keyword of goalKeywords) {
      if (summaryText.includes(keyword)) {
        matches++;
      }
    }

    // Return normalized score (0-1)
    return goalKeywords.length > 0 ? matches / goalKeywords.length : 0;
  }

  private extractKeywords(text: string): string[] {
    // Simple keyword extraction - remove common words and get significant terms
    const commonWords = new Set([
      "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for",
      "of", "with", "by", "from", "as", "is", "was", "are", "were", "be",
      "been", "being", "have", "has", "had", "do", "does", "did", "will",
      "would", "should", "could", "may", "might", "must", "can", "this",
      "that", "these", "those", "it", "its",
    ]);

    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, " ") // Remove punctuation
      .split(/\s+/)
      .filter((word) => word.length > 2 && !commonWords.has(word));
  }

  private calculateContentRichness(summary: ContextSummary): number {
    // Score based on how much useful information the summary contains
    let score = 0;

    // More insights is better
    score += Math.min(summary.keyInsights.length / 5, 1) * 0.4;

    // Decisions are valuable
    score += Math.min(summary.decisions.length / 3, 1) * 0.3;

    // Artifacts are valuable
    score += Math.min(summary.artifacts.length / 3, 1) * 0.2;

    // Next steps are valuable
    score += Math.min(summary.nextSteps.length / 3, 1) * 0.1;

    return score; // Returns 0-1
  }
}

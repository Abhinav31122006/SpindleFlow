export interface ContextSummary {
  agentId: string;
  role: string;
  keyInsights: string[];      // Max 3-5 bullet points
  decisions: string[];         // Key decisions made
  artifacts: string[];         // Files/outputs created
  nextSteps: string[];         // Recommendations
  fullOutputReference: string; // Pointer to full output
}

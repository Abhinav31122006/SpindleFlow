import { LLMProvider } from "./provider";
import { GeminiProvider } from "./gemini";

export function getLLMProvider(
  options?: { apiKey?: string }
): LLMProvider {
  // Resolve API key here (correct scope)
  const resolvedApiKey =
    options?.apiKey || process.env.GEMINI_API_KEY;

  if (!resolvedApiKey) {
    throw new Error(
      "No API key provided. Use --api-key or set GEMINI_API_KEY."
    );
  }

  const provider = process.env.LLM_PROVIDER ?? "gemini";

  switch (provider) {
    case "gemini":
      return new GeminiProvider(resolvedApiKey);

    default:
      throw new Error(`Unsupported LLM provider: ${provider}`);
  }
}
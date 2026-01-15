import { GoogleGenerativeAI } from "@google/generative-ai";
import { LLMProvider, LLMGenerateParams } from "./provider";
import { RateLimiter } from "./rate-limiters";
import { logLLMCall, llmLogger } from "../logger/enhanced-logger";

export class GeminiProvider implements LLMProvider {
  name = "gemini";
  private client: GoogleGenerativeAI;
  private rateLimiter: RateLimiter;

  constructor(apiKey: string) {
    llmLogger.info("🔧 Initializing Gemini Provider");
    
    if (!apiKey) {
      llmLogger.error("❌ GEMINI_API_KEY is not set");
      throw new Error("GEMINI_API_KEY is not set");
    }

    llmLogger.debug({
      event: "API_KEY_CHECK",
      keyPresent: true,
      keyLength: apiKey.length,
      keyPreview: `${apiKey.substring(0, 8)}...`,
    }, "✅ API key found");

    this.client = new GoogleGenerativeAI(apiKey);
    
    // Initialize rate limiter with 5 RPM
    const rpm = parseInt(process.env.GEMINI_RPM || "5", 10);
    this.rateLimiter = new RateLimiter(rpm);

    llmLogger.info({
      event: "PROVIDER_INITIALIZED",
      provider: "gemini",
      rateLimit: rpm,
      model: "gemini-flash-latest",
    }, "✅ Gemini Provider initialized");
  }

  async generate(params: LLMGenerateParams): Promise<string> {
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();

    llmLogger.info({
      event: "GENERATE_START",
      requestId,
      timestamp: startTime,
    }, `🚀 Starting LLM generation (${requestId})`);

    // Log input parameters
    llmLogger.debug({
      event: "GENERATE_PARAMS",
      requestId,
      systemPromptLength: params.system.length,
      userPromptLength: params.user.length,
      temperature: params.temperature,
      systemPrompt: params.system,
      userPrompt: params.user,
    }, `📋 Request parameters for ${requestId}`);

    // Acquire rate limit slot
    llmLogger.info({
      event: "RATE_LIMIT_CHECK",
      requestId,
      stats: this.rateLimiter.getStats(),
    }, `⏱️ Checking rate limit for ${requestId}`);

    await this.rateLimiter.acquireSlot();

    llmLogger.info({
      event: "RATE_LIMIT_ACQUIRED",
      requestId,
      waitTime: Date.now() - startTime,
    }, `✅ Rate limit slot acquired for ${requestId}`);

    // Create model
    llmLogger.debug({
      event: "MODEL_CREATION",
      requestId,
      model: "gemini-flash-latest",
    }, `🔨 Creating model instance for ${requestId}`);

    const model = this.client.getGenerativeModel({
      model: "gemini-flash-latest",
    });

    // Prepare prompt
    const fullPrompt = `${params.system}\n\n${params.user}`;
    
    llmLogger.debug({
      event: "PROMPT_PREPARED",
      requestId,
      fullPromptLength: fullPrompt.length,
      fullPrompt,
    }, `📝 Full prompt prepared for ${requestId}`);

    try {
      // Make API call
      llmLogger.info({
        event: "API_CALL_START",
        requestId,
        timestamp: Date.now(),
      }, `📡 Sending request to Gemini API (${requestId})`);

      logLLMCall("gemini", requestId, {
        systemLength: params.system.length,
        userLength: params.user.length,
        temperature: params.temperature,
      }, "REQUEST");

      const result = await model.generateContent(fullPrompt);

      const apiCallDuration = Date.now() - startTime;

      llmLogger.info({
        event: "API_CALL_SUCCESS",
        requestId,
        duration: apiCallDuration,
        timestamp: Date.now(),
      }, `✅ Received response from Gemini API (${requestId}) in ${apiCallDuration}ms`);

      // Extract response
      const responseText = result.response.text();

      llmLogger.debug({
        event: "RESPONSE_EXTRACTED",
        requestId,
        responseLength: responseText.length,
        response: responseText,
      }, `📄 Response text extracted for ${requestId}`);

      logLLMCall("gemini", requestId, {
        responseLength: responseText.length,
        duration: apiCallDuration,
        response: responseText,
      }, "RESPONSE");

      const totalDuration = Date.now() - startTime;

      llmLogger.info({
        event: "GENERATE_COMPLETE",
        requestId,
        totalDuration,
        apiCallDuration,
        overheadDuration: totalDuration - apiCallDuration,
      }, `🎉 Generation complete for ${requestId} (total: ${totalDuration}ms)`);

      return responseText;

    } catch (error) {
      const errorDuration = Date.now() - startTime;

      llmLogger.error({
        event: "API_CALL_ERROR",
        requestId,
        duration: errorDuration,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      }, `❌ Error in LLM generation (${requestId})`);

      logLLMCall("gemini", requestId, {
        error: error instanceof Error ? error.message : String(error),
        duration: errorDuration,
      }, "ERROR");

      throw error;
    }
  }
}
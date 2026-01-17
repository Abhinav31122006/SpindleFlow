import axios from "axios";
import { MCPTool, MCPToolResult } from "../schema";
import { MCPToolProvider } from "../registry";

export interface WebSearchToolConfig {
  apiKey?: string;
  searchEngine?: "google" | "bing" | "duckduckgo";
}

export class WebSearchTool implements MCPToolProvider {
  name = "web_search";
  description = "Search the web for information";

  private apiKey?: string;
  private searchEngine: "google" | "bing" | "duckduckgo";

  constructor(config: WebSearchToolConfig = {}) {
    this.apiKey = config.apiKey;
    this.searchEngine = config.searchEngine || "duckduckgo";
  }

  getSchema(): MCPTool {
    return {
      name: "web_search",
      description: this.description,
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Search query",
          },
          num_results: {
            type: "number",
            description: "Number of results to return",
            default: 5,
          },
        },
        required: ["query"],
      },
      executor: "web_search",
    };
  }

  async execute(params: {
    query: string;
    num_results?: number;
  }): Promise<MCPToolResult> {
    const startTime = Date.now();
    const numResults = params.num_results || 5;

    try {
      let results: any[];

      switch (this.searchEngine) {
        case "google":
          results = await this.googleSearch(params.query, numResults);
          break;
        case "bing":
          results = await this.bingSearch(params.query, numResults);
          break;
        case "duckduckgo":
          results = await this.duckduckgoSearch(params.query, numResults);
          break;
      }

      return {
        success: true,
        result: {
          query: params.query,
          results,
          count: results.length,
        },
        executionTime: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        executionTime: Date.now() - startTime,
      };
    }
  }

  private async googleSearch(query: string, num: number): Promise<any[]> {
    if (!this.apiKey) {
      throw new Error("Google Search API key required. Set GOOGLE_SEARCH_API_KEY and GOOGLE_SEARCH_CX in .env");
    }

    // Get Custom Search Engine ID from environment
    const cx = process.env.GOOGLE_SEARCH_CX;
    if (!cx) {
      throw new Error("GOOGLE_SEARCH_CX (Custom Search Engine ID) is required");
    }

    // Using Google Custom Search API
    const url = 'https://www.googleapis.com/customsearch/v1';
    
    const response = await axios.get(url, {
      params: {
        key: this.apiKey,
        cx: cx,
        q: query,
        num: Math.min(num, 10) // Google allows max 10 results per request
      }
    });

    const data = response.data;

    if (!data.items || data.items.length === 0) {
      return [];
    }

    return data.items.map((item: any) => ({
      title: item.title,
      link: item.link,
      snippet: item.snippet,
      displayLink: item.displayLink
    }));
  }

  private async bingSearch(query: string, num: number): Promise<any[]> {
    if (!this.apiKey) {
      throw new Error("Bing Search API key required");
    }

    // Using Bing Search API
    const url = `https://api.bing.microsoft.com/v7.0/search?q=${encodeURIComponent(query)}&count=${num}`;

    const response = await axios.get(url, {
      headers: { "Ocp-Apim-Subscription-Key": this.apiKey },
    });
    const data = response.data;

    return (
      data.webPages?.value?.map((item: any) => ({
        title: item.name,
        link: item.url,
        snippet: item.snippet,
      })) || []
    );
  }

  private async duckduckgoSearch(query: string, num: number): Promise<any[]> {
    // Using DuckDuckGo Instant Answer API (no key needed, but limited)
    const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json`;

    const response = await axios.get(url);
    const data = response.data;

    // DuckDuckGo API has limited structured data
    const results: any[] = [];

    // Add abstract if available
    if (data.Abstract) {
      results.push({
        title: data.Heading || "DuckDuckGo Result",
        link: data.AbstractURL,
        snippet: data.Abstract,
      });
    }

    // Add related topics
    if (data.RelatedTopics) {
      for (const topic of data.RelatedTopics.slice(0, num - 1)) {
        if (topic.Text && topic.FirstURL) {
          results.push({
            title: topic.Text.split(" - ")[0] || "Related Topic",
            link: topic.FirstURL,
            snippet: topic.Text,
          });
        }
      }
    }

    if (results.length === 0) {
      throw new Error("No results found from DuckDuckGo API. Consider using Google Custom Search API instead.");
    }

    return results.slice(0, num);
  }
}

import { ZodError } from "zod";

// ANSI color codes for terminal output
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
};

/**
 * Custom error class for configuration errors with user-friendly messages
 */
export class ConfigError extends Error {
  constructor(
    message: string,
    public readonly details?: string,
    public readonly suggestions?: string[]
  ) {
    super(message);
    this.name = "ConfigError";
  }

  /**
   * Format the error for display to users
   */
  format(): string {
    let output = `${colors.red}${colors.bright}\n❌ Configuration Error${colors.reset}\n`;
    output += `${colors.red}\n${this.message}${colors.reset}\n`;

    if (this.details) {
      output += `${colors.yellow}\n📋 Details:${colors.reset}\n`;
      output += `${colors.yellow}${this.details}${colors.reset}\n`;
    }

    if (this.suggestions && this.suggestions.length > 0) {
      output += `${colors.cyan}\n💡 Suggestions:${colors.reset}\n`;
      this.suggestions.forEach((suggestion, idx) => {
        output += `${colors.cyan}  ${idx + 1}. ${suggestion}${colors.reset}\n`;
      });
    }

    return output;
  }
}

/**
 * Format Zod validation errors into user-friendly messages
 */
export function formatZodError(error: ZodError): ConfigError {
  const issues = error.issues;
  
  if (issues.length === 0) {
    return new ConfigError("Invalid configuration structure");
  }

  // Group errors by path for better organization
  const errorsByPath = new Map<string, string[]>();
  
  issues.forEach(issue => {
    const path = issue.path.length > 0 
      ? issue.path.join(".") 
      : "root";
    
    const message = formatZodIssue(issue);
    
    if (!errorsByPath.has(path)) {
      errorsByPath.set(path, []);
    }
    errorsByPath.get(path)!.push(message);
  });

  // Build detailed error message
  let details = "";
  errorsByPath.forEach((messages, path) => {
    details += `\n  At "${path}":\n`;
    messages.forEach(msg => {
      details += `    • ${msg}\n`;
    });
  });

  // Generate helpful suggestions based on common errors
  const suggestions = generateSuggestions(issues);

  return new ConfigError(
    "Your configuration file has validation errors",
    details.trim(),
    suggestions
  );
}

/**
 * Format individual Zod issue into readable message
 */
function formatZodIssue(issue: any): string {
  switch (issue.code) {
    case "invalid_type":
      return `Expected ${issue.expected}, but got ${issue.received}`;
    
    case "invalid_literal":
      return `Expected literal value "${issue.expected}", but got "${issue.received}"`;
    
    case "too_small":
      if (issue.type === "string") {
        return `String must be at least ${issue.minimum} character(s) long`;
      }
      if (issue.type === "array") {
        return `Array must contain at least ${issue.minimum} item(s)`;
      }
      return `Value is too small (minimum: ${issue.minimum})`;
    
    case "too_big":
      if (issue.type === "string") {
        return `String must be at most ${issue.maximum} character(s) long`;
      }
      if (issue.type === "array") {
        return `Array must contain at most ${issue.maximum} item(s)`;
      }
      return `Value is too large (maximum: ${issue.maximum})`;
    
    case "invalid_union":
      return `Value doesn't match any of the expected types`;
    
    case "unrecognized_keys":
      return `Unrecognized key(s): ${issue.keys.join(", ")}`;
    
    case "invalid_enum_value":
      return `Invalid value. Expected one of: ${issue.options.join(", ")}`;
    
    default:
      return issue.message || "Invalid value";
  }
}

/**
 * Generate contextual suggestions based on validation errors
 */
function generateSuggestions(issues: any[]): string[] {
  const suggestions: string[] = [];
  const suggestionSet = new Set<string>();

  issues.forEach(issue => {
    const path = issue.path.join(".");

    // Missing required fields
    if (issue.code === "invalid_type" && issue.received === "undefined") {
      if (path.includes("agents") || path.startsWith("agents")) {
        suggestionSet.add("Make sure all agents have 'id', 'role', and 'goal' fields");
        suggestionSet.add("Check that each agent in your config has all required fields");
      }
      if (path.includes("workflow") || path.startsWith("workflow")) {
        suggestionSet.add("Ensure your workflow has a 'type' field (either 'sequential' or 'parallel')");
      }
      if (path.includes("steps")) {
        suggestionSet.add("Each step must have an 'agent' field with a valid agent ID");
      }
    }
    
    // Wrong type provided
    if (issue.code === "invalid_type" && issue.received !== "undefined") {
      suggestionSet.add(`Expected ${issue.expected} but got ${issue.received} - check the data type`);
    }

    // Workflow type issues
    if (path === "workflow.type") {
      suggestionSet.add("Workflow type must be either 'sequential' or 'parallel'");
      suggestionSet.add("Check the demo configs for examples: configs/demo-sequential.yml or configs/demo-parallel.yml");
    }

    // Empty arrays
    if (issue.code === "too_small" && issue.type === "array" && issue.minimum === 1) {
      if (path.includes("agents")) {
        suggestionSet.add("You must define at least one agent in the 'agents' array");
      }
      if (path.includes("steps")) {
        suggestionSet.add("Sequential workflows must have at least one step");
      }
      if (path.includes("branches")) {
        suggestionSet.add("Parallel workflows must have at least one branch");
      }
    }

    // Empty strings
    if (issue.code === "too_small" && issue.type === "string") {
      suggestionSet.add(`Field "${path}" cannot be empty`);
    }

    // Invalid union (usually workflow type)
    if (issue.code === "invalid_union" && path.includes("workflow")) {
      suggestionSet.add("Make sure your workflow structure matches either sequential or parallel format");
      suggestionSet.add("Sequential format: { type: 'sequential', steps: [{ agent: 'id' }, ...] }");
      suggestionSet.add("Parallel format: { type: 'parallel', branches: ['id1', 'id2'], then: { agent: 'finalId' } }");
    }
  });

  return Array.from(suggestionSet);
}

/**
 * Format YAML parsing errors
 */
export function formatYamlError(error: Error, filePath: string): ConfigError {
  const message = error.message;
  const suggestions = [
    "Check for proper YAML indentation (use spaces, not tabs)",
    "Ensure all keys and values are properly formatted",
    "Verify that colons are followed by a space",
    "Check for unmatched quotes or brackets",
    `Use a YAML validator or check example files in the configs/ directory`
  ];

  return new ConfigError(
    `Failed to parse YAML file: ${filePath}`,
    message,
    suggestions
  );
}

/**
 * Format semantic validation errors with context
 */
export class SemanticValidationError extends ConfigError {
  constructor(
    message: string,
    public readonly agentId?: string,
    suggestions?: string[]
  ) {
    const defaultSuggestions = [
      "Check that all agent IDs in your workflow steps reference agents defined in the 'agents' section",
      "Verify that each agent has a unique ID",
      "Agent IDs are case-sensitive"
    ];

    super(
      message,
      agentId ? `Problem with agent: "${agentId}"` : undefined,
      suggestions || defaultSuggestions
    );
    this.name = "SemanticValidationError";
  }
}

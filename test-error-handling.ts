#!/usr/bin/env tsx

/**
 * Test script to demonstrate improved error handling
 * Run with: npx tsx test-error-handling.ts
 */

import { loadYamlConfig } from "./src/config/loader";
import { RootConfigSchema } from "./src/config/schema";
import { validateSemantics } from "./src/config/validator";
import { ConfigError, SemanticValidationError, formatZodError } from "./src/config/errorFormatter";
import { ZodError } from "zod";

console.log("🧪 Testing Error Handling\n");

// Test 1: Missing file
console.log("Test 1: Missing file error");
console.log("=" .repeat(80));
try {
  loadYamlConfig("configs/does-not-exist.yml");
} catch (error) {
  if (error instanceof ConfigError) {
    console.log(error.format());
  }
}

// Test 2: Empty file
console.log("\n\nTest 2: Empty file error");
console.log("=".repeat(80));
try {
  const emptyPath = "configs/test-empty.yml";
  require("fs").writeFileSync(emptyPath, "", "utf-8");
  loadYamlConfig(emptyPath);
} catch (error) {
  if (error instanceof ConfigError) {
    console.log(error.format());
  }
}

// Test 3: Invalid YAML syntax
console.log("\n\nTest 3: Invalid YAML syntax");
console.log("=".repeat(80));
try {
  const invalidYamlPath = "configs/test-invalid-yaml.yml";
  require("fs").writeFileSync(invalidYamlPath, "agents:\n  - id: test\n    role:missing space", "utf-8");
  loadYamlConfig(invalidYamlPath);
} catch (error) {
  if (error instanceof ConfigError) {
    console.log(error.format());
  }
}

// Test 4: Missing required field (schema validation)
console.log("\n\nTest 4: Missing required field (schema validation)");
console.log("=".repeat(80));
try {
  const config = {
    agents: [
      {
        id: "researcher",
        role: "Research Analyst"
        // Missing 'goal' field
      }
    ],
    workflow: {
      type: "sequential",
      steps: [{ agent: "researcher" }]
    }
  };
  RootConfigSchema.parse(config);
} catch (error) {
  if (error instanceof ZodError) {
    const formatted = formatZodError(error);
    console.log(formatted.format());
  }
}

// Test 5: Invalid workflow type
console.log("\n\nTest 5: Invalid workflow type");
console.log("=".repeat(80));
try {
  const config = {
    agents: [
      {
        id: "researcher",
        role: "Research Analyst",
        goal: "Research topics"
      }
    ],
    workflow: {
      type: "invalid-type",  // Should be 'sequential' or 'parallel'
      steps: [{ agent: "researcher" }]
    }
  };
  RootConfigSchema.parse(config);
} catch (error) {
  if (error instanceof ZodError) {
    const formatted = formatZodError(error);
    console.log(formatted.format());
  }
}

// Test 6: Duplicate agent IDs (semantic validation)
console.log("\n\nTest 6: Duplicate agent IDs (semantic validation)");
console.log("=".repeat(80));
try {
  const config = {
    agents: [
      {
        id: "researcher",
        role: "Research Analyst",
        goal: "Research topics"
      },
      {
        id: "researcher",  // Duplicate!
        role: "Senior Researcher",
        goal: "Deep research"
      }
    ],
    workflow: {
      type: "sequential",
      steps: [{ agent: "researcher" }]
    }
  };
  const parsed = RootConfigSchema.parse(config);
  validateSemantics(parsed);
} catch (error) {
  if (error instanceof SemanticValidationError) {
    console.log(error.format());
  }
}

// Test 7: Unknown agent in workflow (semantic validation)
console.log("\n\nTest 7: Unknown agent reference (semantic validation)");
console.log("=".repeat(80));
try {
  const config = {
    agents: [
      {
        id: "researcher",
        role: "Research Analyst",
        goal: "Research topics"
      },
      {
        id: "writer",
        role: "Content Writer",
        goal: "Write articles"
      }
    ],
    workflow: {
      type: "sequential",
      steps: [
        { agent: "researcher" },
        { agent: "editor" },  // This agent doesn't exist!
        { agent: "writer" }
      ]
    }
  };
  const parsed = RootConfigSchema.parse(config);
  validateSemantics(parsed);
} catch (error) {
  if (error instanceof SemanticValidationError) {
    console.log(error.format());
  }
}

// Test 8: Aggregator in branches (semantic validation)
console.log("\n\nTest 8: Aggregator agent in branches (semantic validation)");
console.log("=".repeat(80));
try {
  const config = {
    agents: [
      {
        id: "researcher1",
        role: "Researcher 1",
        goal: "Research aspect A"
      },
      {
        id: "researcher2",
        role: "Researcher 2",
        goal: "Research aspect B"
      },
      {
        id: "synthesizer",
        role: "Synthesizer",
        goal: "Combine research"
      }
    ],
    workflow: {
      type: "parallel",
      branches: ["researcher1", "researcher2", "synthesizer"],  // synthesizer shouldn't be here
      then: {
        agent: "synthesizer"
      }
    }
  };
  const parsed = RootConfigSchema.parse(config);
  validateSemantics(parsed);
} catch (error) {
  if (error instanceof SemanticValidationError) {
    console.log(error.format());
  }
}

// Test 9: Empty agents array
console.log("\n\nTest 9: Empty agents array");
console.log("=".repeat(80));
try {
  const config = {
    agents: [],  // No agents!
    workflow: {
      type: "sequential",
      steps: []
    }
  };
  RootConfigSchema.parse(config);
} catch (error) {
  if (error instanceof ZodError) {
    const formatted = formatZodError(error);
    console.log(formatted.format());
  }
}

console.log("\n\n✅ Error handling tests complete!");

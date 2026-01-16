# Error Handling Implementation

## Overview

Your SpindleFlow project now has comprehensive error handling that provides clear, actionable error messages when configuration files have issues.

## What Was Added

### 1. **Custom Error Classes** ([src/config/errorFormatter.ts](src/config/errorFormatter.ts))

- `ConfigError`: Base class for configuration errors with formatting
- `SemanticValidationError`: Specific errors for semantic issues (duplicate IDs, unknown agents, etc.)
- `formatZodError()`: Converts Zod schema validation errors into user-friendly messages

### 2. **Enhanced Schema Validation** ([src/config/schema.ts](src/config/schema.ts))

Added custom error messages for every field:
- Missing required fields (id, role, goal)
- Empty strings
- Wrong types
- Invalid workflow types
- Empty arrays

### 3. **Improved Semantic Validation** ([src/config/validator.ts](src/config/validator.ts))

Better error messages for:
- Duplicate agent IDs
- Unknown agent references in workflows
- Aggregator agent appearing in parallel branches
- Empty workflow steps/branches

### 4. **Robust YAML Loading** ([src/config/loader.ts](src/config/loader.ts))

Handles:
- Missing files
- Non-existent paths
- Empty files
- Invalid YAML syntax
- File permission errors

### 5. **CLI Integration** ([src/cli/run.ts](src/cli/run.ts))

The CLI now catches and formats all error types appropriately.

## Example Error Messages

### ❌ Missing File
```
❌ Configuration Error

Configuration file not found: configs/missing.yml

💡 Suggestions:
  1. Verify the file path is correct
  2. Use an absolute path or a path relative to your current directory
  3. Check for typos in the filename
  4. Example config files are in the configs/ directory
```

### ❌ Missing Required Field
```
❌ Configuration Error

Your configuration file has validation errors

📋 Details:
  At "agents.0.goal":
    • Agent 'goal' is required

💡 Suggestions:
  1. Make sure all agents have 'id', 'role', and 'goal' fields
```

### ❌ Invalid Workflow Type
```
❌ Configuration Error

Your configuration file has validation errors

📋 Details:
  At "workflow.type":
    • Expected literal value "sequential", but got "invalid"

💡 Suggestions:
  1. Workflow type must be either 'sequential' or 'parallel'
  2. Check the demo configs for examples: configs/demo-sequential.yml or configs/demo-parallel.yml
  3. Make sure your workflow structure matches either sequential or parallel format
  4. Sequential format: { type: 'sequential', steps: [{ agent: 'id' }, ...] }
  5. Parallel format: { type: 'parallel', branches: ['id1', 'id2'], then: { agent: 'finalId' } }
```

### ❌ Unknown Agent Reference
```
❌ Configuration Error

Sequential workflow step 2 references unknown agent: "editor"

📋 Details:
Problem with agent: "editor"

💡 Suggestions:
  1. Agent "editor" is not defined in the 'agents' section
  2. Available agents: researcher, writer
  3. Make sure the agent ID matches exactly (IDs are case-sensitive)
  4. Check for typos in agent IDs
```

### ❌ Duplicate Agent IDs
```
❌ Configuration Error

Duplicate agent ID found: "researcher"

📋 Details:
Problem with agent: "researcher"

💡 Suggestions:
  1. Each agent must have a unique ID
  2. Check your 'agents' section for duplicate IDs
  3. Found multiple agents with ID: "researcher"
```

### ❌ Aggregator in Branches
```
❌ Configuration Error

Aggregator agent "synthesizer" is also listed in parallel branches

📋 Details:
Problem with agent: "synthesizer"

💡 Suggestions:
  1. The 'then' agent should be different from branch agents
  2. The aggregator runs after all branches complete
  3. Remove "synthesizer" from branches or use a different agent for 'then'
```

### ❌ Invalid YAML Syntax
```
❌ Configuration Error

Failed to parse YAML file: configs/bad-syntax.yml

📋 Details:
Implicit map keys need to be followed by map values at line 3, column 11

💡 Suggestions:
  1. Check for proper YAML indentation (use spaces, not tabs)
  2. Ensure all keys and values are properly formatted
  3. Verify that colons are followed by a space (e.g., 'key: value')
  4. Check for unmatched quotes or brackets
  5. Common YAML mistakes:
  6.   - Mixing tabs and spaces
  7.   - Missing space after colon
  8.   - Incorrect indentation levels
  9.   - Unclosed quotes
  10. Use a YAML validator online or check example files in configs/ directory
```

### ❌ Empty Configuration
```
❌ Configuration Error

Configuration file is empty: configs/empty.yml

💡 Suggestions:
  1. Add your configuration content to the file
  2. Check example configs in the configs/ directory
  3. A valid config must have 'agents' and 'workflow' sections
```

## Testing the Error Handling

### Method 1: Create an invalid config file

Create `configs/test-invalid.yml`:
```yaml
agents:
  - id: researcher
    role: Research Analyst
    # Missing 'goal' field

workflow:
  type: sequential
  steps:
    - agent: unknown-agent  # This agent doesn't exist
```

Then run:
```bash
npm run dev -- run configs/test-invalid.yml --input "Test input"
```

### Method 2: Use the test script

Run the comprehensive test suite:
```bash
npx tsx test-error-handling.ts
```

This will demonstrate all 9 types of validation errors.

## Common Error Scenarios Covered

1. ✅ File not found
2. ✅ Empty file
3. ✅ Invalid YAML syntax
4. ✅ Missing required fields (id, role, goal)
5. ✅ Empty strings in required fields
6. ✅ Wrong data types
7. ✅ Invalid workflow type
8. ✅ Empty agents array
9. ✅ Empty workflow steps/branches
10. ✅ Duplicate agent IDs
11. ✅ Unknown agent references
12. ✅ Aggregator agent in parallel branches

## Color Coding

Errors are displayed with color coding for better readability:
- 🔴 **Red**: Error title and main message
- 🟡 **Yellow**: Details section
- 🔵 **Cyan**: Suggestions section

## Benefits

1. **Clear Error Messages**: Users immediately understand what went wrong
2. **Actionable Suggestions**: Every error includes steps to fix it
3. **Context-Aware**: Errors show exactly where the problem is (field path, line number)
4. **Educational**: Suggestions teach users the correct format
5. **Comprehensive**: Catches errors at every stage (file loading, parsing, schema validation, semantic validation)

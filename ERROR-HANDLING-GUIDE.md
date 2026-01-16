# Error Handling Guide

SpindleFlow now provides comprehensive error messages to help you quickly identify and fix configuration issues.

## Types of Errors Detected

### 1. **File Loading Errors**
- File not found
- File is a directory instead of a file
- File is empty
- File permission issues

### 2. **YAML Parsing Errors**
- Invalid YAML syntax
- Indentation issues (tabs vs spaces)
- Missing spaces after colons
- Unclosed quotes or brackets
- Invalid characters

### 3. **Schema Validation Errors**
- Missing required fields (`id`, `role`, `goal`)
- Wrong data types (e.g., string instead of array)
- Empty values where non-empty required
- Invalid workflow types (must be `sequential` or `parallel`)
- Missing workflow structure

### 4. **Semantic Validation Errors**
- Duplicate agent IDs
- Workflow references to non-existent agents
- Empty workflow steps or branches
- Aggregator agent also in parallel branches

## Error Message Format

All errors are displayed with:
- **❌ Error Type** - Clear categorization
- **Error Message** - What went wrong
- **📋 Details** - Specific information about the error
- **💡 Suggestions** - Actionable steps to fix the issue

## Common Errors and Solutions

### Missing Required Field

**Error:**
```
❌ Configuration Error

Your configuration file has validation errors

📋 Details:
  At "agents.0.goal":
    • Required

💡 Suggestions:
  1. Make sure all agents have 'id', 'role', and 'goal' fields
```

**Solution:**
Add the missing field to your agent definition:
```yaml
agents:
  - id: researcher
    role: Research Analyst
    goal: Conduct thorough research on given topics  # ✅ Added
```

### Unknown Agent Reference

**Error:**
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

**Solution:**
Either add the missing agent or fix the typo:
```yaml
agents:
  - id: researcher
    role: Research Analyst
    goal: Research topics

  - id: editor  # ✅ Add missing agent
    role: Editor
    goal: Review and edit content

workflow:
  type: sequential
  steps:
    - agent: researcher
    - agent: editor  # Now this works
```

### Duplicate Agent ID

**Error:**
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

**Solution:**
Make sure each agent has a unique ID:
```yaml
agents:
  - id: researcher-1  # ✅ Changed to unique ID
    role: Research Analyst
    goal: Research topics

  - id: researcher-2  # ✅ Changed to unique ID
    role: Senior Researcher
    goal: Deep dive research
```

### Invalid Workflow Type

**Error:**
```
❌ Configuration Error

Your configuration file has validation errors

📋 Details:
  At "workflow.type":
    • Expected literal value "sequential", but got "series"

💡 Suggestions:
  1. Workflow type must be either 'sequential' or 'parallel'
  2. Check the demo configs for examples: configs/demo-sequential.yml or configs/demo-parallel.yml
```

**Solution:**
Use the correct workflow type:
```yaml
workflow:
  type: sequential  # ✅ Must be 'sequential' or 'parallel'
  steps:
    - agent: researcher
```

### Empty Configuration File

**Error:**
```
❌ Configuration Error

Configuration file is empty: configs/my-config.yml

💡 Suggestions:
  1. Add your configuration content to the file
  2. Check example configs in the configs/ directory
  3. A valid config must have 'agents' and 'workflow' sections
```

**Solution:**
Add content to your config file using the examples as templates.

### YAML Indentation Error

**Error:**
```
❌ Configuration Error

Failed to parse YAML file: configs/my-config.yml

📋 Details:
Nested mappings are not allowed in compact mappings at line 5, column 7

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

**Solution:**
Fix the indentation (use 2 spaces per level):
```yaml
agents:  # ✅ Correct indentation
  - id: researcher
    role: Research Analyst
    goal: Research topics
```

### Parallel Workflow Issues

**Error:**
```
❌ Configuration Error

Aggregator agent "summarizer" is also listed in parallel branches

📋 Details:
  Problem with agent: "summarizer"

💡 Suggestions:
  1. The 'then' agent should be different from branch agents
  2. The aggregator runs after all branches complete
  3. Remove "summarizer" from branches or use a different agent for 'then'
```

**Solution:**
Use a different agent for the aggregator:
```yaml
workflow:
  type: parallel
  branches:
    - researcher
    - analyst
  then:
    agent: summarizer  # ✅ This agent should NOT be in branches
```

## Validation Checklist

Before running your config, ensure:

- ✅ All agents have `id`, `role`, and `goal` fields
- ✅ All agent IDs are unique
- ✅ All agent IDs are referenced correctly in workflow (case-sensitive)
- ✅ Workflow type is either `sequential` or `parallel`
- ✅ Sequential workflows have at least one step
- ✅ Parallel workflows have at least one branch and a `then` field
- ✅ YAML syntax is valid (proper indentation, spaces after colons)
- ✅ No tabs used for indentation (use spaces only)

## Testing Your Configuration

You can test your configuration without actually running the workflow by checking if it loads properly:

```bash
# This will validate your config and show any errors
npm run dev -- --config configs/your-config.yml --input "test"
```

If there are errors, the detailed messages will guide you to fix them before the workflow executes.

## Example: Valid Configurations

### Sequential Workflow
```yaml
agents:
  - id: researcher
    role: Research Analyst
    goal: Conduct thorough research

  - id: writer
    role: Content Writer
    goal: Create engaging content

workflow:
  type: sequential
  steps:
    - agent: researcher
    - agent: writer
```

### Parallel Workflow
```yaml
agents:
  - id: researcher
    role: Research Analyst
    goal: Research the topic

  - id: analyst
    role: Data Analyst
    goal: Analyze data patterns

  - id: summarizer
    role: Summarizer
    goal: Combine insights

workflow:
  type: parallel
  branches:
    - researcher
    - analyst
  then:
    agent: summarizer
```

## Need Help?

- Check the example configs in `configs/demo-sequential.yml` and `configs/demo-parallel.yml`
- Refer to `QUICK-REFERENCE.md` for configuration syntax
- Use online YAML validators to check syntax
- Error messages include suggestions tailored to your specific issue

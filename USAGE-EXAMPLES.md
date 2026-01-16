# SpindleFlow - Output and Logs Separation Guide

## Overview

SpindleFlow now supports separating workflow output and detailed logs into different files for easier analysis and debugging.

## Quick Start

### Method 1: Using CLI Options (Recommended)

Run SpindleFlow with `--output` and `--logs` flags:

```bash
npm run dev -- run configs/demo-sequential.yml \
  --input "Design a productivity app for college students" \
  --output output/result.txt \
  --logs output/logs.json
```

This will:
- Display everything in the console (as usual)
- Save the clean workflow output to `output/result.txt`
- Save detailed logs to `output/logs.json`

### Method 2: Using Shell Script

Make the script executable and run it:

```bash
chmod +x run-separated.sh
./run-separated.sh
```

This automatically creates the `output/` directory and separates streams.

### Method 3: Manual Shell Redirection

Simple redirection using shell operators:

```bash
npm run dev -- run configs/demo-sequential.yml \
  --input "Design a productivity app for college students" \
  > output/result.txt 2> output/logs.txt
```

**Note:** Method 1 is preferred as it maintains colored console output while saving clean files.

## Output Files Explained

### `output/result.txt` (Workflow Output)
Contains:
- User input
- Agent execution progress
- Final output from the last agent
- Execution summary (timing, agent counts)

This file has **no color codes** and is clean for:
- Sharing results
- Further processing
- Documentation
- Reports

### `output/logs.json` (Detailed Logs)
Contains structured JSON logs with:
- Timestamp for each event
- Component information (CONFIG, AGENT, LLM, CONTEXT, etc.)
- Event types and detailed metadata
- Full prompts and responses
- Data transfers between components
- Performance metrics

Perfect for:
- Debugging
- Performance analysis
- Tracking data flow
- Auditing LLM calls

## Examples

### Example 1: Save Only Output
```bash
npm run dev -- run configs/demo-sequential.yml \
  --input "Your prompt here" \
  --output results/output.txt
```

### Example 2: Save Only Logs
```bash
npm run dev -- run configs/demo-sequential.yml \
  --input "Your prompt here" \
  --logs logs/debug.json
```

### Example 3: Save Both to Custom Locations
```bash
npm run dev -- run configs/demo-sequential.yml \
  --input "Your prompt here" \
  --output reports/$(date +%Y%m%d_%H%M%S)_output.txt \
  --logs logs/$(date +%Y%m%d_%H%M%S)_debug.json
```

### Example 4: Different Workflows
```bash
# Sequential workflow
npm run dev -- run configs/demo-sequential.yml \
  --input "Your prompt" \
  --output output/sequential.txt \
  --logs logs/sequential.json

# Parallel workflow
npm run dev -- run configs/demo-parallel.yml \
  --input "Your prompt" \
  --output output/parallel.txt \
  --logs logs/parallel.json
```

## Analyzing Logs

The log files contain JSON objects, one per line. You can analyze them using:

### Using `jq` (JSON processor)
```bash
# Get all LLM calls
cat output/logs.json | jq 'select(.component == "LLM")'

# Count events by type
cat output/logs.json | jq -r '.event' | sort | uniq -c

# Get timing for each agent
cat output/logs.json | jq 'select(.event == "AGENT_EXECUTION_COMPLETE") | {agentId, duration}'

# Extract full prompts
cat output/logs.json | jq 'select(.event == "PROMPT_PREPARED") | .fullPrompt'
```

### Using `grep`
```bash
# Find all errors
grep "ERROR" output/logs.json

# Find specific agent logs
grep "strategist" output/logs.json

# Find API calls
grep "API_CALL" output/logs.json
```

## Environment Variables

Control log verbosity with `LOG_LEVEL`:

```bash
# Minimal logs (errors only)
LOG_LEVEL=error npm run dev -- run config.yml --input "prompt" --logs logs/error.json

# Standard logs (info level)
LOG_LEVEL=info npm run dev -- run config.yml --input "prompt" --logs logs/info.json

# Detailed logs (debug level)
LOG_LEVEL=debug npm run dev -- run config.yml --input "prompt" --logs logs/debug.json

# All logs including traces (default)
LOG_LEVEL=trace npm run dev -- run config.yml --input "prompt" --logs logs/trace.json
```

## Tips

1. **Create output directory first** (optional, but recommended):
   ```bash
   mkdir -p output logs
   ```

2. **Use timestamps in filenames** for multiple runs:
   ```bash
   --output "output/$(date +%Y%m%d_%H%M%S).txt"
   ```

3. **Compare runs** by keeping separate files:
   ```bash
   npm run dev -- run config.yml --input "prompt v1" --output output/v1.txt
   npm run dev -- run config.yml --input "prompt v2" --output output/v2.txt
   diff output/v1.txt output/v2.txt
   ```

4. **Monitor in real-time** while saving:
   ```bash
   npm run dev -- run config.yml --input "prompt" --logs logs/debug.json &
   tail -f logs/debug.json | jq .
   ```

## .gitignore

Add these to your `.gitignore`:
```
output/
logs/
*.txt
*.json
!configs/*.yml
!package.json
```

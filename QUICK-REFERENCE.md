# 🚀 SpindleFlow Quick Reference

## Separate Output & Logs

### Method 1: CLI Flags (Recommended ⭐)
```bash
npm run dev -- run <config.yml> \
  --input "your prompt" \
  --output output/result.txt \
  --logs logs/debug.json
```

### Method 2: Use Scripts
```bash
# Linux/Mac
./run-separated.sh

# Windows
run-separated.bat
```

### Method 3: Shell Redirection
```bash
npm run dev -- run <config.yml> --input "prompt" > output.txt 2> logs.txt
```

## File Outputs

| File | Contains | Use For |
|------|----------|---------|
| `output/result.txt` | Clean workflow output, no logs | Results, reports, sharing |
| `logs/debug.json` | Structured JSON logs | Debugging, analysis, auditing |

## Common Commands

### Save everything
```bash
npm run dev -- run configs/demo-sequential.yml \
  --input "Design a productivity app for college students" \
  --output output/result.txt \
  --logs logs/debug.json
```

### Save only output
```bash
npm run dev -- run configs/demo-sequential.yml \
  --input "Your prompt" \
  --output output/result.txt
```

### Save only logs
```bash
npm run dev -- run configs/demo-sequential.yml \
  --input "Your prompt" \
  --logs logs/debug.json
```

### With timestamps
```bash
npm run dev -- run configs/demo-sequential.yml \
  --input "Your prompt" \
  --output "output/$(date +%Y%m%d_%H%M%S).txt" \
  --logs "logs/$(date +%Y%m%d_%H%M%S).json"
```

## Log Analysis

### Using jq
```bash
# View specific events
cat logs/debug.json | jq 'select(.event == "LLM_CALL")'

# Get agent timings
cat logs/debug.json | jq 'select(.component == "AGENT") | {agentId, duration}'

# Extract prompts
cat logs/debug.json | jq 'select(.event == "PROMPT_PREPARED") | .fullPrompt'
```

### Using grep
```bash
grep "ERROR" logs/debug.json
grep "strategist" logs/debug.json
```

## Environment Variables

```bash
# Control log detail level
LOG_LEVEL=error   # Errors only
LOG_LEVEL=info    # Standard (default for console)
LOG_LEVEL=debug   # Detailed
LOG_LEVEL=trace   # Everything (default for files)
```

## Examples

```bash
# Compare two runs
npm run dev -- run config.yml --input "v1" --output output/v1.txt
npm run dev -- run config.yml --input "v2" --output output/v2.txt
diff output/v1.txt output/v2.txt

# Debug specific agent
npm run dev -- run config.yml --input "test" --logs logs/debug.json
cat logs/debug.json | jq 'select(.agentId == "strategist")'

# Monitor real-time
npm run dev -- run config.yml --input "test" --logs logs/live.json &
tail -f logs/live.json | jq .
```

## Tips

✅ Create directories first: `mkdir -p output logs`
✅ Use timestamps for multiple runs
✅ Check logs for debugging, output for results
✅ Files have no color codes - safe for processing
❌ Don't commit output/ or logs/ to git (already in .gitignore)

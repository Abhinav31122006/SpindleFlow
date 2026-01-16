# 🎨 Visual Guide - Output & Logs Separation

## Before vs After

### ❌ BEFORE (Mixed Output)
```
Terminal Output:
===========================================
[17:32:42.651] INFO: Sending request...
🚀 Starting Workflow Execution
[17:32:42.651] DEBUG: Config loaded
▶ Product Analyst (analyst)
[17:32:42.651] INFO: Agent started
  Executing...
[17:32:45.960] INFO: Agent complete
✓ Product Analyst completed
[17:32:45.961] DEBUG: Context updated
Output: **Key User Needs**...
[17:32:49.998] INFO: Workflow complete
===========================================
```
😕 **Problems:**
- Logs and output mixed together
- Hard to extract just the results
- Difficult to share or process
- Color codes make parsing hard

---

### ✅ AFTER (Separated)

#### Console (Same as before - pretty & colorized)
```
============================================================
🚀 Starting Workflow Execution
============================================================
User Input: Design a productivity app for college students

▶ Product Analyst (analyst)
  Executing...
✓ Product Analyst completed in 5371ms

Output:
  **Key User Needs**
  1. Integrated Academic Scheduling...
```

#### `output/result.txt` (Clean output only)
```
============================================================
Starting Workflow Execution
============================================================
User Input: Design a productivity app for college students

Product Analyst (analyst)
  Executing...
Product Analyst completed in 5371ms

Output:
  **Key User Needs**
  1. Integrated Academic Scheduling...
  [... rest of output ...]

============================================================
Final Output
============================================================
## StudySync: Product Strategy Summary
[... complete result ...]

────────────────────────────────────────────────────────────
Execution Summary
────────────────────────────────────────────────────────────
Total Agents: 3
Total Time: 19409ms

Execution Timeline:
  • Product Analyst (5371ms)
  • UX Designer (6688ms)
  • Product Strategist (7348ms)
```

✅ **Benefits:**
- Clean, no logs mixed in
- No color codes (safe to process)
- Easy to share
- Can diff multiple runs

#### `logs/debug.json` (Structured logs)
```json
{"level":30,"time":1768411950589,"component":"ORCHESTRATOR","event":"WORKFLOW_EXECUTION_START","workflowType":"sequential","timestamp":1768411950589,"msg":"🎬 Starting workflow execution"}
{"level":30,"time":1768411950589,"component":"AGENT","event":"AGENT_EXECUTION","phase":"START","agentId":"analyst","role":"Product Analyst","stepNumber":1,"timestamp":1768411950589,"msg":"▶️ Agent analyst (Product Analyst): START"}
{"level":30,"time":1768411950650,"component":"LLM","event":"PROMPT_PREPARED","requestId":"req_1768411950589_analyst","fullPromptLength":1234,"systemPromptLength":156,"userPromptLength":1078,"msg":"📝 Prompt prepared for analyst"}
{"level":30,"time":1768411950651,"component":"LLM","event":"API_CALL_START","requestId":"req_1768411950589_analyst","msg":"📡 Sending request to Gemini API"}
{"level":30,"time":1768411955960,"component":"LLM","event":"API_CALL_SUCCESS","requestId":"req_1768411950589_analyst","duration":5309,"msg":"✅ Received response from Gemini API in 5309ms"}
```

✅ **Benefits:**
- Structured JSON - easy to parse
- Queryable with jq
- Contains full context
- Perfect for debugging

---

## Usage Patterns

### Pattern 1: Quick Run (Console Only)
```bash
npm run dev -- run config.yml --input "prompt"
```
📺 **Console:** Full output + logs  
📁 **Files:** Nothing saved

**Use when:** Quick testing, development

---

### Pattern 2: Save Results Only
```bash
npm run dev -- run config.yml --input "prompt" --output output/result.txt
```
📺 **Console:** Full output + logs  
📁 **output/result.txt:** Clean results  
📁 **Logs:** Still shown in console

**Use when:** Need to save/share results

---

### Pattern 3: Save Logs Only
```bash
npm run dev -- run config.yml --input "prompt" --logs logs/debug.json
```
📺 **Console:** Full output (pretty)  
📁 **Logs:** logs/debug.json  
📁 **Output:** Still shown in console

**Use when:** Debugging, performance analysis

---

### Pattern 4: Save Both (Recommended)
```bash
npm run dev -- run config.yml --input "prompt" \
  --output output/result.txt \
  --logs logs/debug.json
```
📺 **Console:** Full output + logs (pretty)  
📁 **output/result.txt:** Clean results  
📁 **logs/debug.json:** Structured logs

**Use when:** Production runs, archiving

---

## File Organization

### Recommended Structure
```
SpindleFlow/
├── output/
│   ├── 20260114_173242_result.txt    ← Timestamped outputs
│   ├── 20260114_175830_result.txt
│   └── latest.txt                     ← Symlink to latest
├── logs/
│   ├── 20260114_173242_debug.json    ← Timestamped logs
│   ├── 20260114_175830_debug.json
│   └── latest.json                    ← Symlink to latest
└── ...
```

### Create with Timestamps
```bash
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

npm run dev -- run config.yml \
  --input "prompt" \
  --output "output/${TIMESTAMP}_result.txt" \
  --logs "logs/${TIMESTAMP}_debug.json"

# Create symlinks to latest
ln -sf "${TIMESTAMP}_result.txt" output/latest.txt
ln -sf "${TIMESTAMP}_debug.json" logs/latest.json
```

---

## Analysis Examples

### Example 1: Extract Agent Timings
```bash
cat logs/debug.json | jq -r '
  select(.event == "AGENT_EXECUTION_COMPLETE") | 
  "\(.agentId): \(.duration)ms"
'
```
**Output:**
```
analyst: 5371ms
designer: 6688ms
strategist: 7348ms
```

### Example 2: Get All Prompts
```bash
cat logs/debug.json | jq -r '
  select(.event == "PROMPT_PREPARED") | 
  .fullPrompt
' > all_prompts.txt
```

### Example 3: Find Errors
```bash
cat logs/debug.json | jq -r '
  select(.level >= 50) | 
  {time, component, msg, error}
'
```

### Example 4: LLM Call Statistics
```bash
cat logs/debug.json | jq -r '
  select(.event == "API_CALL_SUCCESS") | 
  {agent: .agentId, duration: .duration, tokens: .usage}
'
```

### Example 5: Data Transfers
```bash
cat logs/debug.json | jq -r '
  select(.event == "DATA_TRANSFER") | 
  "\(.from) → \(.to) (\(.dataSize) bytes)"
'
```

---

## Comparison Workflows

### Compare Two Runs
```bash
# Run 1
npm run dev -- run config.yml --input "v1" --output output/v1.txt

# Run 2
npm run dev -- run config.yml --input "v2" --output output/v2.txt

# Compare
diff output/v1.txt output/v2.txt
```

### Side-by-Side View
```bash
diff -y output/v1.txt output/v2.txt | less
```

### Visual Diff (with colordiff)
```bash
colordiff output/v1.txt output/v2.txt
```

---

## Quick Commands Cheatsheet

| What You Want | Command |
|---------------|---------|
| Just run | `npm run dev -- run config.yml --input "prompt"` |
| Save output | `... --output output/result.txt` |
| Save logs | `... --logs logs/debug.json` |
| Save both | `... --output output/result.txt --logs logs/debug.json` |
| Use script (Linux) | `./run-separated.sh` |
| Use script (Windows) | `run-separated.bat` |
| View latest output | `cat output/latest.txt` |
| View latest logs | `cat logs/latest.json \| jq .` |
| Get agent times | `cat logs/*.json \| jq 'select(.event=="AGENT_EXECUTION_COMPLETE") \| {agent:.agentId, time:.duration}'` |
| Get errors | `cat logs/*.json \| jq 'select(.level>=50)'` |
| Compare runs | `diff output/v1.txt output/v2.txt` |

---

## Tips & Tricks

### 💡 Tip 1: Always Use Both Flags in Production
```bash
npm run dev -- run config.yml --input "$INPUT" \
  --output "output/$(date +%Y%m%d_%H%M%S).txt" \
  --logs "logs/$(date +%Y%m%d_%H%M%S).json"
```

### 💡 Tip 2: Create Aliases
Add to `~/.bashrc` or `~/.zshrc`:
```bash
alias sf='npm run dev -- run'
alias sfout='npm run dev -- run --output output/$(date +%Y%m%d_%H%M%S).txt --logs logs/$(date +%Y%m%d_%H%M%S).json'
```

Then use:
```bash
sfout configs/demo-sequential.yml --input "prompt"
```

### 💡 Tip 3: Watch Logs in Real-Time
```bash
# Terminal 1: Run workflow
npm run dev -- run config.yml --input "prompt" --logs logs/live.json

# Terminal 2: Watch logs
tail -f logs/live.json | jq .
```

### 💡 Tip 4: Create Output Reports
```bash
# Generate markdown report
cat output/result.txt | pandoc -o report.pdf
```

---

**📚 See Also:**
- [QUICK-REFERENCE.md](QUICK-REFERENCE.md) - Command reference
- [USAGE-EXAMPLES.md](USAGE-EXAMPLES.md) - Detailed examples
- [README.md](README.md) - Main documentation

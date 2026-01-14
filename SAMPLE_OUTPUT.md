# Sample Output Format

Here's how your logs are now separated into distinct sections and files:

## Console Output (What you see in the terminal)

### 1. EXECUTION STEPS
Shows real-time workflow progress
```
════════════════════════════════════════════════════════════════════════════════
🚀 WORKFLOW EXECUTION
════════════════════════════════════════════════════════════════════════════════
User Input: Design a portfolio webpage
Output will be saved to: ./output/

┌─ EXECUTION STEPS ─────────────────────────────────────────────────────────┐

  ▶ Product Analyst (analyst)
    Processing...
  ✓ Product Analyst completed in 1250ms

  ▶ UX Designer (designer)
    Processing...
  ✓ UX Designer completed in 1890ms

  ▶ Product Strategist (strategist)
    Processing...
  ✓ Product Strategist completed in 1450ms

└───────────────────────────────────────────────────────────────────────────┘
```

### 2. AGENT OUTPUTS
Preview of each agent's output
```
┌─ AGENT OUTPUTS ───────────────────────────────────────────────────────────┐

  Agent 1: Product Analyst (analyst)
  ────────────────────────────────────────────────────────────────────────
  Key user needs identified:
  1. Professional presentation
  2. Easy navigation
  3. Portfolio showcase
  ... (truncated, see full output in file)
  💾 Full output: output/1_analyst_Product_Analyst.txt

  Agent 2: UX Designer (designer)
  ────────────────────────────────────────────────────────────────────────
  Proposed design solution:
  - Clean, minimalist layout
  - Hero section with name and tagline
  ... (truncated, see full output in file)
  💾 Full output: output/2_designer_UX_Designer.txt

  Agent 3: Product Strategist (strategist)
  ────────────────────────────────────────────────────────────────────────
  Product Direction:
  A modern, responsive portfolio website...
  ... (truncated, see full output in file)
  💾 Full output: output/3_strategist_Product_Strategist.txt

└───────────────────────────────────────────────────────────────────────────┘
```

### 3. FINAL OUTPUT
Clear final result
```
┌─ FINAL OUTPUT ────────────────────────────────────────────────────────────┐

  Product Direction:
  A modern, responsive portfolio website that showcases professional work
  with an intuitive user experience...
  
  ... (truncated, see full output in file)

  📁 Output Files:
    ✓ Final Output: output/FINAL_OUTPUT.txt
    ✓ Execution Summary: output/EXECUTION_SUMMARY.txt
    ✓ Execution Logs: output/EXECUTION_LOGS.txt
    ✓ Individual Agents: output/[1-N]_*.txt

└───────────────────────────────────────────────────────────────────────────┘
```

### 4. EXECUTION SUMMARY
Quick statistics
```
┌─ EXECUTION SUMMARY ───────────────────────────────────────────────────────┐

  Total Agents: 3
  Total Time: 4590ms

  Execution Timeline:
    • Product Analyst (1250ms)
    • UX Designer (1890ms)
    • Product Strategist (1450ms)

  👉 Check the output/ folder for complete outputs!

└───────────────────────────────────────────────────────────────────────────┘

════════════════════════════════════════════════════════════════════════════
```

## Output Files (Saved in `output/` directory)

### 1. Individual Agent Outputs
Files: `1_analyst_Product_Analyst.txt`, `2_designer_UX_Designer.txt`, etc.
- Complete output from each agent
- Numbered in execution order
- Includes agent role and metadata

### 2. FINAL_OUTPUT.txt
- The final result from the last agent
- Includes execution summary at the bottom
- Ready to use/review

### 3. EXECUTION_SUMMARY.txt
- High-level overview of the workflow
- Timeline with all agents and durations
- Complete outputs from all agents in order
- Perfect for reviewing the entire workflow

### 4. EXECUTION_LOGS.txt ✨ NEW
**This is the detailed technical log file you requested!**

Contains all execution logs including:
- Configuration loading and validation
- Agent registry building
- Context store initialization
- LLM provider selection
- Workflow orchestration steps
- Prompt building details
- LLM API calls (requests/responses)
- Data transfers between components
- Rate limiting information
- Timing and performance metrics
- Complete structured logging data

Example content:
```json
{"level":30,"time":1768413207127,"component":"ORCHESTRATOR","event":"STEP_START",
 "stepNumber":1,"totalSteps":3,"agentId":"analyst","msg":"📍 Step 1/3: analyst"}

{"level":30,"time":1768413207127,"component":"LLM","event":"API_CALL_START",
 "requestId":"req_1768413207127_8giyna5uu","msg":"📡 Sending request to Gemini API"}

{"level":30,"time":1768413211196,"component":"LLM","event":"API_CALL_SUCCESS",
 "duration":4069,"msg":"✅ Received response from Gemini API in 4069ms"}
```

## Key Improvements

✅ **Execution Steps** - Real-time workflow progress in console  
✅ **Agent Outputs** - Separated console preview + full file outputs  
✅ **Final Output** - Clearly separated final result  
✅ **Execution Summary** - Quick workflow overview  
✅ **Execution Logs** - Complete technical logs for debugging and analysis  

All sections are visually distinct with:
- Bordered boxes using Unicode characters
- Different colors for each section (in console)
- Proper indentation
- Clear file references for full outputs
- Separate log file for all execution details

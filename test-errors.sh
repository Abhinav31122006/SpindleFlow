#!/bin/bash

# Quick Error Test Script - Tests multiple error scenarios

cd /home/garvit/SpindleFlow

echo "========================================"
echo "Testing ERROR HANDLING"
echo "========================================"
echo ""

# Test 1: Empty agents array
echo "1️⃣ TEST: Empty agents array"
cat > configs/test-empty-agents.yml << 'EOF'
agents: []
workflow:
  type: sequential
  steps: []
EOF
npm run dev -- run configs/test-empty-agents.yml --input "test" 2>&1 | grep -A 15 "Configuration Error" | head -20
echo ""
echo "----------------------------------------"
echo ""

# Test 2: Invalid workflow type
echo "2️⃣ TEST: Invalid workflow type"
cat > configs/test-invalid-type.yml << 'EOF'
agents:
  - id: test
    role: Tester
    goal: Test things
workflow:
  type: bad-type
  steps: []
EOF
npm run dev -- run configs/test-invalid-type.yml --input "test" 2>&1 | grep -A 15 "Configuration Error" | head -20
echo ""
echo "----------------------------------------"
echo ""

# Test 3: Duplicate agent IDs
echo "3️⃣ TEST: Duplicate agent IDs"
cat > configs/test-duplicates.yml << 'EOF'
agents:
  - id: researcher
    role: Researcher
    goal: Research
  - id: researcher
    role: Senior Researcher
    goal: Deep research
workflow:
  type: sequential
  steps:
    - agent: researcher
EOF
npm run dev -- run configs/test-duplicates.yml --input "test" 2>&1 | grep -A 15 "Configuration Error" | head -20
echo ""
echo "----------------------------------------"
echo ""

# Test 4: Unknown agent reference
echo "4️⃣ TEST: Unknown agent reference (fix test-errors.yml first)"
cat > configs/test-unknown-agent.yml << 'EOF'
agents:
  - id: researcher
    role: Research Analyst
    goal: Research topics
  - id: writer
    role: Content Writer
    goal: Write articles
workflow:
  type: sequential
  steps:
    - agent: researcher
    - agent: editor
    - agent: writer
EOF
npm run dev -- run configs/test-unknown-agent.yml --input "test" 2>&1 | grep -A 15 "Configuration Error" | head -20
echo ""
echo "----------------------------------------"
echo ""

# Test 5: Aggregator in branches
echo "5️⃣ TEST: Aggregator agent in branches"
cat > configs/test-aggregator-in-branches.yml << 'EOF'
agents:
  - id: researcher1
    role: Researcher 1
    goal: Research aspect A
  - id: researcher2
    role: Researcher 2
    goal: Research aspect B
  - id: synthesizer
    role: Synthesizer
    goal: Combine research
workflow:
  type: parallel
  branches:
    - researcher1
    - researcher2
    - synthesizer
  then:
    agent: synthesizer
EOF
npm run dev -- run configs/test-aggregator-in-branches.yml --input "test" 2>&1 | grep -A 15 "Configuration Error" | head -20
echo ""
echo "========================================" 
echo "✅ ALL TESTS COMPLETE"
echo "========================================"

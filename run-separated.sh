#!/bin/bash

# SpindleFlow - Separated Output and Logs Runner
# Usage: ./run-separated.sh

# Create output directory if it doesn't exist
mkdir -p output

# Run with separated streams
npm run dev -- \
  run configs/demo-sequential.yml \
  --input "Design a productivity app for college students" \
  > output/result.txt 2> output/logs.txt

echo "✅ Execution complete!"
echo "📄 Results saved to: output/result.txt"
echo "📋 Logs saved to: output/logs.txt"

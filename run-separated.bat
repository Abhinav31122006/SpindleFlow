@echo off
REM SpindleFlow - Separated Output and Logs Runner (Windows)
REM Usage: run-separated.bat

echo Creating output directories...
if not exist "output" mkdir output
if not exist "logs" mkdir logs

echo Running SpindleFlow...
npm run dev -- run configs/demo-sequential.yml --input "Design a productivity app for college students" --output output/result.txt --logs logs/debug.json

echo.
echo ✅ Execution complete!
echo 📄 Results saved to: output\result.txt
echo 📋 Logs saved to: logs\debug.json
echo.
pause

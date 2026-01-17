/**
 * Direct MCP Tools Test - No LLM Required
 * Tests real Google Search API, isolated-vm code execution, and filesystem operations
 */

import { WebSearchTool } from "./src/mcp/tools/web-search";
import { CodeExecutionTool } from "./src/mcp/tools/code-execution";
import { FilesystemTool } from "./src/mcp/tools/filesystem";
import * as dotenv from "dotenv";

dotenv.config();

async function testMCPTools() {
  console.log("╔════════════════════════════════════════════════════╗");
  console.log("║   DIRECT MCP TOOLS TEST (No LLM Required)          ║");
  console.log("╚════════════════════════════════════════════════════╝\n");

  // Test 1: Web Search Tool (Real Google Custom Search API)
  console.log("🔍 TEST 1: Web Search Tool (Google Custom Search API)");
  console.log("─".repeat(60));
  
  const webSearchTool = new WebSearchTool({
    apiKey: process.env.GOOGLE_SEARCH_API_KEY,
    searchEngine: "google"
  });

  try {
    const searchResult = await webSearchTool.execute({
      query: "TypeScript 5.0 new features",
      num_results: 3
    });

    if (searchResult.success) {
      console.log("✅ SUCCESS: Real Google API call worked!");
      console.log(`   Query: TypeScript 5.0 new features`);
      console.log(`   Results found: ${searchResult.result.count}`);
      console.log(`   Execution time: ${searchResult.executionTime}ms\n`);
      
      if (searchResult.result.results && searchResult.result.results.length > 0) {
        searchResult.result.results.forEach((r: any, i: number) => {
          console.log(`   ${i + 1}. ${r.title}`);
          console.log(`      ${r.link}`);
          console.log(`      ${r.snippet?.substring(0, 100)}...\n`);
        });
      } else {
        console.log("   ⚠️  No results returned from Google API\n");
      }
    } else {
      console.log(`❌ FAILED: ${searchResult.error}\n`);
    }
  } catch (error: any) {
    console.log(`❌ ERROR: ${error.message}\n`);
  }

  // Test 2: Code Execution Tool (Real isolated-vm Sandbox)
  console.log("\n🔧 TEST 2: Code Execution Tool (isolated-vm Sandbox)");
  console.log("─".repeat(60));

  const codeExecutionTool = new CodeExecutionTool({
    timeout: 5000,
    memory_limit: 16
  });

  try {
    const codeResult = await codeExecutionTool.execute({
      language: "javascript",
      code: `
        console.log("Testing isolated-vm sandbox...");
        
        // Test calculation
        const sum = (a, b) => a + b;
        console.log("Sum of 5 + 3 = " + sum(5, 3));
        
        // Test array operations
        const numbers = [1, 2, 3, 4, 5];
        const doubled = numbers.map(n => n * 2);
        console.log("Doubled array: " + doubled.join(", "));
        
        // Return result
        return { success: true, total: doubled.reduce((a, b) => a + b, 0) };
      `
    });

    if (codeResult.success) {
      console.log("✅ SUCCESS: isolated-vm code execution worked!");
      console.log(`   Return value:`, codeResult.result.returnValue);
      console.log(`   Console output:`);
      codeResult.result.output?.forEach((line: string) => console.log(`      ${line}`));
      console.log(`   Memory used: ${codeResult.result.memoryUsedMB}MB`);
      console.log(`   Execution time: ${codeResult.executionTime}ms\n`);
    } else {
      console.log(`❌ FAILED: ${codeResult.error}\n`);
    }
  } catch (error: any) {
    console.log(`❌ ERROR: ${error.message}\n`);
  }

  // Test 3: Filesystem Tool (Real File I/O)
  console.log("\n📁 TEST 3: Filesystem Tool (Real File Operations)");
  console.log("─".repeat(60));

  const filesystemTool = new FilesystemTool({
    workingDirectory: "/home/dev-khera/Desktop/SpindleFlow/test-workspace",
    allowedExtensions: [".txt", ".md", ".json"]
  });

  try {
    // Test write
    const writeResult = await filesystemTool.execute({
      operation: "write",
      path: "mcp-test.txt",
      content: "This is a real file created by the MCP Filesystem Tool!\nTimestamp: " + new Date().toISOString()
    });

    if (writeResult.success) {
      console.log("✅ WRITE SUCCESS: File created!");
      console.log(`   Path: ${writeResult.result.path}`);
      console.log(`   Bytes written: ${writeResult.result.bytes}\n`);
    } else {
      console.log(`❌ WRITE FAILED: ${writeResult.error}\n`);
    }

    // Test read
    const readResult = await filesystemTool.execute({
      operation: "read",
      path: "mcp-test.txt"
    });

    if (readResult.success) {
      console.log("✅ READ SUCCESS: File content retrieved!");
      console.log(`   Path: ${readResult.result.path}`);
      console.log(`   Size: ${readResult.result.size} bytes`);
      console.log(`   Content:\n   ${readResult.result.content.split('\n').join('\n   ')}\n`);
    }

    // Test exists
    const existsResult = await filesystemTool.execute({
      operation: "exists",
      path: "mcp-test.txt"
    });

    if (existsResult.success) {
      console.log(`✅ EXISTS CHECK: ${existsResult.result.exists ? "File exists" : "File not found"}\n`);
    }

  } catch (error: any) {
    console.log(`❌ ERROR: ${error.message}\n`);
  }

  console.log("\n╔════════════════════════════════════════════════════╗");
  console.log("║              ALL TESTS COMPLETE                    ║");
  console.log("╚════════════════════════════════════════════════════╝");
}

testMCPTools().catch(console.error);

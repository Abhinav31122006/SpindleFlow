import fs from "fs";
import path from "path";
import YAML from "yaml";

import { createContextStore } from "../src/core/context/ContextStore";
import { SequentialExecutor } from "../src/core/orchestrator/SequentialExecutor";
import { ParallelExecutor } from "../src/core/orchestrator/ParallelExecutor";
import { mapConfigToCore } from "../src/config/toCore";
import { stubRunAgent } from "../src/core/stubRunner";

// ---- CLI args ----
const [, , configPath, userInput] = process.argv;

if (!configPath || !userInput) {
  console.error("Usage: tsx yaml-core-test.ts <config.yml> <input>");
  process.exit(1);
}

// ---- Load YAML ----
const rawYaml = fs.readFileSync(path.resolve(configPath), "utf-8");
const parsed = YAML.parse(rawYaml);

// ---- Map to core ----
const { registry, workflow } = mapConfigToCore(parsed);

// ---- Create context ----
const context = createContextStore(userInput);

// ---- Execute ----
(async () => {
  if (workflow.type === "sequential") {
    const executor = new SequentialExecutor(registry, stubRunAgent);
    await executor.execute(workflow, context);
  } else {
    const executor = new ParallelExecutor(registry, stubRunAgent);
    await executor.execute(workflow, context);
  }

  console.log("\n=== FINAL CONTEXT ===");
  console.log(JSON.stringify(context, null, 2));
})();

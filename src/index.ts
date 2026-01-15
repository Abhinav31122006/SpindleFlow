#!/usr/bin/env node
import { Command } from "commander";
import * as dotenv from "dotenv";
import { runCommand } from "./cli/run";


dotenv.config();

const program = new Command();

program
  .name("spindleflow")
  .description("Declarative YAML-driven multi-agent orchestration engine");

program
  .command("run")
  .argument("<config>", "Path to workflow YAML file")
  .option("-i, --input <input>", "User input", "")
  .option("--api-key <key>", "LLM API key")
  .action(async (config, options) => {
    await runCommand(config, options.input, options.apiKey);
  });

program.parse();

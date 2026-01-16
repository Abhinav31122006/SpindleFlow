import * as fs from "fs";
import * as YAML from "yaml";
import { ConfigError } from "./errorFormatter";

export function loadYamlConfig(path: string): unknown {
  // Check if file exists
  if (!fs.existsSync(path)) {
    throw new ConfigError(
      `Configuration file not found: ${path}`,
      undefined,
      [
        "Verify the file path is correct",
        "Use an absolute path or a path relative to your current directory",
        "Check for typos in the filename",
        "Example config files are in the configs/ directory"
      ]
    );
  }

  // Check if it's a file (not a directory)
  const stats = fs.statSync(path);
  if (!stats.isFile()) {
    throw new ConfigError(
      `Path is not a file: ${path}`,
      "Expected a YAML file, but got a directory",
      [
        "Make sure you're pointing to a .yml or .yaml file",
        "Example: configs/demo-sequential.yml"
      ]
    );
  }

  // Read file content
  let raw: string;
  try {
    raw = fs.readFileSync(path, "utf-8");
  } catch (error) {
    throw new ConfigError(
      `Failed to read configuration file: ${path}`,
      error instanceof Error ? error.message : String(error),
      [
        "Check file permissions",
        "Ensure the file is readable",
        "Try opening the file in a text editor to verify it's not corrupted"
      ]
    );
  }

  // Check if file is empty
  if (raw.trim().length === 0) {
    throw new ConfigError(
      `Configuration file is empty: ${path}`,
      undefined,
      [
        "Add your configuration content to the file",
        "Check example configs in the configs/ directory",
        "A valid config must have 'agents' and 'workflow' sections"
      ]
    );
  }

  // Parse YAML
  try {
    const parsed = YAML.parse(raw);
    
    // Check if parse resulted in null or undefined
    if (parsed === null || parsed === undefined) {
      throw new ConfigError(
        `Failed to parse YAML file: ${path}`,
        "The file appears to be empty or contains only comments",
        [
          "Ensure the file contains valid YAML content",
          "Check that you haven't commented out all content"
        ]
      );
    }

    return parsed;
  } catch (error) {
    // If it's already a ConfigError, re-throw it
    if (error instanceof ConfigError) {
      throw error;
    }

    // Format YAML parsing errors
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new ConfigError(
      `Failed to parse YAML file: ${path}`,
      errorMessage,
      [
        "Check for proper YAML indentation (use spaces, not tabs)",
        "Ensure all keys and values are properly formatted",
        "Verify that colons are followed by a space (e.g., 'key: value')",
        "Check for unmatched quotes or brackets",
        "Common YAML mistakes:",
        "  - Mixing tabs and spaces",
        "  - Missing space after colon",
        "  - Incorrect indentation levels",
        "  - Unclosed quotes",
        "Use a YAML validator online or check example files in configs/ directory"
      ]
    );
  }
}

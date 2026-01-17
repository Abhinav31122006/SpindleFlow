import * as fs from "fs/promises";
import * as path from "path";
import { MCPTool, MCPToolResult } from "../schema";
import { MCPToolProvider } from "../registry";

export interface FilesystemToolConfig {
  workingDirectory?: string;
  allowedExtensions?: string[];
}

export class FilesystemTool implements MCPToolProvider {
  name = "filesystem";
  description = "Read, write, and manage files and directories";

  private workingDirectory: string;
  private allowedExtensions: string[];

  constructor(config: FilesystemToolConfig = {}) {
    this.workingDirectory = config.workingDirectory || process.cwd();
    this.allowedExtensions = config.allowedExtensions || [
      ".txt",
      ".md",
      ".json",
      ".yml",
      ".yaml",
      ".js",
      ".ts",
      ".csv",
    ];
  }

  getSchema(): MCPTool {
    return {
      name: "filesystem",
      description: this.description,
      parameters: {
        type: "object",
        properties: {
          operation: {
            type: "string",
            enum: ["read", "write", "list", "exists", "delete"],
            description: "Operation to perform",
          },
          path: {
            type: "string",
            description: "File or directory path",
          },
          content: {
            type: "string",
            description: "Content to write (for write operation)",
          },
        },
        required: ["operation", "path"],
      },
      executor: "filesystem",
    };
  }

  async execute(params: {
    operation: "read" | "write" | "list" | "exists" | "delete";
    path: string;
    content?: string;
  }): Promise<MCPToolResult> {
    const startTime = Date.now();

    try {
      // Security: Resolve and validate path
      const resolvedPath = path.resolve(this.workingDirectory, params.path);

      if (!resolvedPath.startsWith(this.workingDirectory)) {
        throw new Error("Path outside working directory");
      }

      const ext = path.extname(resolvedPath);
      if (
        params.operation !== "list" &&
        ext &&
        !this.allowedExtensions.includes(ext)
      ) {
        throw new Error(`File extension ${ext} not allowed`);
      }

      let result: any;

      switch (params.operation) {
        case "read":
          const content = await fs.readFile(resolvedPath, "utf-8");
          const readStats = await fs.stat(resolvedPath);
          result = {
            content: content,
            path: params.path,
            absolutePath: resolvedPath,
            size: readStats.size,
            modified: readStats.mtime
          };
          break;

        case "write":
          if (params.content === undefined) {
            throw new Error("Content required for write operation");
          }
          // Create directory if it doesn't exist
          const dir = path.dirname(resolvedPath);
          await fs.mkdir(dir, { recursive: true });
          await fs.writeFile(resolvedPath, params.content, "utf-8");
          const stats = await fs.stat(resolvedPath);
          result = { 
            written: true, 
            path: params.path, 
            absolutePath: resolvedPath,
            bytes: stats.size 
          };
          break;

        case "list":
          const entries = await fs.readdir(resolvedPath, {
            withFileTypes: true,
          });
          result = entries.map((e) => ({
            name: e.name,
            type: e.isDirectory() ? "directory" : "file",
          }));
          break;

        case "exists":
          try {
            await fs.access(resolvedPath);
            result = { exists: true };
          } catch {
            result = { exists: false };
          }
          break;

        case "delete":
          await fs.unlink(resolvedPath);
          result = { deleted: true, path: resolvedPath };
          break;
      }

      return {
        success: true,
        result,
        executionTime: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        executionTime: Date.now() - startTime,
      };
    }
  }
}

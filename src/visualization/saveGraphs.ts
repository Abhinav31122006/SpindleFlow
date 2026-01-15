import fs from "fs";
import path from "path";

export function saveGraph(
  baseOutputDir: string,
  fileName: string,
  content: string
) {
  const graphsDir = path.join(baseOutputDir, "graphs");

  // ensure output/graphs exists
  fs.mkdirSync(graphsDir, { recursive: true });

  const filePath = path.join(graphsDir, fileName);
  fs.writeFileSync(filePath, content, "utf-8");

  return filePath;
}
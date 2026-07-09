import fg from "fast-glob";

import type { ResolvedAnalyzeOptions } from "./types.js";

export async function scanFiles(options: ResolvedAnalyzeOptions): Promise<string[]> {
  return fg(options.include, {
    cwd: options.cwd,
    absolute: true,
    onlyFiles: true,
    dot: false,
    ignore: options.exclude,
  });
}

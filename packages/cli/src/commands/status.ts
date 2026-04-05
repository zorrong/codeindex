/**
 * `codeindex status` — show index health và stats.
 */

import type { Command } from "commander"
import * as path from "path"
import { type CodeIndexConfig, loadConfig } from "../config.js"
import { createLLMClient, createIndexManager } from "../createServices.js"

export function registerStatusCommand(program: Command): void {
  program
    .command("status [path]")
    .description("Show index health và stats")
    .option("--index-dir <dir>", "Index directory")
    .option("--json", "Output as JSON")
    .action(async (targetPath: string | undefined, options: Record<string, string | boolean>) => {
      const projectRoot = path.resolve(targetPath ?? ".")

      const overrides: Partial<CodeIndexConfig> = {}
      if (options["indexDir"]) overrides.indexDir = options["indexDir"] as string

      const config = loadConfig(projectRoot, overrides)


      try {
        const llm = createLLMClient(config)
        const manager = createIndexManager(projectRoot, config, llm)
        const status = await manager.status()

        if (options["json"] === true) {
          console.log(JSON.stringify(status, null, 2))
          return
        }

        if (!status.exists) {
          console.log("❌ No index found")
          console.log(`   Run: codeindex index ${projectRoot}`)
          return
        }

        const builtAtStr = status.builtAt
          ? new Date(status.builtAt).toLocaleString()
          : "unknown"

        console.log(`📊 Index Status: ${projectRoot}`)
        console.log(`   Status    : ${status.isStale ? "⚠️  Stale" : "✅ Up to date"}`)
        console.log(`   Built at  : ${builtAtStr}`)
        console.log(`   Files     : ${status.totalFiles}`)
        console.log(`   Symbols   : ${status.totalSymbols}`)

        if (status.staleFiles.length > 0) {
          console.log(`\n⚠️  Stale files (${status.staleFiles.length}):`)
          for (const f of status.staleFiles.slice(0, 10)) {
            console.log(`   - ${f}`)
          }
          if (status.staleFiles.length > 10) {
            console.log(`   ... and ${status.staleFiles.length - 10} more`)
          }
          console.log(`\n   Run: codeindex update`)
        }
      } catch (err) {
        console.error(`\n❌ Status check failed: ${(err as Error).message}`)
        process.exit(1)
      }
    })
}

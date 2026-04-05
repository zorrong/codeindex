/**
 * `codeindex serve` — start local HTTP server cho IDE integration.
 */

import type { Command } from "commander"
import * as path from "path"
import { type CodeIndexConfig, loadConfig, resolveApiKey } from "../config.js"
import { createLLMClient } from "../createServices.js"
import { HttpServer } from "../server/HttpServer.js"

export function registerServeCommand(program: Command): void {
  program
    .command("serve [path]")
    .description("Start local HTTP server cho IDE integration (default: port 3131)")
    .option("--port <n>", "Port number", "3131")
    .option("--index-dir <dir>", "Index directory")
    .option("-v, --verbose", "Verbose output")
    .action(async (targetPath: string | undefined, options: Record<string, string | boolean>) => {
      const projectRoot = path.resolve(targetPath ?? ".")
      const port = parseInt(options["port"] as string ?? "3131")

      const overrides: Partial<CodeIndexConfig> = {}
      if (options["indexDir"]) overrides.indexDir = options["indexDir"] as string
      if (options["verbose"]) overrides.verbose = options["verbose"] as boolean

      const config = loadConfig(projectRoot, overrides)


      let apiKey: string
      try {
        apiKey = resolveApiKey(config)
      } catch (err) {
        console.error(`Error: ${(err as Error).message}`)
        process.exit(1)
      }

      const llmClient = createLLMClient({ ...config, apiKey })

      const server = new HttpServer({
        port,
        projectRoot,
        config,
        llmClient,
      })

      try {
        await server.start()
        console.log(`🚀 codeindex server running at http://localhost:${port}`)
        console.log(`   Project: ${projectRoot}`)
        console.log(`   Index  : ${config.indexDir}/`)
        console.log("")
        console.log("Endpoints:")
        console.log(`   POST http://localhost:${port}/query   — query index`)
        console.log(`   GET  http://localhost:${port}/status  — index status`)
        console.log(`   POST http://localhost:${port}/update  — trigger update`)
        console.log(`   GET  http://localhost:${port}/health  — health check`)
        console.log("")
        console.log("Press Ctrl+C to stop")

        // Graceful shutdown
        process.on("SIGINT", async () => {
          console.log("\nStopping server...")
          await server.stop()
          process.exit(0)
        })
        process.on("SIGTERM", async () => {
          await server.stop()
          process.exit(0)
        })
      } catch (err) {
        console.error(`❌ Failed to start server: ${(err as Error).message}`)
        process.exit(1)
      }
    })
}
